# Feature Creation Prompt

## Purpose
Use this template to brief an AI coding agent on a new feature. The agent will produce a spec file inside `agents/features/` that guides implementation, testing, and documentation updates while staying aligned with product context and design standards.

## Required Inputs
Provide the following when invoking the template:
- **Feature Name**: Human-readable title.
- **Problem Statement**: What user or system issue this feature solves.
- **Success Signals**: Metrics, UX outcomes, or acceptance criteria.
- **Constraints**: Deadlines, platform limits, integrations, or dependencies.
- **Reference Material**: Links to mocks, tickets, or research if available.

## Agent Instructions
1. Read `agents/context.md`, `AGENTS.md`, and `agents/design-guidelines.md` to ground the feature in current scope, architecture, and UI rules.
2. Derive a concise feature slug in kebab-case from the name (e.g., `profile-insights`).
3. Determine the next sequential ID for `agents/features/` using zero-padded numbering (`01-`, `02-`, ...). Example: if `01-auth.md` exists, name the new file `02-profile-insights.md`.
4. Create the feature file with the structure below, substituting real content for placeholder text.

## Output Template (copy into the new `agents/features/<id>-<slug>.md`)
```
# <Feature Name>
- ID: <ID-Slug>
- Owner: TBA
- Priority: <P0/P1/P2>
- Target Release: <Sprint or date>

## Context Snapshot
- Product framing pulled from `agents/context.md` relevant to this feature.
- Related personas or workflows impacted.
- Links to prior features or documents.

## Goals & Non-Goals
- **Goals**
  - Clear, outcome-focused statements.
- **Non-Goals**
  - Items explicitly out of scope.

## Dependencies & Risks
- External services, APIs, or migrations required.
- Known risks and mitigations.

## Implementation Blueprint
- Architecture notes (modules touched, data flow, IPC requirements).
- UI composition requirements referencing Shadcn components and Linear-style visuals.
- State management decisions (Zustand stores, hooks) and validation rules.

## Strict TODO Checklist
- [ ] Update `agents/context.md` if the product narrative or structure changes.
- [ ] Create/extend page folder at `src/renderer/src/pages/<page>/components/<component>/` with kebab-case files (`<component>.tsx`, `index.tsx`).
- [ ] Implement main UI using Shadcn primitives, keeping files under 300 lines.
- [ ] Wire renderer to shared contracts in `src/shared`, updating or adding Zod schemas as needed.
- [ ] Add services or API calls in `src/renderer/src/services/` with error handling.
- [ ] Register new state in `src/renderer/src/store/` or dedicated hooks, keeping logic lightweight.
- [ ] Document manual test steps / scenarios to run via `pnpm dev`.
- [ ] Update or create feature-specific TODOs under `agents/features/` for follow-up enhancements.

## Test & QA Plan
- Manual flows to verify, including edge cases.
- Type, lint, and potential automation steps planned.

## Open Questions
- Unresolved decisions requiring input.
- Data or design clarifications pending.
```

## Usage Notes
- Keep language direct and action-oriented—AI agents rely on explicit verbs and file paths.
- Break complex flows into multiple TODO items rather than nested descriptions.
- If the feature introduces shared components, note whether they should move into `src/renderer/src/components/` with their own folder and barrel file.
- Flag downstream follow-ups (analytics, cleanup, deferred tasks) so they can spin up dedicated feature specs later.
