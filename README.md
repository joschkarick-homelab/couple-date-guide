# Date Manager 💜

Private Date-Planungs-PWA für ein Paar. Sammelt Ideen, plant Dates,
hilft via KI-Dialog beim Auswählen.

## Features

- **Date-Planung**: Termine mit Push-Notification am Morgen
- **Ideen-Sammlung**: Eingabe per iOS-Kurzbefehl, automatische KI-Anreicherung
  (Outfit, Essen, Musik, Aktivität, Ort, Foto, Tags, Zusammenfassung)
- **Ideen-Übersicht**: Tile-Layout mit Filtern und CRUD
- **Date Finder**: KI-Chat, der passend zur Stimmung ein Date aus den Ideen vorschlägt
- **Profil / Kontext**: Persistente Präferenzen, die der KI als Kontext mitgegeben werden
- **AI Provider austauschbar** per ENV: Claude (Default), Gemini, Perplexity, OpenAI
- **PWA**: iOS-Installierbar mit Web Push (ab iOS 16.4)
- **Auth via oauth2-proxy** (Authentik im Hintergrund)

## Stack

- Backend: FastAPI + SQLite + APScheduler (für tägliche Notifications)
- Frontend: React + Vite + TypeScript + Tailwind (Theme: Lavender Dusk)
- Auth: oauth2-proxy reverse-proxy davor; Backend liest `X-Forwarded-Email`-Header
- AI: Anthropic SDK (Claude), Gemini/Perplexity/OpenAI via REST

## Quick Start (lokal)

```bash
cp .env.example .env
# .env editieren: mindestens ANTHROPIC_API_KEY setzen (oder anderen Provider)

docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/api/health
```

Im Dev-Modus ist `AUTH_DEV_MODE=true` — die App akzeptiert einen Fake-User
und du brauchst kein oauth2-proxy davor.

## Production Deployment

### 1. Repo-Setup auf GitHub

GitHub Actions in `.github/workflows/build.yml` baut bei Push auf `main`
zwei Images und pusht sie nach `ghcr.io/<owner>/date-manager-{backend,frontend}`.

Stelle sicher, dass dein Repo das Token für `packages: write` hat (standardmäßig
über `GITHUB_TOKEN`).

### 2. Auf dem Server

```bash
# Verzeichnis anlegen
mkdir -p /opt/datemgr && cd /opt/datemgr

# docker-compose.prod.yml + .env auf den Server kopieren
scp docker-compose.prod.yml .env user@server:/opt/datemgr/

# Stack starten
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 3. Reverse Proxy + Authentik

Vor die App gehört ein oauth2-proxy (oder Authentik-Outpost), der die Auth
abnimmt und die User-Info als Header weitergibt:

```
Nginx Proxy Manager (TLS)
      ↓
oauth2-proxy (OIDC gegen Authentik)
      ↓
frontend (Port 3000)
      ↓
backend (Port 8000)
```

Minimaler oauth2-proxy-Block (in dein Stack hinzu):

```yaml
oauth2-proxy:
  image: quay.io/oauth2-proxy/oauth2-proxy:latest
  command:
    - --provider=oidc
    - --oidc-issuer-url=https://authentik.example.com/application/o/datemgr/
    - --client-id=<authentik-client-id>
    - --client-secret=<authentik-client-secret>
    - --cookie-secret=<32-byte-random>
    - --redirect-url=https://date.example.com/oauth2/callback
    - --email-domain=*
    - --pass-access-token=true
    - --set-xauthrequest=true
    - --upstream=http://frontend:80
    - --http-address=0.0.0.0:4180
  ports:
    - "4180:4180"
```

Stelle in Authentik einen OAuth2/OIDC-Provider + Application "datemgr"
ein, und whiteliste dein Konto + das deiner Frau via `ALLOWED_EMAILS`.

## Konfiguration (Auszug)

Siehe `.env.example` für alle Optionen.

| Var | Bedeutung |
|---|---|
| `AI_PROVIDER` | `claude` (default), `gemini`, `perplexity`, `openai` |
| `ANTHROPIC_API_KEY` | API-Key für den Default-Provider |
| `ALLOWED_EMAILS` | Komma-separierte E-Mail-Whitelist |
| `QUICK_ADD_TOKEN` | Bearer-Token für den iOS-Kurzbefehl-Endpoint |
| `UNSPLASH_ACCESS_KEY` | optional, für Stock-Bilder zu Ideen |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | für Web-Push-Notifications |

## iOS-Kurzbefehl einrichten

Im iPhone-Kurzbefehle-App:

1. Neuen Kurzbefehl anlegen, Aktion **"Frage nach Eingabe"** (Text)
2. Aktion **"URL"** → `https://date.example.com/api/ideas/quick-add`
3. Aktion **"Inhalt der URL abrufen"**:
   - Methode: `POST`
   - Header: `Authorization: Bearer <QUICK_ADD_TOKEN>`,
     `Content-Type: application/json`
   - Body (JSON): `{ "raw_input": <Eingabe von oben> }`
4. Per Sprachbefehl / Share-Sheet / Homescreen-Button aufrufbar machen

> Der Endpoint ist *nicht* hinter oauth2-proxy! Stelle sicher, dass dein
> Reverse Proxy `/api/ideas/quick-add` direkt zum Backend durchreicht und
> oauth2-proxy davor übergeht — oder hoste den Quick-Add-Endpoint unter
> einer separaten Domain (`quick.date.example.com`) ohne Auth-Proxy.

## VAPID-Keys generieren

Einmalig auf einer Maschine mit Node:

```bash
npx web-push generate-vapid-keys
```

Werte in `.env` eintragen.

## Lokale Entwicklung ohne Docker

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
AUTH_DEV_MODE=true DATABASE_PATH=./data/datemgr.db uvicorn app.main:app --reload

# Frontend (anderes Terminal)
cd frontend
npm install
npm run dev
# http://localhost:5173 (proxied /api zu localhost:8000)
```

## Theme

**Lavender Dusk** — verträumtes Nachtviolett mit Lavendel-Akzenten.
Farben in `tailwind.config.js` definiert.

```
bg          #1e1a2e
surface     #2a2440
primary     #b794d4
secondary   #f5b3c8
accent      #ffd6a5
```

## Architektur

```
┌─────────────────┐
│ iOS Kurzbefehl  │──POST /api/ideas/quick-add (Bearer Token)──┐
└─────────────────┘                                            ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Browser (PWA)  │ →  │  oauth2-proxy    │ →  │ Frontend (Nginx) │
└─────────────────┘    │  (Authentik OIDC)│    └──────┬───────────┘
                       └──────────────────┘           │  /api/*
                                                      ▼
                                              ┌───────────────┐
                                              │ Backend (Py)  │
                                              │  + SQLite     │
                                              │  + Scheduler  │
                                              └──────┬────────┘
                                                     │
                                              ┌──────▼──────┐
                                              │ AI Provider │
                                              │ (Claude…)   │
                                              └─────────────┘
```
