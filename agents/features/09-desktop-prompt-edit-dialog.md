# Desktop Prompt Edit Dialog
- ID: 09-desktop-prompt-edit-dialog
- Owner: TBA
- Priority: P1
- Target Release: Sprint 3

## Context Snapshot
- Product framing pulled from `agents/context.md` that motivates this feature.
- This feature enhances the desktop application experience by providing a dedicated UI for editing prompt details including name, content, and category.
- Addresses the need for users to easily modify their captured prompts in a more comprehensive editing interface.

## Goals & Non-Goals
- **Goals**
  - Provide a full-screen dialog for editing prompt details (name, content, category)
  - Enable users to save or cancel changes to their prompts
  - Maintain consistency with existing design guidelines and UI patterns
  - Implement keyboard shortcuts for common actions (Escape to cancel, Cmd+S to save)
- **Non-Goals**
  - Creating new prompts (this is handled by existing capture mechanisms)
  - Changing prompt visibility or favorite status (handled separately)
  - Implementing complex validation or error handling beyond basic requirements

## Dependencies & Risks
- Depends on existing prompt data structures and mutators
- Requires integration with Replicache for data persistence
- Risk of conflicting with existing prompt editing flows
- May need to coordinate with web app team if similar functionality is planned there

## Implementation Blueprint
- Create a new full-screen dialog component in `packages/desktop/src/renderer/src/components/modals/prompt-edit-dialog/`
- Implement form with fields for:
  - Prompt title (text input)
  - Prompt content (textarea)
  - Prompt category (text input or dropdown)
- Wire up existing `prompt_update` mutator for saving changes
- Add keyboard shortcut handling (Escape to close, Cmd+S to save)
- Integrate with existing prompt data store
- Follow Shadcn primitives and Tailwind utility classes
- Use layout scaffolds from existing components

## Strict TODO Checklist
- [ ] Create new directory `packages/desktop/src/renderer/src/components/modals/prompt-edit-dialog/`
- [ ] Implement `PromptEditDialog` component with full-screen dialog
- [ ] Create form with fields for title, content, and category
- [ ] Wire up existing `prompt_update` mutator for saving changes
- [ ] Add keyboard shortcut handling (Escape to close, Cmd+S to save)
- [ ] Implement proper form validation for required fields
- [ ] Add proper TypeScript typing for all components and props
- [ ] Follow design guidelines for Linear-inspired aesthetic and Tailwind usage
- [ ] Ensure component is responsive and works in the desktop environment
- [ ] Test integration with existing prompt data flow
- [ ] Document manual verification steps for the feature
- [ ] Ensure `bun run --filter app lint` and `bun run typecheck` pass

## Test & QA Plan
- Manual verification:
  - Open prompt edit dialog from prompts table
  - Edit prompt title, content, and category
  - Save changes and verify they persist
  - Cancel changes and verify original values are preserved
  - Test keyboard shortcuts (Escape, Cmd+S)
  - Verify dialog closes properly in all scenarios
- Automated coverage:
  - Unit tests for form validation logic
  - Integration tests for data flow with Replicache
- Required checks before PR:
  - `bun run --filter @sst-replicache-template/desktop lint` passes
  - `bun run typecheck` passes for desktop package
  - Manual testing in desktop app environment

## Open Questions
- Should we implement category suggestions or autocomplete?
- Do we need to handle very large prompt content differently?
- Should we add any analytics or tracking for prompt edits?