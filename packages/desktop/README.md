# Prompt Desktop

Electron client for the Prompt SST stack. The renderer is a custom React app that signs in through the same OpenAuth issuer as the web client, consumes the Hono API, and syncs data via Replicache. Only shared pieces are backend-facing: domain models from `@sst-replicache-template/core`, API types from `@sst-replicache-template/functions`, and the MQTT poke channel.

## Getting Started

1. **Install dependencies** (from the monorepo root):
   ```bash
   bun install
   ```
2. **Start SST + services** in one terminal (required for real endpoints):
   ```bash
   bun run dev
   ```
3. **Generate desktop environment variables** so the renderer points at the
   correct Authorizer/API endpoints. This script reads `sst outputs` for the
   active stage (defaults to `dev`) and writes to `.env` (development).
   ```bash
   bun run --filter @sst-replicache-template/desktop env:generate
   ```
   To package against a different stage, set `SST_STAGE` (or pass `--stage`).
   ```bash
   SST_STAGE=production bun run --filter @sst-replicache-template/desktop env:generate
   # or
   bun run --filter @sst-replicache-template/desktop env:generate -- --stage production
   ```
   Use `--mode production` to populate `.env.production`, which the build step
   consumes automatically:
   ```bash
   bun run --filter @sst-replicache-template/desktop env:generate -- --stage production --mode production
   ```
   When the requested stage is unreachable (e.g., no AWS credentials), the script
   keeps existing `.env`/`.env.production` files so manual values are not lost.
4. **Launch Electron** in another terminal:
   ```bash
   bun run --filter @sst-replicache-template/desktop dev
   ```
   The renderer runs on the Vite dev server used by `electron-vite`; OAuth opens in your default browser and returns to the desktop app through a secure loopback callback on `127.0.0.1`.
   > **Google OAuth:** add `http://127.0.0.1` to the Authorized redirect URIs for your "Desktop" client in Google Cloud. Dynamic loopback ports are supported and the callback path is fixed to `/`.
   The generated `.env` is refreshed automatically whenever you run the build scripts.

## Scripts

| Command                                                       | Description                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------- |
| `bun run --filter @sst-replicache-template/desktop dev`       | Start Electron + Vite with HMR                                   |
| `bun run --filter @sst-replicache-template/desktop build`     | Generate `.env`, type-check, and bundle main/preload/renderer    |
| `bun run --filter @sst-replicache-template/desktop build:mac` | Build macOS distributable (see also `build:win` / `build:linux`) |
| `bun run --filter @sst-replicache-template/desktop lint`      | Run ESLint over main + renderer                                  |
| `bun run --filter @sst-replicache-template/desktop typecheck` | Type-check Node (main/preload) and renderer projects             |

## Architecture Notes

- **Auth**: `AuthProvider` stores session tokens in `localStorage` and drives the OAuth flow via the `@openauthjs/openauth` client. A loopback HTTP server spins up on `127.0.0.1` for each sign-in, and the main + preload layers relay the returned tokens back to the renderer before hydrating accounts via the Hono client.
- **Replicache**: `ReplicacheProvider` mirrors the web mutators/stores locally. `RealtimeProvider` subscribes to MQTT and pokes Replicache when backend changes land.
- **Workspace switching**: The dashboard renders the active workspace from Replicache and surfaces a selector sourced from the synced `/workspace/*` keys.
- **Styling**: Tailwind v4 with the `@tailwindcss/vite` plugin. UI primitives live under `src/renderer/src/components/ui` to keep the desktop design independent from the web package.

## Packaging

After running `bun run --filter @sst-replicache-template/desktop build`, use one of the `build:*` scripts to create platform installers. The build command regenerates `.env.production` for the `production` stage when outputs are available, or reuses the existing file if it cannot reach SST. Adjust `SST_STAGE`, `--stage`, or the `DESKTOP_*` overrides before building if you need different hosted endpoints. Artifacts are written to `packages/desktop/out/` with names like `prompt-sst-desktop-<version>-<os>-<arch>.<ext>`.
