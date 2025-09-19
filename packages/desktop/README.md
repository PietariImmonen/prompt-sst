# Prompt Desktop

Electron client for the Prompt SST stack. The renderer is a custom React app that signs in through the same OpenAuth issuer as the web client, consumes the Hono API, and syncs data via Replicache. Only shared pieces are backend-facing: domain models from `@sst-replicache-template/core`, API types from `@sst-replicache-template/functions`, and the MQTT poke channel.

## Getting Started

1. **Install dependencies** (from the monorepo root):
   ```bash
   bun install
   ```
2. **Start SST + services** in one terminal:
   ```bash
   bun run dev
   ```
3. **Launch Electron** in another terminal:
   ```bash
   bun run --filter @sst-replicache-template/desktop dev
   ```
   The renderer runs on the Vite dev server used by `electron-vite`; OAuth redirects back into that window.

Create `packages/desktop/.env` with the same values used by the web app:
```ini
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:13557
VITE_STAGE=dev
VITE_REALTIME_ENDPOINT=localhost:13558
VITE_AUTHORIZER=local-authorizer
VITE_AUTH_URL=https://your-auth.example.com
```

## Scripts

| Command | Description |
| --- | --- |
| `bun run --filter @sst-replicache-template/desktop dev` | Start Electron + Vite with HMR |
| `bun run --filter @sst-replicache-template/desktop build` | Type-check and bundle main/preload/renderer |
| `bun run --filter @sst-replicache-template/desktop build:mac` | Build macOS distributable (see also `build:win` / `build:linux`) |
| `bun run --filter @sst-replicache-template/desktop lint` | Run ESLint over main + renderer |
| `bun run --filter @sst-replicache-template/desktop typecheck` | Type-check Node (main/preload) and renderer projects |

## Architecture Notes

- **Auth**: `AuthProvider` stores session tokens in `localStorage` and calls `@openauthjs/openauth` to open the OAuth flow. After redirect the provider hydrates accounts via the Hono client.
- **Replicache**: `ReplicacheProvider` mirrors the web mutators/stores locally. `RealtimeProvider` subscribes to MQTT and pokes Replicache when backend changes land.
- **Workspace switching**: The dashboard renders the active workspace from Replicache and surfaces a selector sourced from the synced `/workspace/*` keys.
- **Styling**: Tailwind v4 with the `@tailwindcss/vite` plugin. UI primitives live under `src/renderer/src/components/ui` to keep the desktop design independent from the web package.

## Packaging

After running `bun run --filter @sst-replicache-template/desktop build`, use one of the `build:*` scripts to create platform installers. Artifacts are written to `packages/desktop/out/`.
