# Transcription Feature Refactoring

## Overview

Refactored the universal transcription tool to use the official **`@soniox/speech-to-text-web`** SDK instead of manual WebSocket implementation. This significantly simplifies the codebase and improves reliability.

## Why the Refactor?

### Before (Manual Implementation)

- ❌ Main process managed WebSocket connection
- ❌ Hidden renderer window for audio capture with Web Audio API
- ❌ Manual PCM conversion (float32 → int16)
- ❌ IPC communication to send audio chunks from renderer → main → Soniox
- ❌ Complex error handling and reconnection logic
- ❌ ~700 lines of transcription-service.ts code

### After (SDK Implementation)

- ✅ Renderer uses `SonioxClient` directly
- ✅ SDK handles mic access, audio processing, WebSocket, and tokens automatically
- ✅ Main process only handles: global shortcut + text insertion via robotjs
- ✅ Cleaner separation of concerns
- ✅ ~230 lines of transcription-service.ts code
- ✅ Better error messages from Soniox SDK
- ✅ Maintained by Soniox team

## New Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TranscriptionService                              │    │
│  │  - Register Cmd+Shift+F shortcut                  │    │
│  │  - Show/hide overlay window                       │    │
│  │  - Insert text via robotjs + clipboard           │    │
│  └────────────────────────────────────────────────────┘    │
│                         ▲                                   │
│                         │ IPC: insert-text                  │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                      Renderer (Overlay Window)              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TranscriptionOverlayPage                          │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  @soniox/speech-to-text-web SDK              │ │    │
│  │  │  - Captures microphone audio                 │ │    │
│  │  │  - Manages WebSocket to Soniox API          │ │    │
│  │  │  - Processes tokens (final/non-final)       │ │    │
│  │  │  - Handles all audio/network complexity     │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │  - Shows status (connecting/recording/error)      │    │
│  │  - Displays preview text (last 5 words)           │    │
│  │  - Sends final tokens to main for insertion       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          ▼
                 ┌────────────────┐
                 │  Soniox API    │
                 │  (Cloud)       │
                 └────────────────┘
```

## Key Changes

### 1. Removed Files

- `packages/desktop/src/renderer/src/pages/audio-capture.tsx` - No longer needed, SDK handles it

### 2. Simplified Files

#### `transcription-service.ts` (Main Process)

**Before:** 679 lines with WebSocket, audio processing, token handling  
**After:** ~230 lines with just shortcut registration and text insertion

Key responsibilities:

- Register `Cmd+Shift+F` / `Ctrl+Shift+F` global shortcut
- Create and position overlay window near cursor
- Handle IPC for text insertion
- Insert text using robotjs + clipboard

#### `transcription-overlay.tsx` (Renderer)

**Before:** Just UI display, received updates via IPC  
**After:** Full transcription logic using Soniox SDK

Key responsibilities:

- Initialize `SonioxClient` with API key from env
- Start/stop transcription on IPC commands
- Handle `onPartialResult` callback for tokens
- Send final tokens to main process for insertion
- Display status and preview text

### 3. Dependencies

**Added:**

```json
{
  "@soniox/speech-to-text-web": "^1.2.0"
}
```

**Removed:**

```json
{
  "ws": "^8.18.0",
  "@types/ws": "^8.5.13"
}
```

**Kept:**

```json
{
  "robotjs": "^0.6.0" // For text insertion
}
```

## Usage

### User Experience (Unchanged)

1. Press `Cmd+Shift+F` anywhere on the computer
2. Overlay appears showing "Connecting..." then "Listening"
3. Speak into microphone
4. Text appears in real-time in the active input field
5. Press `Cmd+Shift+F`, `Esc`, or click stop button to finish

### Developer Experience (Improved)

- No manual WebSocket management
- No manual audio processing
- SDK handles all complexity
- Better error messages
- Easier to debug

## Configuration

The API key is still loaded from environment:

```bash
VITE_SONIOX_API_KEY=your_key_here
```

For development, the key is currently hardcoded in the service (see `transcription-service.ts`).

For production, it should be loaded from SST secrets via the `.env` file.

## Testing

### Manual Testing Checklist

- [x] SDK package installed
- [ ] Press `Cmd+Shift+F` - overlay appears
- [ ] Speak - text appears in active input field
- [ ] Text streams in real-time (each final token inserted)
- [ ] Preview shows last 5 words in overlay
- [ ] Press `Cmd+Shift+F` again - transcription stops
- [ ] Press `Esc` - transcription stops
- [ ] Click stop button - transcription stops
- [ ] Error handling - invalid API key shows error
- [ ] Error handling - denied mic permission shows error

### What to Watch For

- Check console for Soniox connection logs
- Verify final tokens are being sent to main process
- Confirm text insertion happens via robotjs
- Test in various apps (TextEdit, browser, Slack, etc.)

## Benefits of SDK Approach

1. **Reliability**: Soniox maintains the SDK, handles protocol changes
2. **Simplicity**: 70% less code in our transcription service
3. **Better Errors**: SDK provides detailed error messages
4. **Future-Proof**: Automatic updates to Soniox protocol
5. **Tested**: SDK is used by many Soniox customers
6. **Documentation**: Official docs and examples available

## References

- [Soniox Direct Stream Guide](https://soniox.com/docs/stt/guides/direct-stream)
- [Soniox Web SDK](https://soniox.com/docs/stt/SDKs/web-sdk)
- [@soniox/speech-to-text-web on npm](https://www.npmjs.com/package/@soniox/speech-to-text-web)

## Next Steps

1. ✅ Install SDK package
2. ✅ Refactor transcription-service.ts
3. ✅ Refactor transcription-overlay.tsx
4. ✅ Remove audio-capture.tsx
5. ✅ Remove ws dependency
6. ✅ Test build
7. [ ] Manual testing with real microphone
8. [ ] Verify text insertion in multiple apps
9. [ ] Update documentation
10. [ ] Ship to users 🚀
