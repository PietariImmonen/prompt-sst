# Desktop Prompt Capture
- ID: 03-desktop-prompt-capture
- Owner: TBA
- Priority: P0
- Target Release: Next milestone

## Context Snapshot
- Validates our Replicache plumbing across the Electron shell by capturing real prompts without relying on mock data, supporting the offline-first principle in `agents/context.md`.
- Serves account owners and invited workspace members who want a fast way to archive AI prompts while working in other apps.
- Builds on existing workspace/user onboarding; relies on OpenAuth-issued tokens and Replicache providers shared between web and desktop.

## Goals & Non-Goals
- **Goals**
  - Register a global shortcut (`Cmd/Ctrl` + `Shift` + `P`) in the desktop app that reads the current selection/clipboard and opens a minimal confirmation flow.
  - Persist captured prompts to a new `Prompt` model in `packages/core`, including workspace/user scoping, privacy flag, favorites, categorization path, source, heading, and body content.
  - Fan captured prompts through Replicache so they appear instantly in desktop and web clients without restarting.
  - Establish a basic, deterministic categorization strategy (e.g., default folder `inbox/<source>` with timestamp ordering) that we can iterate on later.
- **Non-Goals**
  - Advanced AI-driven categorization or semantic foldering.
  - Browser automation for auto-capture; this feature only handles manual shortcut capture for now.
  - Multi-select editing, bulk operations, or prompt sharing UI beyond marking privacy and favorites.

## Dependencies & Risks
- Requires clipboard/selection access permissions on macOS and Windows; confirm sandbox entitlements.
- Global shortcut conflicts must be handled (fall back if registration fails).
- Replicache mutators must remain idempotent; duplicate submissions could occur if the user replays the shortcut rapidly.
- Database migrations add a new table; ensure staging/prod migrations run before deploying clients.

## Implementation Blueprint
- **Domain (`packages/core`)**
  - Create `packages/core/src/domain/prompt/` with Drizzle schema (`prompt.sql.ts`) including fields: `id` (cuid2), `workspaceID`, `userID`, `title`, `content`, `source` (enum: `chatgpt`, `claude`, `gemini`, `grok`, `other`), `categoryPath` (text path like `inbox/source`), `isFavorite` (boolean), `visibility` (`private`, `workspace`), timestamps, and `metadata` JSON for future enrichments.
  - Expose domain helpers (`Prompt.create`, `Prompt.update`, `Prompt.listByWorkspace`, `Prompt.serialize`) with actor-aware guards and Replicache key generation (e.g., `/prompt/<id>`).
  - Add Zod schema under `packages/core/src/models/Prompt.ts` for client consumption.
  - Introduce a migration file that creates the `prompt` table with relevant indexes (workspace, favorite, category).
- **Functions (`packages/functions`)**
  - Add Replicache mutator wiring in `src/replicache/server.ts` for `prompt_create`, `prompt_update`, `prompt_toggle_favorite`.
  - Expose a REST fallback (`POST /prompt`) under `src/api/prompt.ts` for debugging or non-Replicache clients.
  - Ensure `packages/functions/src/api/auth.ts` attaches the necessary workspace/user context so prompts store accurate `userID`s.
- **App (`packages/app`)**
  - Add Replicache mutators/selectors in `src/data/prompt-store.tsx` similar to workspace/user stores.
  - Provide a simple route or component (e.g., `packages/app/src/routes/workspace/prompts`) to inspect captured prompts for verification.
  - Update navigation/settings if needed to surface favorites or filters (optional, only if it aids testing).
- **Desktop (`packages/desktop`)**
  - Register global shortcut in `src/main/index.ts` using Electron `globalShortcut`; read selection with `clipboard.readText('selection')` (fallback to `clipboard.readText()`).
  - Create a preload bridge (`preload/prompt.ts`) exposing `promptCapture.capture` that pushes data to the renderer via IPC, backed by Zod validation.
  - In the renderer, implement a lightweight confirmation toast/dialog (using Shadcn components) allowing the user to tweak title/category/privacy before committing.
  - Reuse the shared auth/Replicache context so the renderer mutator (`prompt_create`) submits to the shared data store.
- **Categorization Strategy**
  - Compute `categoryPath` in the renderer/preload: default to `inbox/<source>`; allow users to override via optional input.
  - Source detection defaults to `other`; offer a quick dropdown populated with supported providers.

## Strict TODO Checklist
- [ ] Add Drizzle migration creating the `prompt` table with indexes on `workspaceID` + `timeCreated`, and `isFavorite`.
- [ ] Implement `packages/core/src/models/Prompt.ts` and domain helpers enforcing actor scoping and visibility rules.
- [ ] Wire Replicache mutators (`prompt_create`, `prompt_update`, `prompt_toggle_favorite`) plus serialization in pull handler.
- [ ] Add REST endpoint `packages/functions/src/api/prompt.ts` for manual verification (optional when Replicache unavailable).
- [ ] Extend desktop main process with global shortcut + clipboard handling, ensuring clean registration/unregistration on app focus/blur.
- [ ] Implement preload IPC and renderer confirmation UI in the desktop app, using Shadcn primitives and respecting file size guidelines.
- [ ] Create `packages/app/src/data/prompt-store.tsx` with selectors/mutators; update workspace layout to render captured prompts list for sanity checks.
- [ ] Document new environment variables or permissions if required (e.g., macOS accessibility prompts) in `AGENTS.md` or `agents/context.md`.
- [ ] Verify Bun commands (`bun run --filter app lint`, `bun run --filter @sst-replicache-template/desktop dev`, `bun test --cwd packages/core`) pass after changes.

## Test & QA Plan
- Manual desktop flow: launch `bun run --filter @sst-replicache-template/desktop dev`, press the global shortcut with highlighted text from an external app, confirm the confirmation UI appears, tweak metadata, and submit; verify prompt appears in the prompts list and syncs to the web client.
- Manual web verification: run `bun run --filter app dev`, ensure new prompt shows in the workspace view within a second (Replicache poke).
- Edge cases: empty selection (show error toast), duplicate submissions (should create unique entries), changing visibility/favorite.
- Automated: add unit tests for `Prompt` domain (creation, visibility constraints) with `bun test --cwd packages/core`; consider contract tests for Replicache mutators once framework exists.

## Open Questions
- Should we auto-open the confirmation UI or silently store prompts with a snackbar? (Current plan assumes confirmation.)
- How do we handle capture when the user is offline—queue locally via Replicache offline mutations or store in a local buffer?
- Do we need cross-workspace shortcuts (e.g., choosing target workspace when belonging to multiple) at capture time?
