# Shared Prompt Tagging
- ID: 17-shared-prompt-tagging
- Owner: TBA
- Priority: P1
- Target Release: Sprint TBD

## Context Snapshot
- Workspaces rely on Replicache to keep prompts in sync, but categorisation today is a single `categoryPath` string per prompt, which is hard to share and curate collaboratively.
- Desktop and browser capture surfaces both read from the shared prompt store; teams need a consistent tag library so everyone can discover and filter prompts quickly.
- Product vision in `agents/context.md` emphasises multi-tenant, real-time collaboration—shared tags align with that narrative without introducing new workspace boundaries.

## Goals & Non-Goals
- **Goals**
  - Provide a workspace-scoped tag catalogue that persists in its own collection and is synced to every client.
  - Let users create, rename, and retire tags, and assign multiple tags to a prompt during creation or edit flows.
  - Ensure Replicache diffs broadcast tag changes alongside prompt updates so other members see updates instantly across desktop and extension clients.
- **Non-Goals**
  - Replacing the existing `categoryPath` heuristics or migrating historical values into tags in this iteration.
  - Delivering advanced tag analytics, colour theming, or hierarchical taxonomies.
  - Building admin-only governance or role-based restrictions around who can manage tags.

## Dependencies & Risks
- **Dependencies**
  - New Drizzle migrations in `packages/core` for `tag` and `prompt_tag` tables plus associated domain modules.
  - Replicache sync surface (`packages/functions/src/api/replicache.ts`) must understand the additional tables so tags flow to clients.
  - UI changes depend on Shadcn primitives that already ship in the desktop renderer for selection and combobox patterns.
- **Risks**
  - Concurrent tag creation could lead to near-duplicate names unless we normalise/slugify and enforce uniqueness.
  - Larger Replicache patches from prompt ↔ tag joins could regress sync performance without careful key design.
  - Backfilling existing prompts to have empty tag arrays must avoid mutating every record in one transaction.

## Implementation Blueprint
- **Domain & Data Layer**
  - Add `packages/core/src/domain/tag/tag.sql.ts` defining `tag` (workspace-scoped, `id`, `name`, `slug`, optional description, `timeDeleted`) and `prompt_tag` join tables with composite PKs and workspace indexes. Generate corresponding Drizzle migration.
  - Create `packages/core/src/domain/tag/index.ts` with `Tag.create`, `Tag.update`, `Tag.remove`, and `Tag.listByWorkspace`, all asserting user actors and deduping by slug.
  - Extend `Prompt.create`/`Prompt.update` in `packages/core/src/domain/prompt/index.ts` to accept an optional `tagIDs` array: ensure referenced tags belong to the actor’s workspace, insert/delete join rows transactionally, and keep prompts writable without tags.
  - Introduce schemas in `packages/core/src/models/Tag.ts` and `PromptTag.ts` so clients receive typed models; add `PromptWithTagsSchema` helper if we expose aggregated tag IDs alongside prompt rows.

- **Sync & API Surface**
  - Update `packages/functions/src/api/replicache.ts` to include `tag` in `TABLES` and add `prompt_tag` to `JOIN_TABLES`, projecting keys like `/prompt_tag/<promptID>/<tagID>` so clients can rebuild associations without denormalising the prompt row.
  - Expose new mutations in `packages/functions/src/replicache/server.ts` (`tag_create`, `tag_update`, `tag_remove`, `prompt_set_tags`) and wire matching client mutators in `packages/desktop/src/renderer/src/data/mutators.tsx` and extension mutators.
  - Add REST helpers in `packages/functions/src/api/tag.ts` for tag CRUD (to support future scripting or non-Replicache consumers) and extend `packages/functions/src/api/prompt.ts` payloads to accept `tagIDs`.
  - Emit Replicache `poke` notifications whenever tag or prompt-tag rows change so connected clients refresh promptly.

- **Client Experience**
  - Create a `TagStore` in `packages/desktop/src/renderer/src/data/tag-store.tsx` to read `/tag/` keys and `/prompt_tag/` joins, exposing selectors for tag lists and prompt-to-tag mapping.
  - Update the prompt creation and `PromptEditor` flows under `packages/desktop/src/renderer/src/components/prompt-editor/` to add a multi-select combobox that supports inline tag creation (fire `tag_create` mutation) and selection chips (fire `prompt_set_tags`).
  - Surface tag chips and filter controls in `packages/desktop/src/renderer/src/components/prompt-insertion-palette/` so users can filter prompts by tag in the palette overlay.
  - Mirror the data structures in the Chrome extension by expanding `packages/chrome-plugin/src/lib/mutators.ts` and `~hooks/use-prompts` to hydrate tag metadata and display simple tag pills (filtering can follow-up if needed).
  - Ensure shared providers (workspace context, Replicache bootstrap) preload tag data so UI remains responsive when offline.

## Strict TODO Checklist
- [ ] Ship Drizzle migration creating `tag` and `prompt_tag` tables with workspace + uniqueness indexes.
- [ ] Scaffold `packages/core/src/domain/tag/` with create/update/remove/list functions and related Zod schemas.
- [ ] Extend `Prompt.create`/`Prompt.update` to validate tag ownership and persist prompt-tag joins transactionally.
- [ ] Add `TagSchema`, `PromptTagSchema`, and `PromptWithTagsSchema` (if needed) under `packages/core/src/models/` and export from package entrypoints.
- [ ] Update `packages/functions/src/api/replicache.ts` `TABLES`/`JOIN_TABLES` to include tags and prompt-tag associations.
- [ ] Register `tag_*` and `prompt_set_tags` mutations in `packages/functions/src/replicache/server.ts` with matching client mutators in desktop and extension surfaces.
- [ ] Create `TagStore` (and hook helpers) under `packages/desktop/src/renderer/src/data/` to index tags and prompt-tag joins.
- [ ] Refresh prompt editing UI to support multi-tag selection and inline creation using Shadcn components, with optimistic Replicache writes.
- [ ] Display tag pills and optional tag filter in the prompt insertion palette so categorisation is visible at selection time.
- [ ] Teach the Chrome extension’s Replicache integration to sync `/tag/` and `/prompt_tag/` keys and render tag labels beside prompts.
- [ ] Add unit tests in `packages/core` covering tag creation, dedupe, and prompt-tag assignment plus regression coverage for `Prompt.create`/`update`.
- [ ] Update Replicache contract tests (or add new ones) to assert tag mutations sync across clients.
- [ ] Document manual verification steps (desktop, extension) in follow-up PR notes per feature template.

## Test & QA Plan
- **Manual flows**: Create a tag, assign it to multiple prompts, verify another workspace member sees the tag list and prompt chips without refresh; rename a tag and confirm updates propagate; remove a tag and ensure it disappears from prompts gracefully; exercise flows offline and confirm pending mutations reconcile once reconnected.
- **Automated coverage**: Add Bun unit tests for new tag domain functions and prompt-tag join logic; extend any existing Replicache API contract tests to cover `tag_*` and `prompt_set_tags`; add a React testing-library spec (desktop) for the multi-select component if possible.
- **Required checks**: `bun test --cwd packages/core`, `bun run typecheck`, `bun run --filter @prompt-saver/desktop typecheck`, and smoke `bun run --filter @prompt-saver/functions lint` (if available) before submitting.

## Open Questions
- Should we enforce case-insensitive uniqueness on tag names, and do we expose slugs to the UI?
- Are tag renames in scope, or should we only support create/delete for the initial release?
- Do we need to seed default workspace tags or migrate existing `categoryPath` values into tags automatically?
- How many tags can a prompt hold before the UI becomes unwieldy—do we need a hard limit?
- Should tag deletion be soft (keep history) or hard-delete as long as no prompts reference it?
