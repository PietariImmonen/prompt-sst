# Auth Hardening Enhancements
- ID: 02-auth-hardening
- Owner: TBA
- Priority: P1
- Target Release: Post-MVP

## Context Snapshot
- Extends `01-auth-foundation` by addressing security and operator requests enumerated in `agents/context.md`.
- Targets enterprise customers that expect explicit environment controls, OS-level credential storage, and auditable login events.
- Supports future compliance initiatives (SOC2/GDPR) that require deterministic token handling and rotation strategies.

## Goals & Non-Goals
- **Goals**
  - Provide stage-aware issuer configuration (dev/staging/prod) selectable at build time or via settings.
  - Store refresh tokens and session secrets in secure platform storage (`keytar`/Keychain/Credential Locker) rather than local storage.
  - Emit structured auth lifecycle events to the SST bus for monitoring and alerting.
- **Non-Goals**
  - Adding new identity providers (magic link/password) — tracked as separate features.
  - Replacing OpenAuth with a different IdP.
  - Implementing full IAM/role management beyond current admin/member roles.

## Dependencies & Risks
- Requires evaluation of secure storage libraries across macOS, Windows, and Linux for the desktop shell.
- Token handoff between Electron main/preload/renderer must remain type-safe; misuse can deadlock Replicache mutations.
- Stage switching must not leak production credentials into developer builds.

## Implementation Blueprint
- **Configuration**: Extend issuer config in `packages/functions/src/auth/auth.ts` to read stage-specific secrets (SST `Resource` outputs + parameter store) and surface expected environment variables in `AGENTS.md`.
- **Secure Storage**: Add a desktop-side abstraction (e.g., `packages/desktop/src/main/security/session-store.ts`) using `keytar`, expose methods through preload, and update `useAuth` hooks to call into it.
- **Web Strategy**: For the web client, fall back to HTTP-only cookies or IndexedDB via Replicache storage with explicit expiry handling.
- **Observability**: Publish login/log-out events to `Resource.Bus` within `packages/functions/src/auth/auth.ts` success handlers so downstream analytics can subscribe.
- **Settings Surface**: Optionally expose environment selection and debug info under `packages/app/src/routes/settings` gated behind an internal flag.

## Strict TODO Checklist
- [ ] Catalog per-platform storage capabilities and decide on packages (e.g., `keytar` for desktop, cookies for web).
- [ ] Update desktop preload bridge to store/retrieve tokens through secure storage APIs.
- [ ] Document new environment variables/flags required for issuer selection and update onboarding docs.
- [ ] Add structured auth events (`auth.login`, `auth.logout`, `auth.refresh_failed`) to the SST event bus.
- [ ] Verify Replicache mutators still receive fresh tokens after refresh cycles.
- [ ] Record verification steps for each platform and include fallback logic when secure storage is unavailable.

## Test & QA Plan
- Manual: exercise login/logout/refresh on macOS, Windows, Linux desktop builds plus major browsers. Confirm tokens persist in secure storage and are cleared on logout.
- Automated: add integration coverage for issuer stage switching and event publication (`packages/functions/src/__tests__/auth.test.ts` placeholder). Consider smoke tests for the preload bridge.
- Required checks before PR: `bun run --filter app lint`, `bun run typecheck`, `bun run --filter @sst-replicache-template/desktop typecheck`, and relevant package builds.

## Open Questions
- Should environment selection remain hidden behind feature flags or developer settings in production builds?
- Do we need to surface login attempt metrics to the product analytics pipeline?
- How will we recover if secure token storage fails (fallback strategy, warning UI)?
