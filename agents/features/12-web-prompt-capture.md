# Web Prompt Capture
- ID: 12-web-prompt-capture
- Owner: TBA
- Priority: P0
- Target Release: Next milestone

## Context Snapshot
- Extends the existing prompt capture system to automatically collect prompts from web-based AI provider interfaces (ChatGPT, Claude, etc.)
- Builds on the foundation established in `agents/features/03-desktop-prompt-capture.md` and leverages the shared `Prompt` domain model
- Targets account owners and workspace members who use web-based AI tools and want a seamless way to archive prompts without manual intervention

## Goals & Non-Goals
- **Goals**
  - Automatically detect and capture user prompts sent to popular AI providers (ChatGPT, Claude, Gemini) when browsing their web interfaces
  - Provide an unobtrusive experience that doesn't interfere with normal usage of AI provider websites
  - Support both authenticated and anonymous usage modes of AI providers
  - Handle dynamic web interfaces that load content asynchronously
  - Capture complete prompt context including system messages, previous conversation history, and attachments when possible
- **Non-Goals**
  - Capturing responses from AI providers (this is handled by other features)
  - Supporting every possible AI provider - focusing on the most popular ones initially
  - Modifying the behavior or appearance of AI provider websites
  - Working in private browsing/incognito modes where extensions are disabled

## Dependencies & Risks
- Requires permissions to access and read content from third-party websites
- Potential conflicts with AI provider website updates that change DOM structures
- Browser extension security policies may limit access to certain websites
- Risk of capturing sensitive information if not properly filtered
- May require frequent updates to maintain compatibility with evolving web interfaces

## Implementation Blueprint
- **Browser Extension**
  - Create a browser extension (Chrome/Edge/Firefox) with content scripts that inject into AI provider domains
  - Implement a background script that coordinates with the Replicache system
  - Add manifest permissions for relevant AI provider domains
  - Use a robust detection system that works with various website layouts and loading states
- **Content Script Detection**
  - Identify prompt submission elements using multiple selectors and strategies
  - Extract prompt text using a combination of direct DOM access and MutationObserver patterns
  - Handle dynamic content loading and single-page application navigation
  - Implement fallback methods for different website versions/layouts
- **Data Processing**
  - Clean and normalize captured prompts before sending to backend
  - Associate prompts with the correct workspace and user context
  - Handle rate limiting to avoid overwhelming the capture system
  - Implement deduplication to prevent capturing the same prompt multiple times
- **Integration Points**
  - Connect to existing Replicache infrastructure via the established prompt capture endpoints
  - Use the same `Prompt` domain model and schema defined in `packages/core/src/domain/prompt`
  - Leverage existing authentication mechanisms to associate prompts with users
  - Follow the same categorization strategy as established in feature 03

## Strict TODO Checklist
- [ ] Create browser extension structure with manifest.json and required permissions
- [ ] Implement content scripts for detecting and capturing prompts from ChatGPT
- [ ] Implement content scripts for detecting and capturing prompts from Claude
- [ ] Implement content scripts for detecting and capturing prompts from Gemini
- [ ] Develop background script to process captured prompts and send to Replicache
- [ ] Create domain mapping between web interface data and internal Prompt model
- [ ] Add proper error handling and logging for content script injection failures
- [ ] Implement deduplication mechanism to prevent duplicate captures
- [ ] Add configuration UI to enable/disable specific providers
- [ ] Create privacy filtering to exclude sensitive information from capture
- [ ] Add rate limiting to prevent performance impacts on provider websites
- [ ] Test cross-browser compatibility (Chrome, Edge, Firefox)
- [ ] Document installation and setup process for end users
- [ ] Update `agents/context.md` with information about web capture capabilities
- [ ] Create or extend React route folders under `packages/app/src/routes/settings/web-capture/` for configuration UI
- [ ] Build UI with Shadcn primitives for managing web capture settings
- [ ] Wire client logic through Replicache helpers in `packages/app/src/data/prompt-store.tsx`
- [ ] When the backend changes, update `packages/core/src/domain/prompt/index.ts` with any new capture metadata
- [ ] Document manual verification steps using `bun run dev` and test with actual AI provider websites
- [ ] Capture follow-up tasks for supporting additional AI providers under `agents/features/`

## Test & QA Plan
- Manual testing: Install extension in Chrome/Edge/Firefox, navigate to supported AI providers, submit prompts, verify they appear in the prompt library
- Edge cases: Test with different website layouts, test during page transitions, test with very long prompts, test with special characters
- Automated: Add unit tests for prompt extraction logic with mocked DOM structures
- Cross-browser verification: Ensure consistent behavior across Chrome, Edge, and Firefox
- Privacy tests: Verify sensitive information is properly filtered before capture
- Performance tests: Confirm content scripts don't significantly impact page load times or responsiveness

## Open Questions
- How should we handle prompts that contain potentially sensitive information?
- What level of prompt context should we capture (full conversation history, just the latest message)?
- Should users be able to configure which providers to capture from?
- How do we handle rate limiting to avoid being blocked by AI provider websites?
- What fallback mechanisms do we need for when websites change their DOM structure?