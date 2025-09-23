# Desktop Production Text Insertion

- ID: 15-desktop-production-text-insertion
- Owner: TBA
- Priority: P0
- Target Release: Immediate hotfix

## Context Snapshot

The desktop application's automatic text insertion feature fails completely in production builds. Users can open the prompt insertion palette, but when they select a prompt, the text is not inserted into target applications. This breaks the core workflow of the desktop app as a productivity tool.

Current issues include:
- Text insertion commands fail in built applications due to security restrictions
- Focus restoration doesn't work properly in production security contexts
- Cross-application automation requires proper entitlements that are missing
- Fallback clipboard paste methods don't execute correctly

## Goals & Non-Goals

**Goals**
- Fix automatic text insertion to work reliably in production builds across all platforms
- Implement proper focus restoration to target applications after prompt selection
- Add robust fallback mechanisms when direct insertion fails
- Ensure text insertion works in 90%+ of common applications (browsers, editors, messaging)
- Provide clear user feedback when insertion succeeds or fails
- Add platform-specific optimizations for better insertion reliability

**Non-Goals**
- Changing the prompt selection UI or palette design
- Adding new text formatting or processing features
- Modifying the underlying prompt data structure

## Dependencies & Risks

**Dependencies**
- Platform-specific system automation entitlements and permissions
- Focus detection and application targeting functionality
- Native automation APIs (AppleScript, Windows SendKeys, Linux automation)
- Clipboard access and manipulation capabilities

**Risks**
- Security software blocking automated typing functionality
- Application-specific input handling preventing insertion
- Race conditions in focus restoration and text insertion timing
- Platform differences in automation API behavior and reliability

**Mitigations**
- Implement multiple insertion methods with automatic fallback
- Add timing controls and retry logic for flaky automation APIs
- Provide manual clipboard fallback when automation fails
- Add comprehensive logging and diagnostics for troubleshooting

## Implementation Blueprint

**Target modules:**
- `packages/desktop/src/main/capture-service.ts` - Fix submitSelectedPrompt function
- `packages/desktop/src/main/text-insertion-service.ts` - New dedicated insertion service
- `packages/desktop/src/main/focus-management-service.ts` - Enhanced focus restoration
- `packages/desktop/electron-builder.config.js` - Add automation entitlements

**Data flow changes:**
- Separate text insertion logic into dedicated service with multiple strategies
- Improve focus detection and restoration with better error handling
- Add insertion method selection based on target application type
- Implement proper timing and sequencing for insertion operations
- Add comprehensive error reporting and user feedback

**UI composition:**
- Insertion status feedback in overlay window
- Settings for insertion method preferences and timing controls
- Error dialogs with specific guidance for insertion failures
- Success notifications confirming text was inserted

## Strict TODO Checklist

- [ ] Extract text insertion logic into dedicated service with multiple strategies
- [ ] Fix AppleScript text insertion to work in production with proper escaping
- [ ] Implement Windows PowerShell SendKeys with production-compatible execution
- [ ] Add Linux xdotool/ydotool insertion with proper tool detection
- [ ] Improve focus restoration with better application and window targeting
- [ ] Add timing controls and delays for better insertion reliability
- [ ] Implement insertion method detection based on target application
- [ ] Add comprehensive error handling with specific failure reason reporting
- [ ] Create fallback clipboard insertion when direct typing fails
- [ ] Add insertion confirmation and retry mechanisms
- [ ] Implement application-specific insertion optimizations (browsers, editors)
- [ ] Add user notification system for insertion success/failure feedback
- [ ] Create insertion settings panel for method selection and timing adjustment
- [ ] Add logging and diagnostics for insertion failure troubleshooting
- [ ] Test insertion in wide variety of applications and contexts
- [ ] Add insertion performance monitoring and optimization
- [ ] Implement character-by-character vs bulk insertion options
- [ ] Add special handling for large text blocks and formatting preservation

## Test & QA Plan

**Manual flows:**
- Test insertion in web browsers (Chrome, Firefox, Safari, Edge) - text areas and inputs
- Test insertion in text editors (VS Code, Sublime, Notepad++, TextEdit)
- Test insertion in messaging apps (Slack, Discord, Teams, WhatsApp Web)
- Test insertion in productivity apps (Notion, Google Docs, Microsoft Word)
- Test insertion with various text lengths (short phrases to multi-paragraph prompts)
- Test focus restoration after insertion across different application states
- Test insertion failure recovery and user guidance workflows

**Automated coverage:**
- Unit tests for text insertion service with mocked automation APIs
- Integration tests for focus detection and restoration
- Mock tests for application-specific insertion strategies
- Performance tests for insertion speed and reliability metrics

**Required checks before PR:**
- Text insertion works in 90%+ of tested applications in production builds
- Focus restoration works correctly across different window states
- Clear user feedback provided for both successful and failed insertions
- Fallback mechanisms activate appropriately when primary methods fail
- No text corruption or formatting issues during insertion

## Open Questions

- Should we implement rich text insertion for applications that support it?
- How should we handle insertion in password fields and secure contexts?
- What's the optimal timing strategy for focus restoration vs insertion speed?
- Should we provide insertion preview/confirmation before executing?
- How should we handle insertion conflicts with application auto-complete/suggestions?
- Should we implement undo functionality for accidentally inserted text?