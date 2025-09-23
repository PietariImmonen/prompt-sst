# Desktop Production Capture Reliability

- ID: 14-desktop-production-capture-reliability
- Owner: TBA
- Priority: P0
- Target Release: Immediate hotfix

## Context Snapshot

The desktop application's prompt capture functionality fails completely in production builds due to several critical issues:
- Global shortcuts are not properly registered in built applications
- Text selection detection fails due to security restrictions in packaged apps
- Clipboard operations don't work reliably in production security contexts
- Native system automation requires proper entitlements and permissions in built apps

This renders the core prompt capture functionality completely non-functional in production, making the desktop app unable to fulfill its primary purpose.

## Goals & Non-Goals

**Goals**
- Fix global shortcut registration to work in production builds with proper entitlements
- Implement reliable text selection detection that works in packaged applications
- Ensure clipboard operations work correctly across all security contexts
- Add proper macOS/Windows/Linux permissions and entitlements for system automation
- Implement fallback capture methods when automated detection fails
- Add user feedback and error reporting for capture failures

**Non-Goals**
- Changing the capture workflow or keyboard shortcuts
- Modifying the capture UI or prompt editing experience
- Adding new capture sources or integration methods

## Dependencies & Risks

**Dependencies**
- Platform-specific entitlements and permissions configuration
- Native system automation APIs (AppleScript, Windows SendKeys, Linux xdotool)
- Electron security policies for packaged applications
- Code signing and notarization for macOS builds

**Risks**
- Platform security restrictions preventing automation in some environments
- Antivirus software blocking system automation features
- Breaking existing development mode capture functionality
- User privacy concerns with system automation permissions

**Mitigations**
- Implement progressive permission requesting with clear user explanations
- Add comprehensive error handling and user guidance for permission issues
- Maintain development mode compatibility during refactoring
- Provide manual capture fallbacks when automation fails

## Implementation Blueprint

**Target modules:**
- `packages/desktop/src/main/capture-service.ts` - Core capture reliability fixes
- `packages/desktop/electron-builder.config.js` - Build configuration with proper entitlements
- `packages/desktop/build/` - Platform-specific entitlement files
- `packages/desktop/src/main/permissions-service.ts` - New permission management service

**Data flow changes:**
- Add permission checking before attempting system automation
- Implement retry logic for failed capture attempts
- Add user notification system for permission requirements
- Create fallback capture methods using different system APIs
- Implement proper error reporting and diagnostics

**UI composition:**
- Permission request dialogs with clear explanations
- Capture status indicators showing success/failure reasons
- Settings panel for managing capture permissions and methods
- Diagnostic tools for troubleshooting capture issues

## Strict TODO Checklist

- [ ] Add macOS entitlements for accessibility and automation permissions
- [ ] Configure Windows manifest for automation and clipboard access
- [ ] Add Linux desktop files and permission declarations
- [ ] Implement permission checking service for system automation capabilities
- [ ] Add retry logic and fallback methods for failed capture attempts
- [ ] Fix global shortcut registration to work in production security contexts
- [ ] Implement reliable clipboard access with proper error handling
- [ ] Add AppleScript compilation and execution for macOS text automation
- [ ] Configure Windows PowerShell execution policies for SendKeys
- [ ] Add xdotool detection and alternative Linux automation methods
- [ ] Implement capture diagnostics and logging for troubleshooting
- [ ] Add user notification system for permission requirements and failures
- [ ] Create settings panel for capture method selection and troubleshooting
- [ ] Add comprehensive error handling with user-friendly messages
- [ ] Test capture functionality on fresh OS installations without dev tools
- [ ] Implement capture method detection and automatic fallback selection
- [ ] Add capture performance monitoring and optimization
- [ ] Create user documentation for permission setup on each platform

## Test & QA Plan

**Manual flows:**
- Fresh macOS install → install .dmg → test capture works with accessibility permissions
- Fresh Windows install → install .exe → test capture works with UAC and antivirus
- Fresh Linux install → install .AppImage/.deb → test capture with various window managers
- Test capture in various applications (browsers, text editors, IDEs, messaging apps)
- Test capture failure recovery and user guidance workflows
- Test capture settings and method selection functionality

**Automated coverage:**
- Unit tests for permission detection and validation
- Mock tests for platform-specific automation APIs
- Integration tests for capture retry and fallback mechanisms
- Performance tests for capture speed and reliability

**Required checks before PR:**
- Built apps successfully capture text on fresh OS installations
- Global shortcuts work in production builds on all platforms
- Proper error messages and guidance when permissions are missing
- Capture works in at least 95% of common application types
- No false positives or crashes in capture detection logic

## Open Questions

- Should we implement OCR fallback for applications that don't support text selection?
- How should we handle capture in secure/protected applications (password managers, etc.)?
- What's the best user experience for initial permission setup during first launch?
- Should we provide different capture methods for power users vs casual users?
- How should we handle capture conflicts with other automation tools?
- Should we implement screenshot-based capture as an ultimate fallback?