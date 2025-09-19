# Desktop Setup Guide

The desktop app shares infrastructure with the Prompt SST web client (OpenAuth, Hono APIs, Replicache, MQTT). Only the UI differs. Follow these steps to get a local environment running.

## 1. Prerequisites

- Node.js 20+
- Bun 1.1+
- macOS, Windows, or Linux
- AWS credentials configured for SST (same ones you use for the web app)

## 2. Environment Variables

Create `packages/desktop/.env` and copy the values you use for the web client:

```ini
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:13557
VITE_STAGE=dev
VITE_REALTIME_ENDPOINT=localhost:13558
VITE_AUTHORIZER=local-authorizer
VITE_AUTH_URL=https://your-auth.example.com
```

## 3. Install Dependencies

From the repository root run:

```bash
bun install
```

This hoists workspace dependencies (React, Replicache, MQTT, etc.) and native Electron binaries.

## 4. Start the Stack

1. Kick off SST + backend services:
   ```bash
   bun run dev
   ```
2. In another terminal launch Electron:
   ```bash
   bun run --filter @sst-replicache-template/desktop dev
   ```

The renderer opens in an Electron window. OAuth flows redirect to the same window; tokens are persisted in `localStorage` for future sessions.

## 5. Production Builds

```bash
bun run --filter @sst-replicache-template/desktop build
bun run --filter @sst-replicache-template/desktop build:mac   # or build:win / build:linux
```

- Renderer bundles land in `packages/desktop/dist`.
- Installers are emitted to `packages/desktop/out`.
- All `build:*` scripts run TypeScript checks before packaging.

## 6. Troubleshooting

- **Blank screen after login**: ensure the `.env` values match the SST dev service URLs and that `bun run dev` is still running.
- **OAuth window loops**: delete `localStorage` via the devtools console (`localStorage.clear()`) and restart the auth flow. Confirm `VITE_APP_URL` points to the Electron renderer origin (default `http://localhost:5173`).
- **Replicache not updating**: check the SST terminal for sync API errors, then verify `VITE_REALTIME_ENDPOINT` and `VITE_AUTHORIZER` match the values in your backend stage.
