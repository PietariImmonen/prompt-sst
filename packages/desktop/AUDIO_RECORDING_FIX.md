# Audio Recording Fix for Electron Transcription

## Problems Identified

### 1. **Low Sample Rate Configuration**
**Location**: `packages/desktop/src/renderer/src/hooks/useTranscribe.ts`

**Problem**: Forced 16kHz sample rate was too low for modern microphones
```typescript
sampleRate: { ideal: 16000 }  // ❌ Too restrictive
```

**Solution**: Let browser choose optimal sample rate (typically 48kHz)
```typescript
// ✅ Removed sampleRate constraint
// Browser uses native audio format
```

### 2. **Multiple Conflicting Audio Streams**
**Location**: `packages/desktop/src/renderer/src/pages/transcription-test-direct.tsx`

**Problem**: Three separate `getUserMedia()` calls created conflicts:
1. `detectActiveMicrophone()` in `handleStart`
2. Soniox SDK requesting stream internally
3. MediaRecorder requesting another stream

**Solution**:
- Removed `detectActiveMicrophone()` from `handleStart`
- Start MediaRecorder **after** Soniox SDK starts (in `onStarted` callback)
- Each stream is independent but starts sequentially to avoid conflicts

### 3. **Timing Issues**
**Problem**: MediaRecorder started before Soniox SDK acquired microphone

**Solution**: Moved MediaRecorder initialization to `onStarted` callback
```typescript
onStarted: async () => {
  // Soniox has mic now, safe to start recording
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.start(100) // 100ms chunks
}
```

### 4. **Codec Compatibility in Electron**
**Problem**: Not all audio codecs supported by Electron/Chromium

**Solution**: Codec detection fallback chain
```typescript
const mimeTypes = [
  'audio/webm;codecs=opus',  // Best quality
  'audio/webm',               // Fallback
  'audio/ogg;codecs=opus',    // Alternative
  'audio/mp4'                 // Last resort
]

for (const mimeType of mimeTypes) {
  if (MediaRecorder.isTypeSupported(mimeType)) {
    selectedMimeType = mimeType
    break
  }
}
```

### 5. **Missing macOS Microphone Permissions**
**Problem**: Electron apps need explicit microphone permission via `systemPreferences` API

**Solution**: Added proper permission handling
- **Main Process** (`packages/desktop/src/main/index.ts`):
  ```typescript
  ipcMain.handle('request-microphone-access', async () => {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('microphone')
      if (status === 'not-determined') {
        return await systemPreferences.askForMediaAccess('microphone')
      }
      return status === 'granted'
    }
    return true
  })
  ```

- **Preload** (`packages/desktop/src/preload/index.ts`):
  ```typescript
  interface TranscriptionAPI {
    requestMicrophoneAccess: () => Promise<boolean>
  }
  ```

- **Renderer** (`transcription-test-direct.tsx`):
  ```typescript
  const granted = await window.transcription.requestMicrophoneAccess()
  if (!granted) {
    addLog('❌ Microphone access denied')
    return
  }
  ```

## Files Modified

1. **`packages/desktop/src/renderer/src/hooks/useTranscribe.ts`**
   - Removed restrictive sampleRate constraint
   - Added MediaRecorder in `onStarted` callback
   - Implemented codec detection fallback
   - Added audioURL state and cleanup

2. **`packages/desktop/src/renderer/src/pages/transcription-test-direct.tsx`**
   - Removed `detectActiveMicrophone()` call from `handleStart`
   - Added microphone permission request before starting
   - Updated logs for audio recording feedback
   - Added audio player UI with download button

3. **`packages/desktop/src/main/index.ts`**
   - Added `systemPreferences` import
   - Implemented `request-microphone-access` IPC handler

4. **`packages/desktop/src/preload/index.ts`**
   - Added `requestMicrophoneAccess` to TranscriptionAPI interface
   - Exposed method via contextBridge

## How It Works Now

### Recording Flow
```
User clicks "Start Recording"
           ↓
Request macOS microphone permission (if needed)
           ↓
Soniox SDK starts → acquires microphone stream
           ↓
onStarted() fires
           ↓
MediaRecorder starts with independent stream
           ↓
Audio chunks captured in parallel (100ms intervals)
           ↓
User stops recording
           ↓
MediaRecorder stops → combines chunks → creates blob
           ↓
Object URL created for playback
           ↓
Audio player appears with download option
```

### Audio Format
- **Format**: WebM with Opus codec (or fallback)
- **Chunk Size**: 100ms for smooth recording
- **Quality**: Browser native sample rate (48kHz typical)
- **File Extension**: `.webm`

## Testing

1. Navigate to `/transcription-test-direct`
2. Click "Start Recording"
3. Grant microphone permission if prompted
4. Speak into microphone
5. Check console for:
   ```
   📼 Using MIME type: audio/webm;codecs=opus
   🎵 Audio chunk recorded: XXXX bytes
   💾 Audio saved, size: XXXX bytes
   ```
6. Click "Stop"
7. Audio player appears with playback controls
8. Click "Download Audio" to save file

## Troubleshooting

### No audio chunks recorded
- Check microphone permission in System Settings → Privacy → Microphone
- Verify microphone is selected in System Settings → Sound → Input
- Look for `📼 MediaRecorder started` in console

### Audio player doesn't appear
- Check for `💾 Audio saved` log
- Verify `audioURL` state is set
- Check browser console for MediaRecorder errors

### Soniox not receiving speech
- Verify microphone volume is adequate
- Speak clearly and loudly
- Check for `📨 RECEIVED RESULT` logs
- Ensure internet connection is active

## macOS Permissions

If microphone access is denied:

1. Open **System Settings**
2. Go to **Privacy & Security** → **Microphone**
3. Find your app in the list
4. Enable the toggle
5. Restart the app

## Success Indicators

✅ Console shows: `✅ Microphone access granted`
✅ Console shows: `📼 Using MIME type: audio/webm;codecs=opus`
✅ Console shows periodic: `🎵 Audio chunk recorded`
✅ Console shows: `💾 Audio saved, size: XXXXX bytes`
✅ Audio player appears after stopping
✅ Playback works correctly
✅ Download produces valid .webm file

## Summary

The audio recording now works reliably in Electron by:
1. ✅ Using browser-native sample rates
2. ✅ Avoiding stream conflicts through sequential initialization
3. ✅ Proper codec detection and fallback
4. ✅ Correct timing via `onStarted` callback
5. ✅ Native macOS permission handling via `systemPreferences`

Audio is captured in parallel with transcription and saved for playback/download! 🎤
