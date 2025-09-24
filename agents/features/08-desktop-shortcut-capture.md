# Desktop Prompt Capture via Global Shortcut

- ID: 08-desktop-shortcut-capture
- Owner: TBA
- Priority: P1
- Target Release: Sprint 2

## 1. Requirements Discovery

### 1.1. Context Snapshot

This feature addresses the core user need of capturing fleeting ideas and content snippets with minimal friction. The current workflow requires users to manually copy, switch context to our application, and paste the content. This is slow, disruptive, and error-prone. By introducing a global shortcut, we align with the product's goal of becoming an ambient, always-on assistant for knowledge workers.

- **Persona Impacted:** All users, especially power users who value keyboard-driven workflows.
- **Related Features:** This is a foundational feature for prompt management and will connect to the future prompt data table (04) and insertion palette (07).

### 1.2. Goals & Non-Goals

- **Goals**

  - **G1: Frictionless Capture:** Users can save highlighted text from any application on their desktop into the system using a single keyboard shortcut (`Cmd+Shift+P`).
  - **G2: Ambient Feedback:** The system provides clear, non-intrusive feedback confirming the capture was successful.
  - **G3: Reliable Storage:** Captured prompts are reliably stored in the database and associated with the active user and workspace.
  - **G4: Cross-Platform Support:** The shortcut works consistently on supported desktop platforms (macOS, Windows, Linux).

- **Non-Goals**
  - **NG1: Editing Captured Prompts:** This feature is for capture only. Editing will be handled by a dedicated prompt management interface.
  - **NG2: Complex Metadata:** The initial capture will only include the text content. Source application, URL, or other metadata is out of scope for this iteration.
  - **NG3: Configurable Shortcuts:** The shortcut will be hardcoded to `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux). User configuration is not part of this MVP.

## 2. Architecture Planning

### 2.1. System Component Diagram

```
[Desktop App] --(1. Register Shortcut)--> [Electron Main Process]
      |
(2. User presses shortcut)
      |
      v
[Electron Main Process] --(3. Get Highlighted Text)--> [OS Accessibility API]
      |
(4. Send Text to Backend)
      |
      v
[API Endpoint: POST /v1/prompts] --(5. Auth & Validate)--> [Backend Auth Middleware]
      |
      v
[Backend Service] --(6. Create Prompt Entity)--> [Core Domain Logic]
      |
      v
[Core Domain Logic] --(7. Persist to DB)--> [Database: `prompts` table]
      |
(8. Return Success)
      |
      v
[API Endpoint] --(9. Respond 201 Created)--> [Electron Main Process]
      |
(10. Show Notification)
      |
      v
[Desktop App] --> [OS Notification System]
```

### 2.2. Scalability & Technology

- **Desktop:** The Electron `globalShortcut` module will be used in the main process to avoid conflicts and ensure it's always available. We must handle app startup and shutdown gracefully, registering and unregistering the shortcut.
- **API:** The new endpoint will be a standard RESTful operation, protected by existing JWT authentication. It's a simple write operation, so it will scale horizontally with the existing API infrastructure.
- **Database:** A new `prompts` table will be created. Given the 10x growth scenario, we anticipate high write volume. The schema will be simple, indexed on `workspace_id` and `user_id` for efficient querying.

## 3. Interface Design

### 3.1. API Design: `POST /v1/prompts`

- **Description:** Creates a new prompt from captured text.
- **Authentication:** Required (standard JWT Bearer token).
- **Request Body:**
  ```json
  {
    "content": "The captured text content from the user's clipboard/selection."
  }
  ```
- **Logic:**
  - The API will receive the raw text content.
  - It must generate a `title` for the prompt. A good default is to take the first 5-7 words of the content.
  - It will set default values for other required fields:
    - `source`: "other"
    - `categoryPath`: "/" (root)
    - `visibility`: "private"
- **Response (201 Created):** The full prompt entity, matching the structure from `prompt.sql.ts`.

### 3.2. Data Model: `prompt` Table

The `prompt` table and domain entity **already exist** and are defined in `packages/core/src/domain/prompt/prompt.sql.ts`. No database changes are needed.

### 3.3. User Interface

The primary interaction is headless. The only UI is a system notification to provide feedback.

- **Success:** A notification titled "Prompt Captured" with the first few words of the captured text as the body.
- **Failure:** A notification titled "Capture Failed" with a brief, user-friendly error message (e.g., "Could not save prompt. Are you online?").

## 4. Implementation Strategy

### Strict TODO Checklist

- [ ] **Functions:** Create a new API handler at `packages/functions/src/api/prompts.ts` for the `POST /v1/prompts` endpoint. Implement authentication and validation.
  - _Note: The handler must generate a `title` and set default values for `source`, `categoryPath`, and `visibility`._
- [ ] **Infra:** Add the new `/prompts` route to the API stack in `infra/api.ts`.
- [ ] **Desktop (Main):** In `packages/desktop/src/main/index.ts`, import `globalShortcut` and `clipboard` from Electron.
- [ ] **Desktop (Main):** On app `ready` event, register `CmdOrCtrl+Shift+P`.
- [ ] **Desktop (Main):** In the shortcut callback, get the selected text using `clipboard.readText('selection')`.
- [ ] **Desktop (Main):** On capture, make a `fetch` request to the new API endpoint from the main process. The request body should be `{"content": "..."}`.
- [ ] **Desktop (Main):** On API response, use the `Notification` module to show success or failure feedback.
- [ ] **Desktop (Main):** On app `will-quit` event, unregister the global shortcut using `globalShortcut.unregisterAll()`.

## Test & QA Plan

- **Manual:**
  - Highlight text in various applications (browser, text editor, PDF) and press the shortcut. Verify a success notification appears and the data is in the database.
  - Press shortcut with no text highlighted. Verify nothing happens or a subtle error is shown.
  - Test while the app is not in focus.
  - Test while offline. Verify an error notification is shown.
- **Automated:**
  - **Backend:** Add unit tests for the `POST /v1/prompts` endpoint in `packages/functions/src/api/__tests__/prompts.test.ts`.
  - **Desktop:** Manual testing is sufficient for the main process logic in this iteration, as automating global shortcut testing is complex.
- **Pre-PR Checks:**
  - `bun run --filter @prompt-saver/core drizzle:generate`
  - `bun run --filter @prompt-saver/functions test`
  - `bun run typecheck`

## Open Questions

- Should we consider potential shortcut conflicts with other popular applications? For MVP, we will proceed with `CmdOrCtrl+Shift+P`, but we should be prepared to make it configurable in the future.
