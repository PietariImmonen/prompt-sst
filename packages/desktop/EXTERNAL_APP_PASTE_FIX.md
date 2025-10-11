# External App Paste Fix

## Problem

Text was not being pasted to external applications (Chrome, TextEdit, etc.). Instead, it stayed in the overlay window. The user could see "Hello, hello, hello, hello." in the overlay but it never appeared in the active input field.

## Root Cause

### Issue 1: Focus Management
**File**: `transcription-service.ts:157`

```typescript
this.previousFocusedWindow = BrowserWindow.getFocusedWindow() ?? null
```

**Problem**: `BrowserWindow.getFocusedWindow()` only returns **Electron windows**, not system-wide active applications. When transcribing into Chrome, TextEdit, or any external app, this returns `null`.

**Result**: When trying to paste, there was no window to focus back to, so focus stayed on the overlay or random window, and paste went nowhere.

### Issue 2: Overlay Not Hidden Before Paste
The overlay stayed visible during the paste operation, potentially intercepting or blocking the paste action.

### Issue 3: Immediate Overlay Close
The overlay was set to close 500ms after text insertion started, but the paste operation needs time to complete in the target app.

## Solution

### 1. Hide Overlay Before Pasting
**File**: `transcription-service.ts:304-308`

```typescript
// Hide the overlay window first
if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
  this.overlayWindow.hide()
  console.log('   Hidden overlay window')
}
```

**Why**: Hiding the overlay immediately returns focus to the system's active window (the app you were using before transcription started).

### 2. Handle External Apps Gracefully
**File**: `transcription-service.ts:331-346`

```typescript
// If previousFocusedWindow is an Electron window, focus it
if (this.previousFocusedWindow && !this.previousFocusedWindow.isDestroyed()) {
  try {
    const previousUrl = this.previousFocusedWindow.webContents.getURL()
    if (!previousUrl.includes('#palette')) {
      this.previousFocusedWindow.focus()
      console.log('   Focused Electron window')
    }
  } catch {
    // Ignore errors when focusing previous window
  }
} else {
  // No Electron window to focus - we're pasting to an external app
  // The paste will go to whatever window is active after hiding overlay
  console.log('   No Electron window to focus - pasting to system active window')
}
```

**Why**: When `previousFocusedWindow` is `null`, we know we're pasting to an external app. After hiding the overlay, macOS automatically returns focus to the previously active app, so the paste will go there.

### 3. Increase Wait Times
**File**: `transcription-service.ts:349` & `423`

```typescript
// Wait for focus to settle (increased from 120ms to 150ms)
await new Promise((resolve) => setTimeout(resolve, 150))

// Wait for paste to complete (increased from 200ms to 300ms)
await new Promise((resolve) => setTimeout(resolve, 300))
```

**Why**: External apps need more time to:
- Receive focus after overlay hides
- Process the paste command
- Complete the text insertion

### 4. Immediate Overlay Close After Insertion
**File**: `transcription-service.ts:77-85`

```typescript
try {
  await this.insertText(text)
  console.log('✅ Text insertion complete')
  // Close overlay immediately after insertion (removed 500ms delay)
  this.hideOverlay()
} catch (error) {
  console.error('❌ Failed to insert text:', error)
  this.hideOverlay()
}
```

**Why**: The `insertText()` method already waits for the paste to complete (300ms), so no additional delay is needed.

## New Flow

### Before (Broken):
```
User stops recording
    ↓
Text accumulated in overlay
    ↓
Text sent via IPC
    ↓
Paste attempted (but overlay still has focus)
    ↓
Paste fails or goes to overlay ❌
    ↓
Overlay closes 500ms later
```

### After (Fixed):
```
User stops recording
    ↓
Text accumulated in overlay
    ↓
Text sent via IPC
    ↓
Overlay hidden immediately
    ↓
Focus returns to external app (Chrome, etc.)
    ↓
Wait 150ms for focus to settle
    ↓
Text written to clipboard
    ↓
Cmd+V executed via AppleScript
    ↓
Wait 300ms for paste to complete
    ↓
Clipboard restored
    ↓
Overlay closed ✅
    ↓
Text appears in external app! 🎉
```

## Key Insights

### Electron Window Focus vs System Focus

- **`BrowserWindow.getFocusedWindow()`**: Only tracks Electron windows
- **External apps**: Return `null` - this is expected and correct behavior
- **Solution**: Hide overlay to let system focus return naturally

### Timing Is Critical

Different operations need different wait times:

| Operation | Wait Time | Why |
|-----------|-----------|-----|
| Hide overlay | Immediate | Returns focus ASAP |
| Focus settle | 150ms | macOS needs time to activate app |
| Clipboard ready | 50ms | System clipboard needs time |
| Paste complete | 300ms | Target app needs time to process |
| Clipboard restore | After paste | Avoid interfering with paste |

### Platform-Specific Behavior

**macOS**:
- Uses AppleScript for paste: `keystroke "v" using {command down}`
- Window hiding returns focus to previous app automatically
- Panel-type windows handle focus correctly

**Windows/Linux**:
- Use PowerShell/xdotool respectively
- Similar focus behavior but may need adjustment

## Expected Console Output

### Successful Paste to External App:
```
⏹️  Stopping transcription...
✅ Transcription stopped
✅ Overlay: Transcription finished
📝 Accumulating 4 final tokens
  + Token: "Hello, "
  + Token: "hello, "
  + Token: "hello, "
  + Token: "hello."
📊 Current accumulated text length: 28 chars
📤 Sending complete transcription for insertion: Hello, hello, hello, hello.
💉 Inserting text: Hello, hello, hello, hello.
   Paste method: applescript
🎯 Focusing original target...
   Hidden overlay window
   No Electron window to focus - pasting to system active window
   Saved clipboard
   Text written to clipboard
   Attempting paste with AppleScript...
   ✅ Executed Cmd+V via AppleScript
   Restored previous clipboard
✅ Text insertion complete
👋 Hiding overlay window
```

## Testing Scenarios

### Test 1: Chrome Browser
1. Open Chrome, focus on a text input
2. Press `Cmd+Shift+F`
3. Speak: "Hello, hello, hello, hello."
4. Press `Cmd+Shift+F` to stop
5. **Expected**: Text appears in Chrome input ✅

### Test 2: TextEdit
1. Open TextEdit, create new document
2. Press `Cmd+Shift+F`
3. Speak: "This is a test"
4. Press `Cmd+Shift+F` to stop
5. **Expected**: Text appears in TextEdit ✅

### Test 3: VS Code
1. Open VS Code, focus on editor
2. Press `Cmd+Shift+F`
3. Speak code or text
4. Press `Cmd+Shift+F` to stop
5. **Expected**: Text appears in editor ✅

### Test 4: Slack
1. Open Slack, focus on message input
2. Press `Cmd+Shift+F`
3. Speak your message
4. Press `Cmd+Shift+F` to stop
5. **Expected**: Text appears in Slack ✅

## Files Modified

1. **`packages/desktop/src/main/transcription-service.ts`**
   - `focusOriginalTarget()`: Hide overlay first, handle external apps gracefully
   - IPC handler: Remove 500ms delay, close immediately after insertion
   - Wait times: Increased for better external app compatibility

## Summary

The paste now works correctly with external applications by:

1. ✅ **Hiding overlay immediately** to return focus
2. ✅ **Handling null previousFocusedWindow** gracefully
3. ✅ **Waiting for focus to settle** before pasting
4. ✅ **Allowing paste to complete** before restoring clipboard
5. ✅ **Closing overlay after insertion** without extra delays

Text now appears in **any application** you were using when you started transcription! 🎤→📝
