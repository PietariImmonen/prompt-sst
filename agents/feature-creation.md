# Feature Creation Prompt

## Purpose
Use this template to brief an AI coding agent on a new feature. The agent will produce a spec file inside `agents/features/` that guides implementation, testing, and documentation updates while staying aligned with product context and design standards.

## Required Inputs
Provide the following when invoking the template:
- **Feature Name** – Human-readable title.
- **Problem Statement** – What user or system issue the feature solves.
- **Success Signals** – Metrics, UX outcomes, or explicit acceptance criteria.
- **Constraints** – Deadlines, environment quirks, integrations, or known dependencies.
- **Reference Material** – Links to mocks, tickets, API docs, or research assets when available.

## Agent Instructions
1. Review `AGENTS.md`, `agents/context.md`, and `agents/design-guidelines.md` for up-to-date architecture, product framing, and UI expectations.
2. Derive a concise feature slug in kebab-case from the name (e.g., `workspace-invite-flow`).
3. Determine the next sequential ID for `agents/features/` using zero-padded numbering (`01-`, `02-`, …). Example: if `03-billing-sync.md` exists, name the new file `04-workspace-invite-flow.md`.
4. Create the feature file with the structure below, replacing placeholder text with the real plan.

## Output Template (copy into the new `agents/features/<id>-<slug>.md`)
```
# <Feature Name>
- ID: <ID-Slug>
- Owner: TBA
- Priority: <P0/P1/P2>
- Target Release: <Sprint or date>

## Context Snapshot
- Product framing pulled from `agents/context.md` that motivates this feature.
- Personas or workflows impacted (account owner, workspace member, etc.).
- Links to prior features, tickets, mocks, or spike notes.

## Goals & Non-Goals
- **Goals**
  - Outcome-driven statements describing what success looks like.
- **Non-Goals**
  - Explicitly call out work that is out of scope.

## Dependencies & Risks
- External services, migrations, or infra updates required.
- Known risks, mitigations, and fallback behaviours.

## Implementation Blueprint
- Target modules (e.g., `packages/app/src/routes/<area>/<feature>`, `packages/functions/src/api/<route>`, `packages/core/src/domain/<entity>`).
- Data flow between Replicache stores/mutators and domain logic.
- UI composition notes referencing Shadcn primitives, Tailwind tokens, and layout scaffolds.

## Strict TODO Checklist
- [ ] Update `agents/context.md` if the product narrative, domain surface, or architecture changes.
- [ ] Create or extend React route folders under `packages/app/src/routes/<area>/<feature>/components/<component>/`, exporting via `index.ts` barrels.
- [ ] Build UI with Shadcn primitives from `@/components/ui`, keeping files under ~300 LoC and extracting hooks/utilities as needed.
- [ ] Wire client logic through Replicache or REST helpers in `packages/app/src/data` / `packages/app/src/lib/api`, aligning types with `@sst-replicache-template/core` models.
- [ ] When the backend changes, touch `packages/core` first (schema/domain/service), then expose endpoints in `packages/functions` with zod contracts and auth middleware.
- [ ] If scripts or infrastructure adjustments are needed, document the exact Bun command (`bun run --filter @...`) and expected environment variables.
- [ ] Document manual verification steps run via `bun run dev` (or package-specific dev command) and note any feature flags or seed data.
- [ ] Capture follow-up tasks or stretch goals under `agents/features/` for future iterations.

## Test & QA Plan
- Enumerate manual flows (happy path, edge cases, offline sync expectations).
- Identify automated coverage (unit tests with `bun test`, contract tests under `packages/functions/src/**/__tests__`, or future plans).
- List required checks before PR (`bun run --filter app lint`, `bun run typecheck`, relevant build or migration commands).

## Open Questions
- Outstanding product, design, or technical decisions needing input.
- Data contracts or API details awaiting confirmation.
```

## Usage Notes
- Use active, direct language—AI agents rely on explicit verbs, file paths, and command names.
- Break complicated flows into discrete TODO items instead of combined paragraphs.
- Highlight when shared components should graduate from a route folder into `packages/app/src/components/` for reuse.
- Flag downstream analytics, cleanup, or deferred work so dedicated follow-up specs can be created later.
