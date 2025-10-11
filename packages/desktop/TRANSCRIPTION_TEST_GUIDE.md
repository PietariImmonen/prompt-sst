# Transcription Testing Guide

## Current Status

✅ **Soniox SDK integrated** - Using official `@soniox/speech-to-text-web` package  
✅ **Console logging enabled** - Detailed logs for debugging  
⚠️ **robotjs not available** - Using clipboard-only mode (manual paste required)

## How to Test

### Step 1: Open the App Console

1. The desktop app should be running
2. In the app, press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux) to open DevTools
3. Go to the **Console** tab

### Step 2: Test from Transcription Test Page

1. Navigate to **Transcription Test** page (Mic icon in sidebar)
2. You'll see the test interface with status info
3. Click **"Start Recording"** button OR press `Cmd+Shift+F`

### Step 3: Watch the Console Logs

You should see:

```
🔑 Initializing Soniox client with API key: c476482a47...
✅ Soniox client initialized
🎙️ Starting Soniox transcription...
✅ Soniox transcription started successfully
```

### Step 4: Speak Into Your Microphone

Say something like: **"Hello world, this is a test"**

Watch the console for:

```
📨 ========== SONIOX RESPONSE ==========
📨 Full result object: {
  "tokens": [
    {
      "text": "Hello",
      "is_final": false
    }
  ]
}
📨 Number of tokens: 1
🔍 Token details: { text: "Hello", is_final: false, ... }
⏸️  Non-final token: Hello
📊 Current state:
   Final text so far:
   Preview text: Hello
   Display preview: Hello
==========================================
```

Then when a word is finalized:

```
✅ FINAL TOKEN: Hello
📤 Sending token to main for insertion: Hello
💉 Inserting text: Hello
```

### Step 5: Test Text Insertion

**Since robotjs is not available**, the text will be copied to your clipboard but NOT automatically pasted.

To verify it works:

1. Have a text field open (TextEdit, Notes, browser, etc.)
2. Start transcription with `Cmd+Shift+F`
3. Speak into microphone
4. When you see "💉 Inserting text: ..." in console
5. **Manually press `Cmd+V`** to paste
6. The transcribed text should appear!

### Step 6: Stop Transcription

Stop by:

- Pressing `Cmd+Shift+F` again, OR
- Pressing `Esc`, OR
- Clicking the stop button (X) in the overlay

You should see:

```
🛑 Stopping Soniox transcription...
✅ Soniox transcription finished
```

## Expected Behavior

### ✅ What Should Work

- SDK initializes with API key
- Microphone permission requested (first time)
- Audio captured and sent to Soniox
- Tokens received from Soniox (logged to console)
- Non-final tokens show in preview (gray/blue text)
- Final tokens sent to main process for insertion
- Text copied to clipboard
- Overlay shows status (Listening, Recording, etc.)

### ⚠️ Known Limitations

- **Manual paste required**: You must press `Cmd+V` after each final token
- **robotjs unavailable**: Native keyboard simulation doesn't work in dev mode

### ❌ What Might Fail

- **No logs at all** → SDK not initializing, check API key in `.env`
- **"Permission denied"** → Allow microphone access in System Settings
- **"WebSocket error"** → Check internet connection or API key validity
- **No tokens received** → Speak louder or check microphone is working

## Debugging Tips

### If you see NO console logs after pressing Cmd+Shift+F:

1. Check if overlay window appears (small black box in top-right)
2. If no overlay → shortcut might not be registered
3. Try using the "Start Recording" button in the test page instead

### If you see "API key not configured":

1. Check `/Users/pietari/prompt-sst-combined/packages/desktop/.env`
2. Verify `VITE_SONIOX_API_KEY=c476482a47b7e22b2de7629562deb30ed4ccc73d692eb06199b466b156e7ae56`
3. Restart the app if you just added it

### If you see "Permission denied" for microphone:

1. Go to **System Settings** → **Privacy & Security** → **Microphone**
2. Enable access for "Electron" or your app name
3. Restart the app

### If you see WebSocket errors:

1. Check your internet connection
2. Verify the API key is valid (try in Soniox console)
3. Check if Soniox service is up: https://soniox.com

## What to Report

Please share:

1. **All console logs** from when you press start until you stop
2. **Any error messages** (red text in console)
3. **Whether tokens appear** (📨 SONIOX RESPONSE logs)
4. **Whether final tokens are detected** (✅ FINAL TOKEN logs)
5. **Whether text is in clipboard** (try `Cmd+V` in a text field)

## Success Criteria

✅ Console shows Soniox responses with tokens  
✅ Non-final tokens show in overlay preview  
✅ Final tokens sent to main process  
✅ Text appears in clipboard (verify with `Cmd+V`)  
✅ Overlay shows "Listening" status  
✅ Stop command works

The ONLY missing piece should be **automatic paste** - you'll need to press `Cmd+V` manually until we fix robotjs.
