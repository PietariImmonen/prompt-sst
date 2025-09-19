# Repository Guidelines

## Project Structure & Module Organization
- `src/main` owns the Electron process lifecycle, IPC entry points, and packaging configuration.
- `src/preload` exposes a minimal, typed bridge (`window.electron` only); add new channels sparingly and document them.
- `src/renderer/src` is the desktop React app. Key folders:
  - `pages/` – screen-level components (auth, dashboard) that compose providers and layout.
  - `providers/` – desktop-specific wrappers for auth, Replicache, realtime MQTT, and theming.
  - `data/` – Replicache stores and mutators mirroring backend models from `@sst-replicache-template/core`.
  - `hooks/` – local hooks (auth, workspace, Replicache subscriptions).
  - `components/ui/` – Shadcn primitives copied into this workspace; customise here instead of importing from the web client.
- `resources/` keeps packaging assets; Electron Builder writes installers to `out/`.

## Build, Test, and Development Commands
- `bun install` from the repo root hoists dependencies (desktop relies on Bun workspaces).
- `bun run dev --filter @sst-replicache-template/desktop` launches the renderer + Electron alongside an SST dev session (`bun run dev`).
- `bun run build --filter @sst-replicache-template/desktop` performs TS checks and emits production bundles; append `build:mac|win|linux` for platform installers.
- `bun run lint --filter @sst-replicache-template/desktop` and `bun run typecheck --filter @sst-replicache-template/desktop` must pass before opening a PR.
- Required env vars (configure `packages/desktop/.env`): `VITE_APP_URL`, `VITE_API_URL`, `VITE_STAGE`, `VITE_REALTIME_ENDPOINT`, `VITE_AUTHORIZER`, `VITE_AUTH_URL`.

## Coding Style & Naming Conventions
- Stick to TypeScript, ES modules, and 2-space indentation; run Prettier via `bun run --filter @sst-replicache-template/desktop format` for bulk formatting.
- Compose UI from local Shadcn components; extend them within this workspace to keep the desktop design independent from the web client.
- Use `PascalCase` for components/providers, `camelCase` for hooks and helpers, and `kebab-case` for file names.
- Co-locate feature state in `data/` or `hooks/`; avoid Zustand/local storage patterns from the legacy Supabase build.

## Testing Guidelines
- Automated coverage is pending—document manual QA in PRs (login, workspace switching, Replicache sync, MQTT poke handling).
- When adding mutators, include a smoke section in the PR with the mutation name and verification steps.
- Consider lightweight unit tests with Bun once modules stabilise (e.g., pure helpers in `data/`).

## Commit & Pull Request Guidelines
- Use Conventional Commits with a `desktop` scope when touching this workspace (e.g., `feat(desktop): add replicache dashboard`).
- PR descriptions should call out:
  - Which providers/data stores changed
  - Required environment variables or migrations
  - Screenshots of the desktop UI when relevant
- Capture follow-up items (e.g., additional mutations, packaging tweaks) in the PR checklist or issue tracker.
