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

Der Deploy ist vollständig automatisiert:

1. Push auf `main` (mit Änderungen in `backend/` oder `frontend/`)
   → `.github/workflows/build.yml` baut beide Images nach
     `ghcr.io/joschkarick-homelab/date-manager-{backend,frontend}:latest`.
2. Bei erfolgreichem Build (oder bei Änderungen an `docker-compose.prod.yml`)
   läuft `.github/workflows/deploy.yml`:
   - joined den Runner ephemer ins Tailscale-Netz (kein Port-Forward nötig)
   - rendert aus den GitHub-Secrets eine `stack.env`
   - kopiert sie zusammen mit `docker-compose.prod.yml` per SSH (über Tailscale) auf den LXC
   - macht `docker compose pull && up -d --remove-orphans`

### 1. LXC einmalig vorbereiten

```bash
# Docker + Compose v2 installieren (Debian/Ubuntu)
apt-get update && apt-get install -y docker.io docker-compose-plugin

# Deploy-User mit Docker-Rechten
adduser --disabled-password deploy
usermod -aG docker deploy

# SSH-Key fuer GitHub Actions hinterlegen
mkdir -p /home/deploy/.ssh
echo "<dein pub key>" >> /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh

# Ziel-Verzeichnis fuer den Stack
mkdir -p /opt/apps/couple-date-guide
chown deploy:deploy /opt/apps/couple-date-guide

# Tailscale installieren und joinen
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up   # einmal interaktiv den Auth-Link bestätigen
tailscale ip -4   # 100.x.y.z notieren — wird DEPLOY_HOST
```

> Die Images liegen public in GHCR — auf dem LXC ist *kein* `docker login`
> nötig.

### 2. Tailscale-Tag + OAuth-Client anlegen

In der Tailscale-Admin-Konsole:

1. **ACL** (`https://login.tailscale.com/admin/acls`) — `tag:ci` definieren
   und SSH-Zugriff auf den LXC erlauben, z.B.:
   ```hujson
   "tagOwners": { "tag:ci": ["autogroup:admin"] },
   "acls": [
     { "action": "accept", "src": ["tag:ci"], "dst": ["<lxc-tailscale-ip>:22"] }
   ]
   ```
2. **OAuth-Client** (`https://login.tailscale.com/admin/settings/oauth`):
   "Generate OAuth client" mit Scope `auth_keys` (write) und Tag `tag:ci`.
   Client-ID + Secret notieren — werden GitHub-Secrets.

### 3. GitHub Secrets pflegen

In `Settings → Secrets and variables → Actions → Repository secrets`:

**Tailscale + SSH-Deploy-Targets:**

| Secret | Beispielwert |
|---|---|
| `TS_OAUTH_CLIENT_ID` | aus Tailscale-OAuth-Client |
| `TS_OAUTH_SECRET` | aus Tailscale-OAuth-Client (`tskey-client-...`) |
| `DEPLOY_HOST` | Tailscale-IP (`100.x.y.z`) oder MagicDNS-Name |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Private SSH-Key (PEM) |
| `DEPLOY_PORT` | `22` (optional) |
| `DEPLOY_PATH` | `/opt/apps/couple-date-guide` |

**App-Konfiguration** (siehe `stack.env.example` für die Liste der Schlüssel):
`COOKIE_DOMAIN`, `OAUTH_REDIRECT_URL`, `HOST_PORT`,
`OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `COOKIE_SECRET`,
`ALLOWED_EMAILS`, `QUICK_ADD_TOKEN`,
`AI_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
optional: `PERPLEXITY_API_KEY`/`_MODEL`, `GEMINI_API_KEY`/`_MODEL`,
`OPENAI_API_KEY`/`_MODEL`, `UNSPLASH_ACCESS_KEY`,
`VAPID_PUBLIC_KEY`/`_PRIVATE_KEY`/`_SUBJECT`.

### 4. Ersten Deploy auslösen

```
GitHub → Actions → "Deploy to Homelab" → Run workflow → main
```

### 5. NPMplus-Proxy für die Domain einrichten

Ein einfacher Forward zum LXC:`HOST_PORT` (z.B. `4180`) genügt — die OIDC-Auth
übernimmt der oauth2-proxy im Stack, *nicht* NPMplus.

### Architektur dahinter

```
NPMplus (TLS-Termination)
      ↓
oauth2-proxy (OIDC gegen Authentik)   ← im docker-compose.prod.yml enthalten
      ↓
frontend (nginx, intern)
      ↓
backend (FastAPI, intern)
```

In Authentik einmalig einen OAuth2/OIDC-Provider + Application
"couple-date-guide" anlegen und die Whitelist via `ALLOWED_EMAILS`
pflegen.

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
