# Desktop App Production Stability

- ID: 01-desktop-app-production-stability
- Owner: TBA
- Priority: P0
- Target Release: Immediate hotfix

## Context Snapshot

The desktop application (.dmg build) has critical production issues preventing it from working as a persistent tool:

- App cannot reopen after being closed in production builds
- Prompt insertion palette shows no data when main window is closed
- Highlighted text capturing fails completely in built versions
- Automatic text insertion into other applications doesn't work

These issues stem from the current architecture where the main window controls the entire app lifecycle, causing the capture service and data connections to terminate when users close the main window.

## Goals & Non-Goals

**Goals**

- Transform app into a persistent menu bar/system tray application that runs continuously
- Maintain data connections and capture functionality even when main window is closed
- Enable proper app reopening from menu bar/dock after closing main window
- Ensure prompt insertion palette always has access to user's prompt data
- Fix text capture and insertion functionality in production builds

**Non-Goals**

- Redesigning the core UI or adding new features
- Changing the authentication or data sync mechanisms
- Modifying the development mode experience significantly

## Dependencies & Risks

**Dependencies**

- Electron's Tray API for system tray functionality
- Main process architecture changes to support persistent background service
- Replicache connection management for background data sync

**Risks**

- Breaking existing development workflow during refactor
- Platform-specific behavior differences (macOS vs Windows/Linux)
- Memory leaks from persistent background processes
- User confusion about app state (running but not visible)

**Mitigations**

- Implement feature flags to toggle between old and new architecture during development
- Add clear visual indicators in system tray for app status
- Implement proper cleanup and memory management for background services
- Comprehensive testing on all target platforms

## Implementation Blueprint

**Target modules:**

- `packages/desktop/src/main/index.ts` - Main process lifecycle management
- `packages/desktop/src/main/capture-service.ts` - Background service independence
- `packages/desktop/src/main/tray-service.ts` - New system tray service
- `packages/desktop/src/main/background-data-service.ts` - New persistent data service

**Data flow changes:**

- Decouple capture service from main window dependency
- Create persistent background data service that maintains Replicache connection
- System tray manages app visibility state and provides quick access menu
- Main window becomes optional/on-demand rather than required for app functionality

**UI composition:**

- System tray icon with context menu (show/hide, settings, quit)
- Main window can be closed without terminating app
- Prompt insertion palette connects to background data service instead of main window
- Status indicators in tray for capture service state and data sync status

## Strict TODO Checklist

- [ ] Create system tray service with persistent icon and context menu
- [ ] Implement background data service that maintains Replicache connection independently
- [ ] Refactor capture service to work without main window dependency
- [ ] Update main process lifecycle to prevent quit when main window closes
- [ ] Modify prompt insertion palette to connect to background data service
- [ ] Add proper app state management for show/hide main window functionality
- [ ] Implement platform-specific tray behavior (macOS dock integration, Windows system tray)
- [ ] Add memory management and cleanup for persistent background services
- [ ] Update capture service registration to work in production build environments
- [ ] Fix text insertion mechanism to work with built app security contexts
- [ ] Add tray menu items for quick access to capture settings and app preferences
- [ ] Implement proper error handling and recovery for background services
- [ ] Add logging and diagnostics for production debugging
- [ ] Test all functionality in built .dmg/.exe versions on target platforms

## Test & QA Plan

**Manual flows:**

- Install built app, close main window, verify app continues running in tray
- Test prompt capture hotkey works with main window closed
- Verify prompt insertion palette loads data when main window is closed
- Test automatic text insertion into various applications (browsers, text editors)
- Verify app can be reopened from tray/dock after closing main window
- Test all functionality across macOS, Windows, and Linux built versions

**Automated coverage:**

- Unit tests for background service lifecycle management
- Integration tests for tray service and main window coordination
- Mock tests for platform-specific capture and insertion mechanisms

**Required checks before PR:**

- `bun run --filter @prompt-saver/desktop build` succeeds
- `bun run --filter @prompt-saver/desktop typecheck` passes
- Manual testing on built .dmg/.exe versions confirms all functionality works
- Memory leak testing for 24+ hour continuous operation
- Cross-platform testing on all target operating systems

## Open Questions

- Should the main window auto-minimize to tray on close, or actually hide completely?
- What should the tray context menu contain for optimal user experience?
- How should we handle authentication flows when main window is not visible?
- Should there be a setting to control whether app runs in background vs traditional mode?
- What's the best strategy for migrating existing users to the new persistent model?
