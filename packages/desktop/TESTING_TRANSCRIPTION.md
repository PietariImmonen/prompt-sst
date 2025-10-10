# Transcription Feature Testing Guide

This document provides step-by-step instructions for testing the universal transcription tool.

## Prerequisites

Before testing, ensure:

1. **Dependencies installed**:

   ```bash
   cd /Users/pietari/prompt-sst-combined
   bun install
   ```

2. **Soniox API key configured**:

   ```bash
   bunx sst secret set SonioxApiKey "your-actual-api-key"
   ```

3. **Environment generated**:

   ```bash
   bun run --filter @clyo/desktop env:generate
   ```

4. **Verify environment file**:
   ```bash
   cat packages/desktop/.env | grep SONIOX
   # Should show: VITE_SONIOX_API_KEY=your-key
   ```

## Starting the App

### Terminal 1: SST Backend

```bash
cd /Users/pietari/prompt-sst-combined
bun run dev
```

Wait until you see "SST ready" messages.

### Terminal 2: Desktop App

```bash
cd /Users/pietari/prompt-sst-combined
bun run --filter @clyo/desktop dev
```

Watch the console for:

```
✅ Transcription service enabled (Cmd+Shift+T)
```

If you see:

```
⚠️ Transcription service disabled (no API key configured)
```

Then the API key is not properly configured - go back to Prerequisites.

## Test Cases

### Test 1: Basic Functionality

1. **Open a text editor** (TextEdit, Notes, VS Code, etc.)
2. **Click into a text field**
3. **Press `Cmd+Shift+T`** (macOS) or `Ctrl+Shift+T`\*\* (Windows/Linux)
4. **Expected**:
   - Small overlay window appears near your cursor
   - Status shows "Connecting..." then "Listening"
   - Red pulsing microphone icon visible
5. **Speak a sentence**: "Hello, this is a test of the transcription feature."
6. **Expected**:
   - Words appear in the text field as you speak
   - Overlay shows preview of last few words
7. **Press `Cmd+Shift+T` again** to stop
8. **Expected**:
   - Status changes to "Finalizing..."
   - Overlay disappears after ~1 second
   - All text is in the field

**✅ Pass Criteria**: Text appears in real-time, overlay shows correct status, text is complete after stop.

### Test 2: Alternative Stop Methods

1. **Start transcription** in a text field
2. **Speak a sentence**
3. **Press `Esc` key**
4. **Expected**: Transcription stops, text inserted
5. **Start again**
6. **Click the X button** in overlay
7. **Expected**: Transcription stops, text inserted

**✅ Pass Criteria**: Both Esc and stop button successfully stop and insert text.

### Test 3: Multiple Applications

Test transcription in each of these:

- [ ] Web browser (Chrome/Firefox address bar or text field)
- [ ] Text editor (VS Code, Sublime, TextEdit, Notepad)
- [ ] Slack or Discord chat input
- [ ] Email client (Mail, Outlook)
- [ ] Terminal (if it accepts paste input)
- [ ] Any other commonly used app

**✅ Pass Criteria**: Transcription works in all tested applications.

### Test 4: Background App Behavior

1. **Start transcription**
2. **Minimize the desktop app** (Cmd+H or minimize to tray)
3. **Speak into another application**
4. **Expected**: Transcription continues working
5. **Stop transcription**
6. **Expected**: Text is inserted correctly

**✅ Pass Criteria**: Transcription works when desktop app is in background.

### Test 5: Microphone Permission

1. **Quit the desktop app**
2. **Revoke microphone permission**:
   - macOS: System Settings → Privacy & Security → Microphone → Remove desktop app
   - Windows: Settings → Privacy → Microphone → Disable
3. **Start the app again**
4. **Try to start transcription**
5. **Expected**:
   - Permission dialog appears (first time)
   - Or error logged in console if denied
   - Overlay shows error state if permission denied

**✅ Pass Criteria**: Graceful handling of permission denial, clear error message.

### Test 6: No API Key

1. **Remove API key from environment**:
   ```bash
   # Edit packages/desktop/.env and remove VITE_SONIOX_API_KEY
   ```
2. **Restart desktop app**
3. **Check console output**
4. **Expected**:
   ```
   ⚠️ Soniox API key not configured - transcription feature disabled
   ```
5. **Try pressing `Cmd+Shift+T`**
6. **Expected**: Nothing happens (feature disabled)

**✅ Pass Criteria**: Feature cleanly disabled without errors when API key missing.

### Test 7: Network Disconnection

1. **Start transcription**
2. **Speak for 2-3 seconds**
3. **Disconnect network** (WiFi off or unplug ethernet)
4. **Expected**:
   - WebSocket connection lost
   - Console shows reconnection attempts
   - After 3 failed attempts, error state
5. **Reconnect network**
6. **Try transcription again**
7. **Expected**: Works normally

**✅ Pass Criteria**: Automatic reconnection attempts, graceful failure, recovery after reconnection.

### Test 8: Rapid Toggle

1. **Press `Cmd+Shift+T` quickly 5 times** (rapid on/off)
2. **Expected**: No crashes, clean start/stop each time
3. **Start transcription**
4. **Speak briefly**
5. **Stop immediately**
6. **Repeat 3 times**
7. **Expected**: All text inserted correctly, no leftover overlays

**✅ Pass Criteria**: Stable behavior with rapid toggling, no resource leaks.

### Test 9: Long Transcription

1. **Start transcription**
2. **Speak continuously for 30 seconds** (read a paragraph)
3. **Expected**:
   - Text streams throughout
   - No connection dropouts
   - Overlay preview updates
4. **Stop transcription**
5. **Expected**: All text present and accurate

**✅ Pass Criteria**: Handles long transcription sessions without issues.

### Test 10: Full-Screen Apps

1. **Open an app in full-screen** (browser, video player, etc.)
2. **Focus a text input in that app**
3. **Start transcription**
4. **Expected**: Overlay appears ABOVE full-screen app (on macOS especially)
5. **Speak and verify text insertion**

**✅ Pass Criteria**: Overlay visible above full-screen apps, text inserts correctly.

## Performance Checks

### Latency Measurement

1. **Start transcription**
2. **Speak a single word clearly**
3. **Measure time from end of word to appearance** in text field
4. **Expected**: < 500ms typically

### Memory Usage

1. **Check app memory** before transcription
2. **Start transcription and speak for 1 minute**
3. **Stop transcription**
4. **Check memory again**
5. **Expected**: Increase of ~50-100MB while active, drops after stop

### CPU Usage

1. **Monitor CPU** (Activity Monitor / Task Manager)
2. **Start transcription**
3. **Speak continuously for 30 seconds**
4. **Expected**: CPU usage < 10% on modern systems

## Error Scenarios

### Invalid API Key

1. **Set a fake API key**: `VITE_SONIOX_API_KEY=invalid-key-12345`
2. **Restart app**
3. **Try transcription**
4. **Expected**: Connection error, clear message in console/overlay

### Microphone In Use

1. **Start another app** using microphone (Zoom, etc.)
2. **Try to start transcription**
3. **Expected**: May fail or share microphone, should not crash

### Out of Focus

1. **Start transcription**
2. **Click outside text field** (onto desktop, etc.)
3. **Speak**
4. **Expected**: Text may go nowhere or into focused field (depends on system)

## Cleanup After Testing

1. **Quit desktop app** properly (not force quit)
2. **Check for leftover processes**:
   ```bash
   ps aux | grep electron
   # Should show no lingering processes
   ```
3. **Check for leftover windows** (Activity Monitor → Windows)

## Reporting Issues

When reporting issues, include:

1. **OS and version** (e.g., macOS 14.2, Windows 11)
2. **Desktop app version** (from About dialog)
3. **Console logs** (from both main and renderer processes)
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Screenshots** (especially of overlay UI issues)

## Known Issues

Currently none - first implementation.

## Success Criteria Summary

All tests should pass for production readiness:

- [x] Basic start/stop functionality
- [x] Alternative stop methods (Esc, button)
- [x] Works across multiple applications
- [x] Functions when app in background
- [x] Graceful permission handling
- [x] Clean behavior with no API key
- [x] Network disconnection recovery
- [x] Stable rapid toggling
- [x] Long transcription sessions
- [x] Full-screen app compatibility
- [x] Acceptable performance (latency, memory, CPU)
- [x] Proper error handling
- [x] Clean shutdown and cleanup

## Next Steps After Testing

If all tests pass:

1. **Update plan with test results**
2. **Document any edge cases discovered**
3. **Prepare for beta user testing**
4. **Monitor production logs for issues**
5. **Gather user feedback for improvements**
