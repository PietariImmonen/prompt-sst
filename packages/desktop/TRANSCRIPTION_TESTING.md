# Transcription Feature Testing - Quick Start

## Step-by-Step Testing Guide

### 1. Setup API Key

First, make sure you have configured your Soniox API key:

```bash
# In the repo root
cd /Users/pietari/prompt-sst-combined

# Set the API key
bunx sst secret set SonioxApiKey "your-actual-soniox-api-key"

# Regenerate desktop environment
bun run --filter @clyo/desktop env:generate

# Verify it's in the .env file
cat packages/desktop/.env | grep SONIOX
```

You should see: `VITE_SONIOX_API_KEY=your-api-key`

### 2. Start the Apps

**Terminal 1 - SST Backend:**

```bash
bun run dev
```

Wait for "SST ready" messages.

**Terminal 2 - Desktop App:**

```bash
bun run --filter @clyo/desktop dev
```

### 3. Navigate to Test Page

Once the desktop app opens:

1. **Log in** with your credentials
2. Click on **"Transcription"** in the left sidebar (microphone icon)
3. You'll see the transcription test page

### 4. Check Status

On the test page, look at the "Service Status" card:

- **API Key**: Should show "✓ Configured" (green)
- **Recording**: Should show "○ Inactive" (gray)

If API Key shows "✗ Not configured" (red):

- Go back to Step 1
- Make sure you ran `bun run --filter @clyo/desktop env:generate`
- Restart the desktop app

### 5. Test Transcription

1. **Click into the text area** (the big textarea that says "Click here and press...")
2. **Press `Cmd+Shift+F`** (on Mac) or `Ctrl+Shift+F` (on Windows/Linux)
3. **Watch the status** change to "● Active" (red)
4. **Speak into your microphone**: "Hello, this is a test"
5. **Watch the text appear** in real-time in the textarea
6. **Press `Cmd+Shift+F` again** or **Esc** to stop

### 6. Check Console Logs

Open the DevTools console (`Cmd+Option+I` or `Ctrl+Shift+I`):

**Look for these logs when you press `Cmd+Shift+F`:**

```
🎙️  Starting transcription...
🔌 Connecting to Soniox WebSocket...
   API Key (first 10 chars): sk_1234567...
   WebSocket object created
🔊 Creating audio capture window...
📱 Creating transcription overlay...
✅ WebSocket connected to Soniox successfully!
🎙️ Requesting microphone access...
✅ Microphone access granted
✅ Audio capture started
✅ Transcription started
```

**When speaking:**

```
📨 Received message from Soniox: {"tokens":[{"text":"hello"...
📝 Received 1 tokens
```

### 7. Troubleshooting

#### No Logs Appear

If you don't see ANY logs when pressing `Cmd+Shift+F`:

- The shortcut might not be registered
- Check main process console (the terminal where you ran the desktop app)
- Look for: `✅ Transcription service enabled (Cmd+Shift+F)`

#### "API key not configured" in Logs

```
❌ Cannot connect: API key not configured
```

**Solution:**

1. Verify the secret is set: `bunx sst secret list`
2. Regenerate env: `bun run --filter @clyo/desktop env:generate`
3. Check `.env` file exists: `cat packages/desktop/.env`
4. Restart desktop app

#### WebSocket Connection Errors

```
❌ WebSocket error: { ... }
   Error details: {...}
```

**Possible causes:**

- Invalid API key
- Network/firewall blocking WebSocket
- Soniox service down

**What to check:**

1. Verify API key is correct (try it in a curl request)
2. Check internet connection
3. Look at the error details for specific error codes

#### Microphone Permission Denied

```
Failed to start audio capture: NotAllowedError
```

**Solution:**

- On Mac: System Settings → Privacy & Security → Microphone → Enable for desktop app
- On Windows: Settings → Privacy → Microphone → Allow

#### No Text Appears

If WebSocket connects but no text appears:

1. Check if your microphone is working (test in another app)
2. Speak louder and more clearly
3. Look for "📨 Received message" logs - if you see them, tokens are coming through
4. Check if text insertion is failing (look for errors about clipboard/robotjs)

## What Success Looks Like

### In the UI:

- Status card shows "✓ Configured" for API Key
- Clicking in textarea and pressing `Cmd+Shift+F` shows red "● Active"
- Spoken words appear immediately in the textarea
- Pressing `Cmd+Shift+F` again stops and shows "○ Inactive"

### In Console Logs:

- Clear connection logs with ✅ checkmarks
- Regular "📨 Received message" logs while speaking
- No ❌ error logs
- Clean shutdown logs when stopping

## Next: Testing in Other Apps

Once the test page works perfectly, you can test in external applications:

1. Open **TextEdit** (Mac) or **Notepad** (Windows)
2. Click into the text area
3. Press `Cmd+Shift+F`
4. Speak - text should appear
5. Press `Cmd+Shift+F` or `Esc` to stop

The advantage of testing in the test page first is that you can see all the status and logs in one place!

## Getting Help

If something isn't working:

1. **Copy all console logs** (from both renderer and main process)
2. **Take a screenshot** of the status card
3. **Note the exact step** where it fails
4. Check the logs for specific error messages to search for
