# User Settings Page
- ID: 10-user-settings
- Owner: TBA
- Priority: P1
- Target Release: Sprint 3

## 1. Requirements Discovery

### 1.1. Context Snapshot
As the application matures, users require more control over its behavior. This feature introduces a dedicated User Settings page, providing customization options that enhance user experience and respect user preferences for automation and keyboard-centric workflows. This aligns with our goal of creating a powerful, user-configurable tool.

- **Persona Impacted:** All users, especially power users who want to tailor the application to their specific needs.
- **Related Features:** This feature directly impacts the Desktop Prompt Capture (08) and Prompt Insertion Palette (07) by making their keyboard shortcuts configurable.

### 1.2. Goals & Non-Goals
- **Goals**
  - **G1: Configurable Shortcuts:** Users can view and change the keyboard shortcuts for capturing prompts and opening the prompt palette.
  - **G2: Opt-out of Auto-collection:** Users can disable the automatic prompt capture functionality.
  - **G3: Persistent Settings:** All settings are saved per-user and are persistent across application restarts.
  - **G4: Intuitive UI:** The settings page is easy to find, understand, and use.

- **Non-Goals**
  - **NG1: Workspace-level Settings:** All settings in this iteration are user-specific. Workspace-wide settings are out of scope.
  - **NG2: Advanced Shortcut Validation:** The UI will prevent obviously invalid shortcuts (e.g., single letters), but will not check for conflicts with other applications in this iteration.
  - **NG3: Theming/Appearance Settings:** This feature focuses on functional settings only.

## 2. Architecture Planning

### 2.1. System Component Diagram
```
[Settings UI (Renderer)] --(1. User updates setting)--> [API: PATCH /v1/user-settings]
      |
      v
[Backend Service] --(2. Validate & Update)--> [Core: UserSettings Domain]
      |
      v
[Core Domain Logic] --(3. Persist to DB)--> [Database: `user_settings` table]
      |
(4. Settings are now stored)
      |
      v
[Desktop Main Process] --(5. On startup/change)--> [API: GET /v1/user-settings]
      |
      v
[Desktop Main Process] --(6. Fetches settings)--> [Registers/Unregisters Shortcuts]
      |
      v
[Electron GlobalShortcut Module]
```

### 2.2. Scalability & Technology
- **Frontend:** A new route and component will be created in the React app (`packages/app`) for the settings page.
- **Backend:** The existing `user_settings` table will be extended. A `PATCH` endpoint will be added to update settings.
- **Desktop:** The main process will be refactored to fetch settings on startup and dynamically register shortcuts. It will also need a mechanism to listen for settings changes while the app is running to apply them without a restart.

## 3. Interface Design

### 3.1. API Design: `PATCH /v1/user-settings`
- **Description:** Updates settings for the current user.
- **Authentication:** Required.
- **Request Body:** A partial object of the new settings fields.
  ```json
  {
    "shortcut_capture": "CmdOrCtrl+Shift+C",
    "shortcut_palette": "CmdOrCtrl+Shift+O",
    "enable_auto_capture": false
  }
  ```
- **Response (200 OK):** The updated `userSettings` object.

### 3.2. Data Model: `user_settings` Table
The existing table will be modified via a new Drizzle migration.

- **File:** `packages/core/migrations/<timestamp>_extend_user_settings.sql`
- **Schema (`packages/core/src/domain/user-settings/user-settings.sql.ts`):**
  ```typescript
  // Add these fields to the existing pgTable definition
  shortcutCapture: varchar("shortcut_capture", { length: 255 }).notNull().default("CmdOrCtrl+Shift+P"),
  shortcutPalette: varchar("shortcut_palette", { length: 255 }).notNull().default("CmdOrCtrl+Shift+O"),
  enableAutoCapture: boolean("enable_auto_capture").notNull().default(true),
  ```

### 3.3. User Interface Architecture
- **Location:** The settings page will be a new route, e.g., `/:workspaceSlug/settings`.
- **Layout:** It will use the existing `WorkspaceLayout`.
- **Components (from Shadcn):**
  - **Shortcut Input:** A custom component will be built using `Input` that captures and displays key combinations.
  - **Opt-out Toggle:** A `Switch` component inside a labeled group.
  - `Card` components to group related settings.
  - `Button` for saving changes.

## 4. Implementation Strategy

### Strict TODO Checklist
- [ ] **Infra:** Create a new migration file to add `shortcut_capture`, `shortcut_palette`, and `enable_auto_capture` to the `user_settings` table.
- [ ] **Core:** Update the schema in `packages/core/src/domain/user-settings/user-settings.sql.ts`.
- [ ] **Core:** Update the `UserSettings` domain logic in `packages/core/src/domain/user-settings/index.ts` to handle updates to the new fields.
- [ ] **Functions:** Create or update an API handler for `PATCH /v1/user-settings`.
- [ ] **App:** Create a new route and page component for `/settings`.
- [ ] **App:** Build the UI for the settings page using the specified components.
- [ ] **App:** Wire the UI to fetch existing settings and call the `PATCH` API on save.
- [ ] **Desktop (Main):** Refactor the shortcut registration logic in `packages/desktop/src/main/index.ts`.
- [ ] **Desktop (Main):** On startup, fetch user settings from the API. This requires an authenticated fetch from the main process, which is a new pattern.
- [ ] **Desktop (Main):** Use the fetched settings to dynamically register the global shortcuts. If `enable_auto_capture` is false, do not register the capture shortcut.
- [ ] **Desktop (Main):** Implement a listener for settings changes (e.g., via an IPC message from the renderer) to re-register shortcuts without a restart.

## Test & QA Plan
- **Manual:**
  - Navigate to the settings page and verify current defaults are shown.
  - Change a shortcut, save, and verify the new shortcut works.
  - Disable auto-capture, save, and verify the capture shortcut is disabled.
  - Restart the app and verify custom settings are persisted and applied correctly.
- **Automated:**
  - **Backend:** Add unit tests for the `PATCH /v1/user-settings` endpoint.
  - **Frontend:** Add component tests for the new shortcut input component.

## Open Questions
- How will the main process authenticate to fetch settings? This is a key challenge. A potential solution is for the renderer process, which holds the auth token, to fetch the settings and pass them to the main process via IPC on startup.
- How to handle invalid shortcut combinations? (e.g., "A+B"). We need to define a set of valid modifiers (Cmd, Ctrl, Alt, Shift) and keys.
