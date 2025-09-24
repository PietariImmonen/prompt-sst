# Authentication Foundation

- ID: 01-auth-foundation
- Owner: TBA
- Priority: P0
- Target Release: MVP

## Context Snapshot

- Establishes the baseline sign-in experience described in `agents/context.md` for both web and desktop shells.
- Targets account owners who need a frictionless Google OAuth login before creating or joining workspaces.
- Builds on the OpenAuth issuer deployed by SST and ensures tokens flow correctly through Hono middleware and Replicache clients.

## Goals & Non-Goals

- **Goals**
  - Verify Google OpenAuth issuer stands up with SST resources and hands back signed JWTs.
  - Deliver localized login/register pages under `packages/app/src/routes/auth/**` with toast-driven error handling.
  - Persist authenticated state inside the Replicache provider (`auth.current`) so workspace bootstrap and API calls have bearer tokens.
- **Non-Goals**
  - Adding additional providers (password, magic code) or SCIM/SSO integrations.
  - Desktop-specific secure storage (tracked separately in "Auth Hardening").

## Dependencies & Risks

- Requires Google OAuth credentials surfaced via SST secrets (`Resource.GoogleClientID`, `Resource.GoogleClientSecret`).
- Desktop build inherits the same issuer configuration; ensure deep links and redirect URIs are registered for each platform.
- Any drift between `packages/core` actor models and Hono middleware will break downstream APIs.

## Implementation Blueprint

- **Issuer**: Configure `packages/functions/src/auth/auth.ts` with stage-aware OpenAuth providers and success redirect handlers.
- **Middleware**: Ensure `packages/functions/src/api/auth.ts` parses bearer tokens, materialises `account` and `user` actors, and attaches workspace headers when present.
- **Client**: Implement login/register screens using Shadcn primitives in `packages/app/src/routes/auth/<view>/components/**`. Surface errors via `react-hot-toast` and maintain page titles with `usePageTitle`.
- **State**: Extend `packages/app/src/hooks/use-auth` (and backing providers) to refresh tokens, store current account/workspace context, and expose helpers consumed by `WorkspaceLayout`.
- **Docs**: Capture the auth flow and environment variable requirements in `AGENTS.md` or `agents/context.md` as they evolve.

## Strict TODO Checklist

- [ ] Confirm OpenAuth issuer env vars exist for the target stage and document how to rotate them.
- [ ] Verify Hono auth middleware returns `401` for missing/invalid tokens and sets `ActorContext` correctly for `account` and `user` actors.
- [ ] Build localized login/register forms in `packages/app/src/routes/auth/**` with accessibility and error states covered.
- [ ] Ensure `useAuth` exposes `current.token`, `refresh`, and workspace switching helpers consumed by the workspace creation flow.
- [ ] Exercise the flow end-to-end in both web (`bun run --filter app dev`) and desktop (`bun run --filter @prompt-saver/desktop dev`) shells.
- [ ] Update agent docs if auth routes, issuer domains, or required headers change.

## Test & QA Plan

- Manual: validate Google OAuth redirects locally (with `sst dev`) and confirm tokens are stored/cleared when logging in/out on web and desktop.
- Automated: plan contract tests under `packages/functions/src/__tests__/` to assert auth middleware behaviour; add unit coverage for auth hooks if logic grows.
- Required checks before PR: `bun run --filter app lint`, `bun run typecheck`, and relevant package builds (`bun run --filter @prompt-saver/desktop typecheck`).

## Open Questions

- Should we add fallback copy or feature flags when Google credentials are absent in local development?
- Do we need telemetry around failed login attempts for analytics dashboards?
- How will workspace slug selection behave for accounts with no active workspaces (post-auth)?
