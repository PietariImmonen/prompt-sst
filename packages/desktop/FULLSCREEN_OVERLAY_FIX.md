# Fullscreen Overlay Fix for Transcription Window

## Problem

The transcription overlay window was appearing on the desktop instead of on top of fullscreen applications. This made it unusable when working in fullscreen mode (Chrome, apps, etc.).

## Root Cause

The transcription overlay was missing critical Electron window configuration that the prompt palette had:

1. **Missing window type**: No `type: 'panel'` on macOS
2. **Missing vibrancy**: No transparency effects for macOS
3. **Wrong window level**: Using basic `alwaysOnTop` instead of `'screen-saver'` level
4. **Missing fullscreen flag**: No `fullscreenable: false`
5. **Missing backgroundThrottling**: Performance optimization not disabled

## Solution

Applied the same proven configuration from `simple-palette-service.ts` to the transcription overlay in `transcription-service.ts`.

### Key Changes

**File**: `packages/desktop/src/main/transcription-service.ts:176-214`

#### Added Window Properties:
```typescript
fullscreenable: false,
type: process.platform === 'darwin' ? 'panel' : undefined,
hasShadow: process.platform !== 'darwin',
vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
webPreferences: {
  // ... existing props
  backgroundThrottling: false  // Added
}
```

#### Enhanced Window Level Configuration:
```typescript
// Platform-specific configuration for proper overlay behavior over fullscreen apps
if (process.platform === 'darwin') {
  // macOS: Set proper window level for appearing over full screen apps
  this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  this.overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1) // Higher level for full screen compatibility
} else {
  // Windows/Linux: Set always on top
  this.overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  this.overlayWindow.setAlwaysOnTop(true, 'screen-saver')
}
```

## What These Settings Do

### `type: 'panel'` (macOS)
- Creates a utility panel window that can appear over fullscreen apps
- Special window type designed for overlays and utilities
- Required for proper fullscreen compatibility on macOS

### `vibrancy: 'under-window'` (macOS)
- Enables native macOS transparency and blur effects
- Makes the window blend naturally with the content beneath
- Provides a native macOS look and feel

### `fullscreenable: false`
- Prevents the overlay from being promoted to fullscreen itself
- Ensures it stays as an overlay window

### `setAlwaysOnTop(true, 'screen-saver', 1)`
- Sets window level to `'screen-saver'` (highest non-system level)
- Level `1` priority ensures it appears above other overlays
- Critical for appearing over fullscreen applications

### `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`
- Makes window visible across all macOS Spaces/Desktops
- `visibleOnFullScreen: true` specifically enables appearing over fullscreen apps
- Essential for cross-workspace functionality

### `backgroundThrottling: false`
- Prevents Chromium from throttling the window when not focused
- Ensures transcription continues processing even when in background
- Critical for real-time transcription performance

## Comparison: Before vs After

### Before (Desktop Level)
```typescript
alwaysOnTop: true,
// No type specified
// No vibrancy
// Basic setVisibleOnAllWorkspaces
```
**Result**: Window appeared on desktop, not over fullscreen apps

### After (Fullscreen Compatible)
```typescript
type: 'panel',
vibrancy: 'under-window',
fullscreenable: false,
setAlwaysOnTop(true, 'screen-saver', 1)
setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
```
**Result**: Window appears over fullscreen apps, just like the prompt palette ✅

## Testing

1. Put Chrome or any app in fullscreen (⌃⌘F on macOS)
2. Press `Cmd+Shift+F` to activate transcription
3. **Expected**: Transcription overlay appears on top of fullscreen app
4. **Previously**: Overlay appeared on desktop (had to exit fullscreen to see it)

## Platform Support

- ✅ **macOS**: Full support with panel type and vibrancy
- ✅ **Windows**: Works with screen-saver level
- ✅ **Linux**: Works with screen-saver level

## Related Files

- `packages/desktop/src/main/transcription-service.ts` - Updated with fullscreen support
- `packages/desktop/src/main/simple-palette-service.ts` - Reference implementation (unchanged)

## Summary

The transcription overlay now behaves identically to the prompt palette, appearing correctly over fullscreen applications on all platforms. This was achieved by applying the same proven window configuration pattern.

**Key Insight**: When creating overlay windows in Electron that need to appear over fullscreen apps, use:
- `type: 'panel'` on macOS
- `setAlwaysOnTop(true, 'screen-saver', 1)` for window level
- `visibleOnFullScreen: true` in workspace options
