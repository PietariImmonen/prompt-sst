# Desktop Build Distribution
- ID: 06-desktop-build-distribution
- Owner: TBA
- Priority: P0
- Target Release: Next milestone

## Context Snapshot
- Extends the desktop surface from `agents/context.md` by moving beyond dev-only builds so SaaS founders can evaluate the Electron client without cloning the repo.
- Targets account owners and workspace members who prefer installing a native shell for prompt capture and sync while offline.
- Builds on prior desktop prompt features (`03-desktop-prompt-capture.md`) and existing electron-builder scaffolding under `packages/desktop`.

## Goals & Non-Goals
- **Goals**
  - Produce reproducible signed (or notarization-ready) build artifacts for macOS, Windows, and Linux using `bun run --filter @sst-replicache-template/desktop build:<platform>`.
  - Introduce versioning, metadata, and post-build verification scripts so QA can confirm the bundle launches and syncs against SST environments.
  - Publish documentation in `packages/desktop/README.md` detailing prerequisites, environment generation, and how to sideload the installer.
  - Ensure artifacts are uploaded to a predictable location (e.g., `out/make/` or staging S3 bucket) via CI-friendly scripts.
- **Non-Goals**
  - Implementing auto-update flows or in-app download prompts (handled later).
  - Obtaining production signing certificates; local developer certificates and unsigned builds are acceptable if notarization steps are documented.
  - Redesigning desktop UX beyond build hooks.

## Dependencies & Risks
- Requires platform-specific signing assets (Apple Developer cert, Windows code signing). Provide fallbacks/workarounds for unsigned testing.
- electron-builder configuration (`packages/desktop/electron-builder.yml`) must align with expected artifact formats (.dmg/.zip/.exe/.AppImage).
- Environment injection via `scripts/generate-desktop-env.mjs` must run before packaging; missing `.env.desktop` will break builds.
- CI runners need access to Bun and Electron prerequisites; GitHub Actions/macOS VM availability can be a bottleneck.

## Implementation Blueprint
- **Desktop Package (`packages/desktop`)**
  - Review and refine `electron-builder.yml` to define productName, appId, artifact naming, and publish targets (local directory + optional S3 provider).
  - Extend `package.json` scripts to wrap `env:generate`, `build:<platform>`, and artifact publishing (e.g., `build:mac:publish`).
  - Add TypeScript helpers in `src/main/version.ts` (or similar) to embed build metadata (version, commit SHA) surfaced in the app menu/about dialog.
  - Ensure build pipeline copies Replicache config/auth bindings via SST `bind` or environment file.
- **Docs & Tooling**
  - Update `packages/desktop/README.md` (and `SETUP.md`) with step-by-step install instructions, signing requirements, and troubleshooting for each OS.
  - Introduce a top-level feature doc snippet in `agents/context.md` or `AGENTS.md` if distribution impacts onboarding narrative.
  - Provide a verification script (e.g., `scripts/verify-desktop-build.mjs`) that launches the built app, checks for renderer load, and exits.
- **CI Integration**
  - Add build job (GitHub Actions) that runs matrix builds for macOS/Windows/Linux, utilizing cached Bun dependencies and uploading artifacts as workflow artifacts.
  - Guard the job behind tags or release branches to avoid lengthy builds on every commit.
  - Document environment secrets (signing certificates, Apple API keys) and add placeholders in CI config.

## Strict TODO Checklist
- [x] Audit and adjust `packages/desktop/electron-builder.yml` for accurate IDs, artifact names, and publish targets per platform.
- [x] Update `packages/desktop/package.json` scripts to wrap env generation, build, signing, and optional publishing commands.
- [ ] Implement build metadata injection (version/commit) and surface it in the desktop UI or About menu.
- [x] Refresh `packages/desktop/README.md` and related docs with distribution instructions and OS-specific signing guidance.
- [ ] Create automated verification script(s) ensuring packaged apps launch and reach readiness state.
- [ ] Configure CI pipeline to run desktop builds on demand and upload resulting installers/archives.
- [ ] Document required environment variables/secrets in `agents/context.md` or `AGENTS.md` if distribution requirements change architecture assumptions.
- [x] Run validation commands (`bun run --filter @sst-replicache-template/desktop typecheck`, `bun run --filter @sst-replicache-template/desktop build:<platform>`) and update docs with expected outputs.

## Test & QA Plan
- Manual smoke tests: install generated macOS `.dmg`/`.zip`, Windows `.exe`, and Linux `.AppImage`; verify launch, authentication, Replicache sync, and prompt capture flows.
- Automated checks: run verification script post-build in CI, capturing renderer console logs to ensure no fatal errors.
- Ensure `bun run --filter @sst-replicache-template/desktop typecheck` and `bun run --filter @sst-replicache-template/desktop lint` pass before publishing builds.
- Optional: add snapshot tests for build metadata display.

## Open Questions
- Do we require notarized macOS builds for internal distribution, or is unsigned download acceptable for this milestone?
- Should artifacts upload to an AWS S3 bucket managed by SST, or remain as GitHub workflow artifacts pending future automation?
- How will we version desktop releases relative to web deployments (semantic versioning, commit hash, or SST stage-based tags)?
