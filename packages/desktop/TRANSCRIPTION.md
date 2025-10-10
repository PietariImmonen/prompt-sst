# Universal Transcription Tool

The desktop app includes a universal transcription feature that allows you to dictate text into any application using voice input.

## Features

- **Global Hotkey**: Activate transcription anywhere with `Cmd+Shift+T` (macOS) or `Ctrl+Shift+T` (Windows/Linux)
- **Real-time Streaming**: Transcribed text appears as you speak, streaming directly into the active input field
- **Visual Feedback**: Floating overlay shows transcription status and preview of recent words
- **Multiple Stop Methods**: Stop transcription via hotkey, Esc key, or clicking the stop button
- **Background Support**: Works even when the desktop app is minimized or in the background
- **Privacy First**: No audio data is stored; transcription is processed in real-time only

## Setup

### 1. Configure Soniox API Key

The transcription feature requires a Soniox API key. Add it to your SST secrets:

```bash
# Set the secret in your SST environment
bunx sst secret set SonioxApiKey "your-soniox-api-key-here"
```

### 2. Generate Environment Variables

After setting the secret, regenerate the desktop environment file:

```bash
bun run --filter @clyo/desktop env:generate
```

This will create/update `packages/desktop/.env` with `VITE_SONIOX_API_KEY`.

### 3. Install Dependencies

If you haven't already, install the desktop app dependencies:

```bash
bun install
```

### 4. Development

Start the desktop app in development mode:

```bash
# Start SST backend
bun run dev

# In another terminal, start desktop app
bun run --filter @clyo/desktop dev
```

## Usage

### Starting Transcription

1. Click into any text input field (browser, text editor, Slack, etc.)
2. Press `Cmd+Shift+T` (macOS) or `Ctrl+Shift+T` (Windows/Linux)
3. A small overlay window appears showing transcription status
4. Start speaking - your words will appear in real-time in the active field

### Stopping Transcription

You can stop transcription in three ways:

- Press `Cmd+Shift+T` / `Ctrl+Shift+T` again
- Press the `Esc` key
- Click the stop button (X) in the overlay window

When you stop, any remaining transcription is finalized and inserted.

## Technical Details

### Architecture

The transcription system consists of several components:

1. **TranscriptionService** (`src/main/transcription-service.ts`)

   - Manages WebSocket connection to Soniox API
   - Handles audio streaming and token processing
   - Coordinates overlay and audio capture windows
   - Implements text insertion via clipboard + keyboard simulation

2. **Audio Capture Window** (`src/renderer/src/pages/audio-capture.tsx`)

   - Hidden window that captures microphone input
   - Uses Web Audio API to process audio into PCM format
   - Streams 16kHz mono 16-bit audio to main process

3. **Overlay Window** (`src/renderer/src/pages/transcription-overlay.tsx`)
   - Small floating window positioned near cursor
   - Shows real-time transcription preview
   - Provides stop button and visual status indicators

### Audio Format

- **Sample Rate**: 16kHz
- **Channels**: Mono
- **Bit Depth**: 16-bit PCM
- **Processing**: Uses ScriptProcessorNode for chunking (TODO: migrate to AudioWorklet)

### Text Insertion

Text is inserted using a clipboard-based approach for cross-platform compatibility:

1. Store current clipboard content
2. Write transcribed text to clipboard
3. Simulate `Cmd+V` / `Ctrl+V` using `robotjs`
4. Restore previous clipboard content

**Fallback Mode**: If `robotjs` is not available (compilation issues), the text remains in the clipboard for manual paste (Cmd+V).

This approach works across all applications without requiring accessibility permissions.

## Troubleshooting

### Microphone Permission Denied

If you see a microphone permission error:

- **macOS**: Go to System Settings → Privacy & Security → Microphone and enable access for the desktop app
- **Windows**: Go to Settings → Privacy → Microphone and enable access
- **Linux**: Ensure your audio system (PulseAudio/PipeWire) is configured correctly

### No API Key Configured

If the transcription feature is disabled:

1. Verify the Soniox API key is set in SST secrets: `bunx sst secret list`
2. Regenerate environment file: `bun run --filter @clyo/desktop env:generate`
3. Check `packages/desktop/.env` contains `VITE_SONIOX_API_KEY`
4. Restart the desktop app

### Text Not Inserting

If transcribed text doesn't appear in the target application:

- Ensure the target application's input field has focus
- Try clicking in the input field again before starting transcription
- Some applications may block automated keyboard input (security software, VMs)
- Check console logs for insertion errors
- If you see "robotjs not available", the text will be in your clipboard - manually press Cmd+V to paste

### Overlay Not Appearing

If the overlay window doesn't show:

- Check if another shortcut is conflicting with `Cmd+Shift+T`
- Look for overlay window errors in the console
- On macOS, ensure the app can display windows above full-screen apps

## Performance

- **Latency**: Typically <500ms from speech to text appearance
- **Memory**: ~50-100MB additional when actively transcribing
- **CPU**: Minimal impact; audio processing is lightweight
- **Network**: Constant WebSocket connection while recording (~16KB/s upload)

## Limitations

### Current MVP Scope

- Single language support (system default)
- No custom vocabulary or domain-specific training
- No offline mode (requires internet connection)
- No transcription history or playback

### Future Enhancements

- [ ] Language selection in settings panel
- [ ] Custom vocabulary for improved accuracy
- [ ] Voice commands (e.g., "new paragraph", "delete last sentence")
- [ ] Transcription history with re-insertion capability
- [ ] Configurable hotkeys
- [ ] Offline mode using local Whisper model
- [ ] Migrate to AudioWorklet for better performance

## Development

### Adding Features

The transcription service is modular and can be extended:

- Modify `TranscriptionService` for WebSocket protocol changes
- Update `audio-capture.tsx` for audio processing improvements
- Customize `transcription-overlay.tsx` for UI enhancements

### Testing

Manual testing checklist:

- [ ] Start/stop via `Cmd+Shift+T` in various apps
- [ ] Verify text streams in real-time
- [ ] Test Esc key to stop
- [ ] Test overlay stop button
- [ ] Try with microphone permission denied
- [ ] Test with invalid/missing API key
- [ ] Test during network disconnection
- [ ] Verify clipboard restoration after insertion

### Debugging

Enable verbose logging by checking the main process console:

```bash
# The desktop app logs all transcription events
# Look for messages starting with 🎙️ 🛑 ✅ ❌
```

## Security & Privacy

- **No Audio Storage**: Audio is streamed to Soniox and not saved locally or remotely
- **Clipboard Protection**: Previous clipboard content is restored after text insertion
- **API Key Security**: Stored in SST secrets, injected as environment variable
- **Permissions**: Only requires microphone access; no accessibility permissions needed

## License

Part of the Clyo Desktop application. See main LICENSE file.
