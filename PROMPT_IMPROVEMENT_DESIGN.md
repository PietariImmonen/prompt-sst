# Prompt Improvement from Transcription Design

- **ID:** 20-prompt-improvement-from-transcription
- **Owner:** TBA
- **Priority:** P1
- **Target Release:** Sprint 4

## 1. Overview

This feature enhances the Universal Transcription Tool by adding an optional step to refine the transcribed text using a Large Language Model (LLM). After a user transcribes their voice, they can trigger an "improvement" process. The raw transcription is sent to an LLM, which refactors it into a clearer, more structured prompt. The final, improved prompt is then inserted into the user's active application and saved to the database.

This combines the real-time transcription from feature #18 with the text enhancement capabilities of feature #19.

## 2. User Flow

1.  **Activate Transcription:** User presses `Cmd+Shift+T` to start transcription. The `TranscriptionOverlay` appears and shows live text from Soniox.
2.  **Stop Transcription:** User presses `Cmd+Shift+T`, `Esc`, or clicks the stop button. The transcription is finalized.
3.  **Expose "Improve" Action:** The overlay now shows the final transcribed text along with two primary actions: "Insert" and a new **"Improve"** button.
4.  **Trigger Improvement:** User clicks the "Improve" button.
5.  **LLM Processing:** The overlay shows a loading/streaming state, indicating that the text is being improved.
6.  **Display Improved Prompt:** The LLM streams the improved prompt back to the overlay, replacing the original transcription in real-time.
7.  **Insert and Save:** Once the streaming is complete, the user can click "Insert". This action will:
    *   Insert the improved prompt into the active application at the cursor's position.
    *   Save the improved prompt to the database.
    *   Close the overlay.
8.  **Cancel:** The user can cancel at any point by pressing `Esc` or a cancel button, which will close the overlay without taking further action.

## 3. Architecture and Data Flow

The proposed architecture leverages existing components and services to minimize new code and ensure consistency.

```
[User clicks "Improve" in TranscriptionOverlay]
      |
      v
[1. Renderer Process (TranscriptionOverlay.tsx)]
   - Sends IPC message to main process with the transcribed text.
      |
      v
[2. Electron Main Process (text-improvement-service.ts)]
   - Receives text from the overlay.
   - Calls a new backend function via the API client.
      |
      v
[3. API Gateway -> Lambda Function (e.g., POST /prompts/improve-from-transcription)]
   - Receives the raw text.
   - Invokes the LLMImprovementService.
      |
      v
[4. LLMImprovementService]
   - Uses a fast LLM provider (e.g., OpenAI GPT-4o-mini).
   - Streams the improved text back to the Lambda function.
      |
      v
[5. Lambda Function]
   - Streams the response back to the Electron main process.
   - After the full prompt is generated, it saves the prompt to the database via the Core package services.
      |
      v
[6. Electron Main Process]
   - Streams the tokens to the TranscriptionOverlay via IPC.
      |
      v
[7. Renderer Process (TranscriptionOverlay.tsx)]
   - Displays the streaming tokens.
   - When user clicks "Insert":
     - Sends IPC message to main process.
      |
      v
[8. Electron Main Process (text-insertion-service.ts)]
   - Inserts the final, improved text into the active application.
```

## 4. Detailed Component Changes

### 4.1. Frontend (`packages/desktop/src/renderer/src/components/transcription-overlay.tsx`)

-   **State Management:** Add new states to the component to handle the "improvement" flow: `IMPROVING`, `IMPROVEMENT_COMPLETE`.
-   **UI:**
    -   Add an "Improve" button that is visible after transcription is `FINALIZED`.
    -   When "Improve" is clicked, the UI should enter a loading state.
    -   The text area that previously showed the final transcription will now show the streaming response from the LLM.
-   **IPC Communication:**
    -   Send a new IPC message like `transcription:improve` with the text payload.
    -   Listen for `transcription:token` messages to display the streaming response.

### 4.2. Desktop Main Process (`packages/desktop/src/main/`)

-   **`transcription-service.ts`:**
    -   Listen for the `transcription:improve` IPC message.
    -   When received, call a new backend API endpoint.
    -   Handle the streaming response from the backend and forward tokens to the overlay via IPC.
    -   Store the final improved prompt.
    -   When the final "insert" command is received, use the `TextInsertionService` with the improved prompt.

### 4.3. Backend (`packages/functions/`)

-   **New Endpoint:** Create a new Lambda function at `src/prompts/improve.ts`.
    -   **Route:** `POST /prompts/improve-from-transcription`
    -   **Request Body:** `{ "text": "the raw transcribed text" }`
    -   **Handler Logic:**
        1.  Instantiate `LLMImprovementService` (from `packages/desktop`, to be moved to `packages/core`).
        2.  Call the `improveText` method, streaming the response back to the client.
        3.  Once the full response is generated, create a new prompt record in the database. This should be done asynchronously to avoid blocking the user.
        4.  The prompt should be saved with a new `source` or `type` to distinguish it from other prompt types (e.g., `source: 'transcription_improved'`).

### 4.4. Core Logic (`packages/core/`)

-   **Move `LLMImprovementService`:** The `llm-improvement-service.ts` and its provider dependencies, currently planned for `packages/desktop`, should be moved to `packages/core/src/llm` to be accessible by the backend functions.
-   **Database Schema (`packages/core/src/drizzle/schema.ts`):**
    -   Modify the `prompts` table (or equivalent) to include a field that indicates the source of the prompt.
    -   Example migration:
        ```sql
        ALTER TABLE prompts ADD COLUMN source VARCHAR(255) DEFAULT 'unknown';
        ```
    -   This allows for filtering and analyzing prompts generated via this new flow.

## 5. API Design

### `POST /prompts/improve-from-transcription`

-   **Description:** Receives raw text, improves it using an LLM, saves it, and streams the result.
-   **Request:**
    ```json
    {
      "text": "string"
    }
    ```
-   **Response (Streaming):** A stream of text tokens.
-   **Post-condition:** A new prompt is saved in the database with `source: 'transcription_improved'`.

## 6. Implementation Plan (High-Level)

1.  **Refactor LLM Services:** Move `LLMImprovementService` and related providers from `packages/desktop` to `packages/core`.
2.  **Update Database:** Add the `source` column to the prompts table and create a migration.
3.  **Backend Endpoint:** Create the new `POST /prompts/improve-from-transcription` Lambda function.
4.  **Frontend UI:** Update the `TranscriptionOverlay` component with the new "Improve" button and state management.
5.  **Desktop Main Process:** Update `transcription-service.ts` to handle the new IPC messages and orchestrate the call to the backend.
6.  **Testing:**
    -   Manually test the end-to-end flow in various applications.
    -   Add unit tests for the new backend endpoint.
    -   Verify that prompts are correctly saved to the database.

## 7. Open Questions

-   **Model Selection:** While `gpt-4o-mini` is a good starting point for its speed, should we allow the user to select a different model (e.g., a more powerful but slower one) in the settings? For the MVP, a single, fast model is sufficient.
-   **Error Handling:** How should we handle LLM errors or timeouts? The overlay should display a clear error message with an option to retry.
-   **Cost:** This feature will incur LLM costs. We need to ensure that this is tracked and communicated to the user, potentially with usage limits.
