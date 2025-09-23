# Desktop User and Organization Onboarding
- ID: 11-user-org-onboarding
- Owner: TBA
- Priority: P0
- Target Release: Sprint 1

## Context Snapshot
- This feature builds upon the existing authentication foundation (01-auth-foundation) to create a seamless onboarding experience for new users on the **desktop application**.
- It directly addresses the product vision of providing a reference-quality SaaS workspace experience by creating the initial user and organization structure.
- The primary persona impacted is the "SaaS founder and product engineer" who needs a working baseline for a multi-tenant application, specifically for the desktop client.

## Goals & Non-Goals
- **Goals**
  - Create a new user account after successful authentication on the desktop app.
  - Create a new organization (workspace) for the user.
  - Guide the user through a simple onboarding process within the desktop app.
  - The onboarding process will have one step: asking the user if they want to enable auto-capture of prompts from AI applications.
  - The user's choice for auto-capture should be stored in `UserSettings`.
- **Non-Goals**
  - This feature will not include a web-based onboarding flow.
  - This feature will not include inviting other users to the organization.
  - This feature will not include a multi-step complex onboarding flow.
  - This feature will not include the actual implementation of the prompt auto-capture, only the setting to enable/disable it.

## Dependencies & Risks
- Depends on the existing OpenAuth integration for user authentication.
- The UI for the onboarding flow will need to be created within the desktop application's React codebase.
- Risk: The onboarding flow might need to be extended in the future, so the implementation should be flexible enough to accommodate new steps.

## Implementation Blueprint
- **Target Modules:**
  - `packages/desktop/src/renderer/src/routes/`: A new route will be created for the onboarding steps.
  - `packages/desktop/src/renderer/src/components/onboarding/`: New components for the onboarding UI.
  - `packages/core/src/domain/user/`: Logic for creating a new user.
  - `packages/core/src/domain/workspace/`: Logic for creating a new organization.
  - `packages/core/src/domain/user-settings/`: Logic for storing the auto-capture preference.
  - `packages/functions/src/api/auth.ts`: The registration endpoint will be updated to trigger the user and organization creation.
- **Data Flow:**
  1. After a new user signs up via OpenAuth on the desktop app, the app will call an API endpoint to complete the registration.
  2. The backend API will create a new `Account`, a new `User`, and a new `Workspace` (organization) for the user.
  3. The desktop app will navigate the user to the `/onboarding` route.
  4. The onboarding page will present the auto-capture option.
  5. The user's choice will be saved to the `UserSettings` table via a Replicache mutator.
- **UI Composition:**
  - The onboarding UI will be built using Shadcn primitives from `packages/desktop/src/renderer/src/components/ui`.
  - A simple centered layout with a single card for the onboarding question.
  - A `Switch` component will be used for the auto-capture toggle.

## Strict TODO Checklist
- [ ] Create a new route folder under `packages/desktop/src/renderer/src/routes/onboarding/`.
- [ ] Build the onboarding UI with a `Switch` for auto-capture preference in `packages/desktop/src/renderer/src/components/onboarding/`.
- [ ] Update the registration logic in `packages/functions/src/api/auth.ts` to create the user and organization.
- [ ] Create a Replicache mutator in `packages/app/src/data/mutators.tsx` to update the `autoCapture` setting in `UserSettings` (this can be shared with the web app).
- [ ] Update the `User` and `Workspace` domain logic in `packages/core` if necessary to support the creation flow.
- [ ] Document the manual verification steps for the onboarding flow in the desktop app.

## Test & QA Plan
- **Manual Flows:**
  - New user signs up on the desktop app and is navigated to the onboarding page.
  - User can toggle the auto-capture switch.
  - The setting is correctly saved and reflected in the user's settings.
  - After completing the onboarding, the user is navigated to the main application screen in the desktop app.
- **Automated Coverage:**
  - Unit tests for the new domain logic in `packages/core`.
  - Contract tests for the updated registration endpoint in `packages/functions`.

## Open Questions
- Should the organization be named automatically, or should the user be prompted for a name? For this iteration, we will automatically name it based on the user's name (e.g., "John Doe's Workspace").
