# Desktop Production Data Persistence

- ID: 13-desktop-production-data-persistence
- Owner: TBA
- Priority: P0
- Target Release: Immediate hotfix

## Context Snapshot

The desktop application's prompt insertion palette shows no data in production builds because the data connection is lost when the main window is closed. The current architecture relies on the main window's renderer process to maintain Replicache connections and serve data to overlay windows, creating a critical dependency that breaks in production use cases.

This affects the core value proposition of the desktop app as a persistent prompt capture and insertion tool.

## Goals & Non-Goals

**Goals**
- Establish persistent data connection independent of main window state
- Enable prompt insertion palette to access user prompts even when main window is closed
- Implement proper data caching and offline storage for production builds
- Ensure Replicache sync continues running in background for real-time updates
- Fix IPC communication between background services and overlay windows

**Non-Goals**
- Changing the core data models or Replicache schema
- Modifying the web app's data persistence approach
- Adding new authentication requirements or flows

## Dependencies & Risks

**Dependencies**
- Background service architecture from feature 01-desktop-app-production-stability
- Replicache connection management in main process
- IPC message passing between main process and overlay renderer
- Local storage/caching mechanism for offline prompt access

**Risks**
- Data sync conflicts between main window and background service connections
- Memory leaks from persistent Replicache instances
- Authentication token expiry handling in background services
- Race conditions in overlay data requests

**Mitigations**
- Implement singleton Replicache instance management
- Add proper authentication refresh handling in background service
- Use message queuing for overlay data requests to prevent race conditions
- Implement data caching with TTL and fallback mechanisms

## Implementation Blueprint

**Target modules:**
- `packages/desktop/src/main/background-data-service.ts` - New persistent data service
- `packages/desktop/src/main/capture-service.ts` - Update overlay data handling
- `packages/desktop/src/renderer/src/providers/replicache-provider/` - Add background sync coordination
- `packages/desktop/src/main/index.ts` - Initialize background data service

**Data flow changes:**
- Main process maintains single Replicache instance for entire app lifecycle
- Background data service manages authentication state and token refresh
- Overlay windows request data from background service via IPC, not main window
- Cache frequently accessed prompts in main process for instant overlay responses
- Implement offline fallback using local storage for critical prompt data

**UI composition:**
- Overlay windows show loading states while data is being fetched from background
- Error states for when background data service is unavailable
- Sync status indicators in overlay showing real-time connection status

## Strict TODO Checklist

- [ ] Create background data service with persistent Replicache connection
- [ ] Implement IPC handlers for overlay data requests in main process
- [ ] Add authentication token management and refresh in background service
- [ ] Create data caching layer with LRU cache for frequently accessed prompts
- [ ] Update capture service overlay handlers to use background data service
- [ ] Implement offline prompt storage using Electron's built-in storage APIs
- [ ] Add sync status tracking and communication to overlay windows
- [ ] Create singleton pattern for Replicache instance management
- [ ] Add error handling and recovery for background data connection failures
- [ ] Implement data request queuing to prevent race conditions in overlays
- [ ] Add logging and monitoring for background data service health
- [ ] Update overlay prompt loading to show proper loading and error states
- [ ] Add fallback mechanisms when background service is unavailable
- [ ] Test data persistence across app restarts and network disconnections

## Test & QA Plan

**Manual flows:**
- Install built app, authenticate, close main window, open prompt palette → should show all prompts
- Disconnect network, use prompt palette → should show cached prompts
- Restart app while offline → should load previously cached prompts in palette
- Test prompt capture with main window closed → new prompts should appear in palette
- Test real-time sync between multiple desktop instances

**Automated coverage:**
- Unit tests for background data service Replicache management
- Integration tests for IPC data request/response cycles
- Mock tests for offline storage and cache behavior
- Performance tests for overlay data loading times

**Required checks before PR:**
- Built app maintains prompt data access with main window closed
- Overlay shows prompts within 500ms of opening
- Background data service handles authentication refresh automatically
- App works offline with cached prompt data
- No memory leaks during extended background operation

## Open Questions

- Should we implement a local SQLite cache for better offline performance?
- How long should we cache prompts before requiring a fresh sync?
- What's the optimal strategy for handling authentication token expiry in background?
- Should the background service maintain separate Replicache instances per workspace?
- How should we handle data conflicts if user modifies prompts in web app while desktop is offline?