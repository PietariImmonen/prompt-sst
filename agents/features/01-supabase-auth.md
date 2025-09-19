# Supabase Authentication

- ID: 01-supabase-auth
- Owner: TBA
- Priority: P0
- Target Release: MVP

## Context Snapshot

- Delivers the P0 "User Authentication" capability described in `agents/context.md`, enabling secure access across sessions.
- Serves primary persona of multi-platform AI power users who expect seamless sign-in and persistence.
- Relates to automation-first principle by keeping login friction low while respecting security requirements.

## Goals & Non-Goals

- **Goals**
  - Implement Google and GitHub OAuth sign-in via Supabase in the Electron client.
  - Persist Supabase sessions across app restarts and expose auth state through a typed preload bridge.
  - Provide a Linear-inspired signin surface using Shadcn primitives that fits within the existing renderer architecture.
- **Non-Goals**
  - Password-based auth or additional providers.
  - Account settings, profile management, or role-based access.
  - Deep Supabase Row Level Security configuration beyond session handling.

## Dependencies & Risks

- Supabase project configured with Google and GitHub OAuth credentials (redirect URI points to `VITE_SUPABASE_REDIRECT_URL`).
- Session tokens persist via Supabase client storage; evaluate migration to secure keychain when secrets policy tightens.
- Network failures or Supabase downtime will block authentication; renderer surfaces friendly error states and retry hints.
- Any provider popup blocking or window focus issues inside Electron should be mitigated with PKCE flow tuning if observed.

## Implementation Blueprint

- **Renderer Structure**: `src/renderer/src/pages/auth/` contains `components/auth-layout/{auth-layout.tsx,index.tsx}` and `components/provider-button/{provider-button.tsx,index.tsx}` built with Shadcn `Card`, `Button`, and `Separator` for Linear-style visuals.
- **UI Behavior**: Provider buttons display Google and GitHub sign-in, show disabled/loading states, and raise inline alerts on failure while keeping component files under 300 lines.
- **State Management**: `src/renderer/src/store/auth.ts` now tracks user, session, loading, and error state via Zustand with persistence of core session data.
- **Services Layer**: `AuthService` in `src/renderer/src/services/auth/` delegates to the preload bridge, ensuring renderer never touches Supabase directly.
- **Preload Bridge**: `src/preload/index.ts` exposes a typed `auth` bridge backed by Supabase, validating payloads with Zod schemas defined in `src/shared/schemas/auth.ts`.
- **Session Persistence**: Supabase `onAuthStateChange` subscription in preload syncs session updates to the store, ensuring state restoration on boot.
- **Navigation**: `src/renderer/src/App.tsx` gates between the auth page and `src/renderer/src/pages/dashboard/` once a session is present.
- **Docs**: `AGENTS.md` and `agents/context.md` updated with auth architecture and folder structure expectations; follow-ups for secure storage tracked.

## Strict TODO Checklist

- [x] Update `agents/context.md` with finalized auth architecture and session handling notes.
- [x] Scaffold `src/renderer/src/pages/auth/` with `components/` subfolders (`auth-layout/`, `provider-button/`) using kebab-case files and `index.tsx` barrels.
- [x] Implement Google and GitHub sign-in UI with Shadcn primitives, keeping each component file under 300 lines.
- [x] Add Supabase auth service functions in `src/renderer/src/services/supabase/` with error handling and typings.
- [x] Extend `src/shared` with Zod schemas for auth IPC messages/responses and wire them through preload bridge.
- [x] Create or update `src/renderer/src/store/auth/` (Zustand) to manage session state, loading, and errors.
- [x] Persist Supabase session tokens securely and restore them on app boot (via Supabase client persistence and preload mapping).
- [x] Document manual QA steps for sign-in/out flows and provider fallbacks in the feature file.
- [x] Record follow-up TODOs for additional providers or settings under `agents/features/`.

## Test & QA Plan

- Manual: verified store initialization, preload bridge wiring, and error surfaces using mocked Supabase responses; provider redirects require live credentials to validate end-to-end.
- Automated (future): plan for integration tests using headless Supabase emulator or mocked auth responses once test harness exists.
- Always run `pnpm lint`, `pnpm typecheck`, and exercised flows via `pnpm dev` before opening PR.

## QA Notes

- `pnpm typecheck` passes for both node and web configs.
- Without live Supabase keys the OAuth redirect cannot be fully exercised; confirm callback handling once credentials are provisioned.
- Post-sign-out flow returns to the auth page and clears session/user state as expected.

## Open Questions

- Should we introduce environment switching for Supabase credentials (prod/staging) in the preload config? — Pending product decision.
- Do we need to upgrade session storage to OS keychain for GA? — Track in security hardening milestone.
- Should the auth view gain bespoke illustrations to further align with Linear’s look? — Design review required.
