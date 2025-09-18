# Auth Hardening Enhancements
- ID: 02-auth-hardening
- Owner: TBA
- Priority: P1
- Target Release: Post-MVP

## Context Snapshot
- Builds on `01-supabase-auth` by addressing security and configuration follow-ups noted in `agents/context.md` and the feature QA notes.
- Targets enterprise users who expect explicit environment controls and OS-level credential handling.
- Supports future compliance workstreams (SOC2/GDPR) that require stricter secret storage.

## Goals & Non-Goals
- **Goals**
  - Introduce environment switching between staging and production Supabase projects.
  - Migrate session persistence from local storage to OS keychain or encrypted store.
  - Align auth surfaces with updated brand expressions (illustrations, theming hooks).
- **Non-Goals**
  - Adding new identity providers (tracked separately).
  - Replacing Supabase Auth with a different IdP.

## Dependencies & Risks
- Requires keychain/secure storage package vetting per platform.
- Must coordinate with release engineering to provision dual Supabase projects and credentials.

## Implementation Blueprint
- Add environment selector exposed via preload config (`src/shared/config/supabase.ts`), toggled through app settings.
- Integrate secure storage (e.g., `keytar`) for refresh tokens and wire through preload bridge.
- Update `src/renderer/src/pages/auth/` visuals with new illustration component housed under `components/hero-illustration/`.

## Strict TODO Checklist
- [ ] Validate secure storage library support across macOS, Windows, and Linux.
- [ ] Extend preload `auth` bridge to read/write tokens via secure storage.
- [ ] Add UI surface for selecting Supabase environment and persisting preference.
- [ ] Refresh design assets to match revised Linear-inspired art direction.

## Test & QA Plan
- Manual passes for sign-in/out on each platform verifying token storage location.
- Regression on environment switching to ensure correct Supabase project targeted.

## Open Questions
- Should environment selection be limited to internal builds behind a feature flag?
- Do we require audit logs for auth events at this stage?
