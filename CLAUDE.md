# Date Manager — Claude Context

Diese Datei gibt einer frischen Claude-Code-Session den nötigen Kontext.
Die ausführliche User-Doku liegt im README.md.

## Was die App ist

Private Date-Planungs-PWA für ein Paar (rick@mindsquare.de + Frau).
Erlaubt Ideen zu sammeln (per iOS-Kurzbefehl mit KI-Anreicherung),
Dates zu planen und via KI-Chat ein passendes Date für die Stimmung
auszuwählen.

## Aktueller Deployment-Status

- Läuft produktiv auf einem Heim-Server unter einer privaten Domain
- Reverse Proxy: **NPMplus** (TLS-Termination, kein OAuth — nur Forward)
- Container-Stack via **Portainer**, OIDC-Auth via **oauth2-proxy
  innerhalb des Stacks** (nicht in NPMplus)
- Auth-Provider: **Authentik** (Self-hosted)
- CI: `.github/workflows/build.yml` baut zwei GHCR-Images
  (`date-manager-backend` und `date-manager-frontend`) bei jedem Push auf `main`

## Design-Entscheidungen

- **Theme: Lavender Dusk** (dunkles Nachtviolett, Lavendel-Akzent).
  Farben in `frontend/tailwind.config.js`. Komponenten-Klassen in `frontend/src/index.css`.
- **AI-Provider Default: Claude** (`AI_PROVIDER=claude`).
  Provider-Interface in `backend/app/ai/base.py`. Weitere Provider:
  Gemini, Perplexity, OpenAI – alle hinter derselben Abstraktion.
- **Auth: Header-basiert.** Backend liest `X-Forwarded-Email` /
  `X-Forwarded-Preferred-Username` (Defaults für oauth2-proxy).
  Whitelist-Check über `ALLOWED_EMAILS` env var.
  Im Dev-Mode (`AUTH_DEV_MODE=true`) wird ein Fake-User verwendet.
- **iOS-Kurzbefehl** → POST an `/api/ideas/quick-add` mit Bearer-Token
  (`QUICK_ADD_TOKEN`). Endpoint ist im oauth2-proxy via
  `--skip-auth-route=^/api/ideas/quick-add$` von der OIDC-Auth ausgenommen.
- **Notifications**: Web Push (VAPID), Scheduler läuft täglich 08:00
  via APScheduler im Backend.
- **PWA**: vite-plugin-pwa, eigener service-worker in `frontend/src/service-worker.ts`.

## Tech-Stack-Zusammenfassung

- Backend: FastAPI + SQLAlchemy + SQLite + APScheduler + anthropic SDK
- Frontend: React 18 + Vite 6 + TypeScript + Tailwind 3 + react-router-dom
- Auth: oauth2-proxy (Containern) → Authentik OIDC
- Reverse Proxy: NPMplus
- Container-Orchestrierung: Docker Compose via Portainer

## Stolperfallen, die wir schon gelöst haben

- `--skip-auth-routes` (Plural) ist in neueren oauth2-proxy-Versionen
  entfernt. Immer **Singular**: `--skip-auth-route` verwenden.
- FastAPI mag `status_code=204` nicht mit Return-Type-Hint `None` —
  stattdessen `response_class=Response` und `Response(status_code=204)` returnen.
- Bottom-Sheet-Modals brauchen `z-[60]` (höher als die Bottom-Nav mit
  `z-50`), sonst landet die Sheet hinter der Navigation.
- `tsconfig.node.json` braucht `composite: true` + `emitDeclarationOnly: true`,
  damit der TS-Project-Reference-Build nicht meckert.
- Custom Service-Worker via `vite-plugin-pwa` braucht `strategies: "injectManifest"`
  **ohne** manuelles `swDest` (Plugin handhabt Output-Pfade selbst).
- Repository ist `joschkarick/couple-date-guide`. CI-Workflow bildet
  daraus automatisch `ghcr.io/joschkarick/date-manager-{backend,frontend}`
  (über `${{ github.repository_owner }}/date-manager` Prefix).

## Wichtige Befehle für die Entwicklung

```bash
# Backend lokal
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
AUTH_DEV_MODE=true DATABASE_PATH=./data/datemgr.db uvicorn app.main:app --reload

# Frontend lokal (proxied /api zum Backend)
cd frontend && npm install && npm run dev

# Frontend Build (zum Verifizieren)
cd frontend && npm run build

# Full local stack
cp .env.example .env  # ANTHROPIC_API_KEY setzen
docker compose up --build
```

## Mobile-First

Der User entwickelt überwiegend vom **Handy aus**. Beim Vorschlagen von
Lösungen mit Bedacht auf "kann ich das vom Handy?":
- Lange Shell-Commands schwer
- GitHub Codespaces & Web-UI gut nutzbar
- Lokale Tests im Sandbox-Container, dann Screenshots / HTML-Mocks
  bevorzugt zum Vorzeigen
