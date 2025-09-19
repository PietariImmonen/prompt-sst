# Prompt Capture Reliability
- ID: 05-prompt-capture-reliability
- Owner: TBA
- Priority: P0
- Target Release: Sprint 2

## Context Snapshot
- Desktop users rely on the global capture shortcut to save research snippets without switching apps; current implementation sometimes pauses when the Electron renderer loses focus.
- Founders and workspace members (per `agents/context.md`) need trust that every highlight makes it into Replicache for later review inside the prompts view.
- Builds on `03-desktop-prompt-capture.md` and recent table UX work (`04-prompt-data-table.md`); no new mocks yet, but the Linear-inspired surface should remain consistent.

## Goals & Non-Goals
- **Goals**
  - Ensure the capture loop runs whenever the desktop user is authenticated, independent of which internal tab or route is active.
  - Capture highlighted text when available; otherwise fall back to the clipboard contents and annotate the source window metadata.
  - Surface capture health (success, retrying, offline) via unobtrusive toasts or status indicator in the desktop shell.
  - Harden Replicache mutations so duplicate submissions, race conditions, or empty payloads are ignored gracefully.
- **Non-Goals**
  - No new capture triggers beyond the existing keyboard shortcut.
  - No edits to the web client capture extension in this iteration.
  - Analytics instrumentation and long-term audit trails remain out of scope.

## Dependencies & Risks
- Requires reliable access to Electron APIs for global shortcuts, clipboard, and focused window titles; macOS privacy permissions may block selection access.
- Replicache mutators must handle idempotency to avoid double-writing when retries occur.
- Persisting highlighted text might vary per OS/application; fallback logic must avoid blocking captures.
- Risk that continuous background polling increases CPU usage; mitigated via event-driven listeners and debounced retries.

## Implementation Blueprint
- Desktop main process (`packages/desktop/src/main/`) to maintain a singleton capture service that registers once after login and survives route changes.
- Renderer hook under `packages/desktop/src/renderer/src/hooks/use-prompt-capture.tsx` to listen for auth/session changes and notify the main process via IPC when the user signs in or out.
- Extend preload bridge (`packages/desktop/src/preload/`) to expose capture status events to the renderer for toasts/badges.
- Update `packages/desktop/src/renderer/src/data/mutators.tsx` and `prompt-store.tsx` to accept optional `selection` metadata and ignore empty payloads.
- Add utilities in `packages/desktop/src/renderer/src/lib/capture.ts` for extracting highlighted text: attempt `navigator.clipboard.readText()` with selection permission, fallback to existing clipboard scrape, and include window title/url when provided by main process.
- If backend schema updates are required (e.g., storing selection/source fields), modify `packages/core/src/domain/prompt`, run migrations, and adjust Replicache pull (`packages/functions/src/api/replicache.ts`).

## Strict TODO Checklist
- [ ] Update `agents/context.md` if capture becomes a marquee workflow that shifts product positioning.
- [x] Ensure Electron main process has a dedicated `capture-service.ts` responsible for registering/unregistering global shortcuts and delivering payloads over IPC.
- [x] Refactor renderer `usePromptCapture` hook to subscribe once per session, re-establishing listeners on auth changes instead of per-route mounts.
- [x] Capture selection text where possible; include clipboard fallback with debounced retries when clipboard access is denied.
- [x] Enrich prompt payloads with source metadata (app name, window title, timestamp) before invoking Replicache mutator.
- [x] Guard mutators against empty content, duplicates, and ensure optimistic updates reconcile when offline.
- [x] Show capture result toast/status indicator using existing Shadcn `sonner` or badge component.
- [ ] Document manual verification steps in the feature file after implementation.

## Test & QA Plan
- Manual: verify captures while switching between desktop tabs (Dashboard, Prompts, Settings), while the renderer window is backgrounded, and when clipboard permissions are denied.
- Manual: check highlighted text capture in common apps (browser, email, notes) on macOS and Windows; verify fallback when selection API is unavailable.
- Automated: add unit tests around new utilities (e.g., selection extractor) with Vitest/Bun mocks; consider integration test for IPC bridge using Electron testing harness if feasible.
- Pre-flight commands: `bun run --filter @sst-replicache-template/desktop typecheck`, `bun run --filter @sst-replicache-template/desktop lint`, and smoke run via `bun run --filter @sst-replicache-template/desktop dev`.

## Open Questions
- Do we need to store the originating URL/app metadata with prompts, and if so, how should it surface in UI?
- Should captures queue locally when offline and replay once Replicache reconnects, or is default Replicache buffering sufficient?
- Are there OS-specific permissions (e.g., macOS Screen Recording) we must request proactively for highlighted selection access?
