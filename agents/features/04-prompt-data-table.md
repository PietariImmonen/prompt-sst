# Prompt Data Table
- ID: 04-prompt-data-table
- Owner: TBA
- Priority: P1
- Target Release: Sprint 1

## Context Snapshot
This feature will provide a UI for displaying prompts in a data table. It will be used in the desktop app to give users a way to view and manage their captured prompts. The design should be inspired by Linear, with a focus on minimalism and usability.

## Goals & Non-Goals
- **Goals**
  - Display a list of prompts in a data table.
  - The table should include the prompt's name, content, and capture date.
  - The UI should be clean, minimal, and consistent with the Linear design aesthetic.
  - The components should be reusable and well-structured.
- **Non-Goals**
  - This feature will not include any functionality for editing or deleting prompts in this first version.
  - Filtering and sorting will not be implemented in this version.

## Dependencies & Risks
- This feature depends on the Replicache store for prompts being available and populated with data.
- There is a risk that the data table component might be complex to build from scratch. To mitigate this, we will use the existing Shadcn table components as a foundation.

## Implementation Blueprint
- **Target modules:**
  - `packages/desktop/src/renderer/src/pages/prompts.tsx`
  - `packages/desktop/src/renderer/src/components/prompts-table/`
- **Data flow:**
  - The `prompts.tsx` page will fetch the prompts from the Replicache store using the `useSubscribe` hook.
  - The prompts will then be passed to the `PromptsTable` component.
- **UI composition:**
  - The `PromptsTable` component will be built using the Shadcn `Table` component (`@/components/ui/table`).
  - The table will have three columns: "Name", "Content", and "Captured".
  - The "Name" column will display the prompt's title.
  - The "Content" column will display a truncated version of the prompt's content.
  - The "Captured" column will display the date the prompt was created, formatted as "Month day, year".
  - Two buttons will be placed in the top left corner of the page for future actions (e.g., "New Prompt", "Import").

## Strict TODO Checklist
- [x] Create a new directory `packages/desktop/src/renderer/src/components/prompts-table/`.
- [x] Create a new component `prompts-table.tsx` inside the new directory.
- [x] The `prompts-table.tsx` component should be a reusable data table for displaying prompts.
- [x] The component should accept an array of prompts as a prop.
- [x] The component should use the Shadcn `Table` component to render the data.
- [x] Create a new component `prompts-page-header.tsx` inside the same directory.
- [x] The `prompts-page-header.tsx` component should display the two buttons in the top left corner.
- [x] Modify `packages/desktop/src/renderer/src/pages/prompts.tsx` to use the new `PromptsTable` and `PromptsPageHeader` components.
- [x] The page should fetch the prompts from the Replicache store and pass them to the `PromptsTable` component.

## Test & QA Plan
- Manual testing:
  - Verify that the prompts are displayed correctly in the data table.
  - Verify that the table columns are correctly formatted.
  - Verify that the UI is consistent with the Linear design aesthetic.
- Automated testing:
  - No automated tests will be created for this feature in this first version.

## Open Questions
- What should be the exact text and functionality of the two buttons in the top left corner?
