# robotjs Fallback Mode

## Current Status

The `robotjs` package is currently not building with our Electron version (33.4.11) due to ABI compatibility issues. This is a known issue with robotjs and newer Electron versions.

## Impact

The transcription service is designed to work in **clipboard-only fallback mode**:

### What Works:
✅ Soniox SDK captures audio and transcribes  
✅ Transcribed text is placed in clipboard  
✅ User can manually paste with `Cmd+V` / `Ctrl+V`  
✅ Overlay shows transcription status and preview  

### What Doesn't Work:
❌ Automatic paste (simulating Cmd+V keypress)

## User Experience in Fallback Mode

1. User presses `Cmd+Shift+F` to start transcription
2. Overlay appears showing "Listening..."
3. User speaks into microphone
4. Text preview appears in overlay
5. **When transcription finishes:**
   - Text is automatically copied to clipboard
   - User needs to manually press `Cmd+V` to paste
   - ⚠️ Warning message could be shown in overlay

## Solutions

### Option 1: Use Alternative Library (Recommended)
Replace `robotjs` with a more modern alternative:
- `@jitsi/robotjs` - Actively maintained fork
- `nut-js/nut-js` - Cross-platform automation (MIT license)
- `uiohook-napi` - Native keyboard hooks

### Option 2: Use Electron's Built-in Methods
Electron 28+ has `globalShortcut.registerAll()` but doesn't have native key simulation.
We could use:
```typescript
import { systemPreferences } from 'electron'
// Request accessibility permissions
// Use CGEvent on macOS, SendInput on Windows
```

### Option 3: Platform-Specific Solutions
- **macOS**: AppleScript via `child_process.exec()`
  ```typescript
  exec('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using {command down}"')
  ```
- **Windows**: PowerShell SendKeys
- **Linux**: xdotool

### Option 4: Accept Clipboard-Only for MVP
Since transcription still works and users can manually paste, this is acceptable for initial release.

## Recommendation

For MVP: **Accept clipboard-only mode** and add a note in the overlay UI:
```
"Transcription complete! Press Cmd+V to paste"
```

For production: Switch to `nut-js` or implement platform-specific solutions.

## Testing the Current Implementation

1. Press `Cmd+Shift+F` anywhere
2. Speak into microphone
3. See preview in overlay
4. Press `Cmd+Shift+F` or `Esc` to stop
5. **Manually press `Cmd+V` to paste** the transcribed text

The system still provides value - it's just one extra manual step.

