# Desktop Setup Guide

The desktop app shares infrastructure with the Prompt SST web client (OpenAuth, Hono APIs, Replicache, MQTT). Only the UI differs. Follow these steps to get a local environment running.

## 1. Prerequisites

- Node.js 20+
- Bun 1.1+
- macOS, Windows, or Linux
- AWS credentials configured for SST (same ones you use for the web app)

## 2. Environment Variables

Generate `packages/desktop/.env` (development) from your SST stack so the desktop client hits the correct hosted endpoints when running locally:

```bash
bun run --filter @prompt-saver/desktop env:generate
```

The script calls `sst outputs` for the current stage (defaults to `dev`). To target another stage use `SST_STAGE` or the `--stage` flag:

```bash
SST_STAGE=production bun run --filter @prompt-saver/desktop env:generate
# or
bun run --filter @prompt-saver/desktop env:generate -- --stage production
```

Environment variables can be overridden ad-hoc with `DESKTOP_API_URL`, `DESKTOP_AUTH_URL`, etc. See `scripts/generate-desktop-env.mjs` for the full list. Pass `--mode production` to write `.env.production`, which the packaging step uses automatically. If the script cannot reach SST outputs it leaves the current files untouched so your manually defined values persist.

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
   bun run --filter @prompt-saver/desktop dev
   ```

The renderer opens in an Electron window. OAuth flows redirect to the same window; tokens are persisted in `localStorage` for future sessions.

## 5. Production Builds

```bash
# Builds always regenerate `.env.production` for the selected stage (default production)
bun run --filter @prompt-saver/desktop build
bun run --filter @prompt-saver/desktop build:mac   # or build:win / build:linux
```

- Renderer bundles land in `packages/desktop/dist`.
- Installers are emitted to `packages/desktop/out` with names like `clyo-desktop-<version>-<os>-<arch>.<ext>`.
- All `build:*` scripts regenerate `.env`, run TypeScript checks, and then package the Electron app.

## 6. Troubleshooting

- **Blank screen after login**: ensure the `.env` values match the SST service URLs for the stage you targeted and that `bun run dev` is still running if you rely on local services.
- **OAuth window loops**: delete `localStorage` via the devtools console (`localStorage.clear()`) and restart the auth flow. Confirm `VITE_APP_URL` points to the Electron renderer origin (default `http://localhost:5173`).
- **Replicache not updating**: check the SST terminal for sync API errors, then verify `VITE_REALTIME_ENDPOINT` and `VITE_AUTHORIZER` match the values in your backend stage.
