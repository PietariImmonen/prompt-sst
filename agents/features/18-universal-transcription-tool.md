# Universal Transcription Tool

- ID: 18-universal-transcription-tool
- Owner: TBA
- Priority: P2
- Target Release: Sprint 4

## 1. Requirements Discovery

### 1.1. Context Snapshot

This feature addresses the need for frictionless voice-to-text input across all desktop applications. Users often need to dictate notes, emails, or documents but lack universal transcription support. By integrating Soniox's real-time transcription API with a global hotkey, we provide ambient voice input that works everywhere on the user's computer.

- **Persona Impacted:** All desktop users, especially content creators, knowledge workers, and accessibility users who benefit from voice input.
- **Related Features:** Complements desktop prompt capture (08), leverages existing global shortcut infrastructure, and extends the product's ambient assistant capabilities.

### 1.2. Goals & Non-Goals

- **Goals**

  - **G1: Universal Voice Input:** Users can activate transcription at any text input field using `Cmd+Shift+T` and have speech converted to text in real-time.
  - **G2: Low-Latency Streaming:** Transcription results appear with minimal delay using Soniox's real-time WebSocket API.
  - **G3: Clear Control Indicators:** Users see an unobtrusive floating UI indicator showing transcription status (recording, processing, stopped).
  - **G4: Multiple Stop Methods:** Users can stop transcription via `Cmd+Shift+T`, `Esc`, or clicking a stop button in the UI indicator.
  - **G5: Reliable Text Insertion:** Transcribed text is accurately inserted at the cursor position in the active application.

- **Non-Goals**
  - **NG1: Language Selection:** MVP will use system default language. Language picker is deferred to future iterations.
  - **NG2: Custom Vocabulary:** No custom vocabulary or domain-specific training in MVP.
  - **NG3: Audio Playback:** No audio recording playback or storage beyond transcription session.
  - **NG4: Offline Mode:** Requires active internet connection. Offline transcription is out of scope.
  - **NG5: Multi-Language Detection:** Automatic language switching within a single session is deferred.

## 2. Architecture Planning

### 2.1. System Component Diagram

```
[User presses Cmd+Shift+T in any app]
      |
      v
[Electron Main Process] --(1. Activate Shortcut)--> [Transcription Service]
      |
(2. Request microphone access)
      |
      v
[OS Microphone API] --(3. Audio Stream)--> [Audio Capture Module]
      |
(4. Stream audio chunks)
      |
      v
[WebSocket Client] --(5. Send audio)--> [Soniox Real-Time API: wss://]
      |
(6. Receive token stream)
      |
      v
[Transcription Service] --(7. Process tokens)--> [Text Buffer Manager]
      |                                                    |
      |                                          (8. Accumulate text)
      |                                                    |
      v                                                    v
[Floating UI Window] <--(9. Update status)--    [Text Buffer]
      |
(10. User presses Cmd+Shift+T/Esc or clicks stop)
      |
      v
[Transcription Service] --(11. Finalize text)--> [Text Insertion Module]
      |
(12. Simulate keyboard input)
      |
      v
[OS Accessibility API] --(13. Insert text)--> [Active Application]
      |
(14. Clean up)
      |
      v
[Electron Main Process] --> [Close WebSocket, Stop Audio, Hide UI]
```

### 2.2. Scalability & Technology

- **Desktop Integration:** Electron's `globalShortcut` for hotkey, `desktopCapturer` or native modules for microphone access, and OS accessibility APIs for text insertion.
- **Real-Time Communication:** WebSocket connection to Soniox API with audio streaming in supported formats (recommend PCM/WAV for simplicity).
- **Audio Processing:** Use Web Audio API or native audio libraries to capture microphone input in chunks suitable for streaming (recommended: 16kHz, 16-bit PCM, mono).
- **Text Insertion:** Leverage `robotjs` or platform-specific automation for reliable text insertion at cursor position.
- **UI Feedback:** Small, always-on-top, transparent Electron window for status indicator and stop button.

### 2.3. External Dependencies

- **Soniox API:** Real-time transcription via WebSocket. Requires API key configuration.
- **Microphone Access:** OS-level permissions required. Must handle permission requests gracefully.
- **OS Accessibility:** Text insertion requires accessibility permissions on macOS and potentially elevated permissions on other platforms.

## 3. Interface Design

### 3.1. Soniox API Integration

**WebSocket Connection:**

- **Endpoint:** `wss://api.soniox.com/transcribe-websocket` (verify exact URL from Soniox docs)
- **Authentication:** API key via query parameter or header
- **Audio Format:** PCM, 16kHz, mono, 16-bit (auto-detected by Soniox for common formats)
- **Message Protocol:**
  - **Client → Server:** Binary audio chunks
  - **Optional Client → Server:** `{"type": "finalize"}` to force token finalization
  - **Server → Client:** JSON token stream with `is_final` flag
    ```json
    {
      "tokens": [
        {"text": "hello", "is_final": true},
        {"text": " world", "is_final": false}
      ],
      "audio_final_proc_ms": 1200,
      "audio_total_proc_ms": 1500
    }
    ```

**Token Processing Strategy:**

- **Real-Time Display:** Show non-final tokens as they arrive for immediate feedback
- **Text Buffer:** Only commit final tokens to insertion buffer
- **Finalization:** On stop event, send finalize message to get remaining final tokens before closing connection

### 3.2. User Interface: Floating Status Indicator

**Design:**

- **Position:** Small floating window in top-right corner (or configurable position)
- **Size:** ~200x60px
- **Transparency:** Semi-transparent background with high-contrast content
- **Always-on-Top:** Must float above all applications
- **Content:**
  - Recording indicator (animated red dot)
  - Real-time transcription preview (last 3-5 words, scrolling)
  - Stop button (small 'X' or stop icon)
  - Status text: "Listening...", "Processing...", "Stopped"

**Interaction:**

- **Hover:** Highlight stop button
- **Click Stop Button:** Finalize and insert transcribed text
- **Keyboard Shortcuts:** `Cmd+Shift+T` or `Esc` also trigger stop

### 3.3. Configuration & Settings

**Desktop App Settings Panel (Future):**

- API Key: Soniox API key input (stored securely in OS keychain)
- Language: Dropdown for transcription language (default: system language)
- Audio Device: Microphone selection if multiple devices available
- Hotkey: Customizable shortcut (default: `Cmd+Shift+T`)

**MVP Configuration:**

- Hardcoded `Cmd+Shift+T` shortcut
- API key via environment variable or first-run configuration prompt
- System default microphone and language

## 4. Implementation Strategy

### 4.1. Phase 1: Foundation (Week 1)

**Core Infrastructure Setup**

- [ ] **Desktop (Main):** Create `TranscriptionService` class in `packages/desktop/src/main/services/transcription.ts`
- [ ] **Desktop (Main):** Set up microphone capture using Electron's `desktopCapturer` or native audio module
- [ ] **Desktop (Main):** Implement audio format conversion to PCM 16kHz mono 16-bit
- [ ] **Desktop (Main):** Register global shortcut `CmdOrCtrl+Shift+T` with toggle behavior (start/stop)
- [ ] **Desktop (Main):** Add OS permission checks for microphone and accessibility

**External Dependencies:**

- [ ] **Package Install:** Add `robotjs` or alternative for text insertion (e.g., `@nut-tree/nut-js`)
- [ ] **Package Install:** Add WebSocket client library if not using native (e.g., `ws`)
- [ ] **Package Install:** Add audio processing library if needed (e.g., `node-mic`, `speaker`)

### 4.2. Phase 2: Soniox Integration (Week 1-2)

**Real-Time Transcription Pipeline**

- [ ] **Desktop (Main):** Implement WebSocket client for Soniox API in `TranscriptionService`
- [ ] **Desktop (Main):** Handle WebSocket connection lifecycle (connect, error, close)
- [ ] **Desktop (Main):** Stream audio chunks to Soniox in appropriate intervals (e.g., 100-200ms chunks)
- [ ] **Desktop (Main):** Implement token stream parser to extract text and `is_final` status
- [ ] **Desktop (Main):** Create `TextBufferManager` to accumulate final tokens and preview non-final tokens
- [ ] **Desktop (Main):** Handle finalization message on stop event to flush remaining tokens

**Error Handling:**

- [ ] **Desktop (Main):** Implement retry logic for WebSocket disconnections
- [ ] **Desktop (Main):** Handle API errors (invalid API key, rate limits, unsupported audio format)
- [ ] **Desktop (Main):** Fallback behavior if microphone access denied or unavailable

### 4.3. Phase 3: UI Feedback (Week 2)

**Floating Status Window**

- [ ] **Desktop (Renderer):** Create `TranscriptionOverlay` React component in `packages/desktop/src/renderer/src/components/transcription-overlay.tsx`
- [ ] **Desktop (Main):** Create overlay window with transparent, always-on-top, frameless configuration
- [ ] **Desktop (Renderer):** Implement real-time status updates (listening, processing, text preview)
- [ ] **Desktop (Renderer):** Add stop button with click handler to trigger stop event
- [ ] **Desktop (Renderer):** Style with Tailwind for minimal, non-intrusive appearance
- [ ] **Desktop (Main/Renderer):** Implement IPC communication for status updates and stop events

**Status Indicators:**

- [ ] **Desktop (Renderer):** Animated recording indicator (pulsing red dot)
- [ ] **Desktop (Renderer):** Real-time text preview (last 3-5 words, auto-scroll)
- [ ] **Desktop (Renderer):** Visual feedback for stop button hover and click

### 4.4. Phase 4: Text Insertion (Week 2-3)

**Cross-Platform Text Injection**

- [ ] **Desktop (Main):** Implement text insertion using `robotjs` or platform-specific automation
- [ ] **Desktop (Main):** Test text insertion reliability across multiple applications (browser, text editor, Slack, etc.)
- [ ] **Desktop (Main):** Handle special characters, newlines, and Unicode correctly
- [ ] **Desktop (Main):** Implement cursor position verification and fallback strategies
- [ ] **Desktop (Main):** On transcription stop, insert accumulated final text at active cursor position

**Stop Trigger Implementation:**

- [ ] **Desktop (Main):** Handle `Cmd+Shift+T` toggle to stop transcription and insert text
- [ ] **Desktop (Main):** Handle `Esc` key to stop transcription and insert text
- [ ] **Desktop (Main):** Handle stop button click event from overlay window
- [ ] **Desktop (Main):** Ensure consistent cleanup (close WebSocket, stop audio, hide overlay) for all stop methods

### 4.5. Phase 5: Configuration & Polish (Week 3)

**Settings & Configuration**

- [ ] **Desktop (Main):** Implement secure API key storage using Electron's `safeStorage` or OS keychain
- [ ] **Desktop (Renderer):** Add transcription settings panel to desktop app settings UI
- [ ] **Desktop (Renderer):** API key input field with secure masking
- [ ] **Desktop (Renderer):** Language selection dropdown (if supported in Soniox API)
- [ ] **Desktop (Renderer):** Microphone device selection if multiple devices available

**Error Handling & User Feedback:**

- [ ] **Desktop (Main):** Show notification for permission denials (microphone, accessibility)
- [ ] **Desktop (Main):** Show notification for API errors (invalid key, network failure)
- [ ] **Desktop (Renderer):** Display error state in overlay window with clear error message
- [ ] **Desktop (Main):** Log errors to console for debugging without exposing sensitive data

**Performance & Cleanup:**

- [ ] **Desktop (Main):** Optimize audio buffer management to prevent memory leaks
- [ ] **Desktop (Main):** Ensure WebSocket cleanup on app shutdown or transcription stop
- [ ] **Desktop (Main):** Profile CPU and memory usage during active transcription
- [ ] **Desktop (Main):** Add telemetry for transcription session duration and success rate (optional)

## 5. Test & QA Plan

### 5.1. Manual Testing

**Core Functionality:**

- [ ] Activate transcription with `Cmd+Shift+T` in various apps (browser, text editor, Slack, email client)
- [ ] Verify real-time text preview updates in floating window
- [ ] Verify final text insertion at cursor position after stopping
- [ ] Test all stop methods: `Cmd+Shift+T`, `Esc`, stop button click
- [ ] Test with different microphone input levels (quiet, normal, loud)
- [ ] Test with background noise and multiple speakers (edge case documentation)

**Error Scenarios:**

- [ ] Deny microphone permission → verify graceful error notification
- [ ] Invalid or missing API key → verify error notification and no crash
- [ ] Network disconnection during transcription → verify reconnection or error handling
- [ ] Press shortcut in non-text field (e.g., image editor) → verify no crash, graceful handling

**Cross-Platform:**

- [ ] Test on macOS with accessibility permissions
- [ ] Test on Windows with appropriate permissions
- [ ] Test on Linux (if supported)

### 5.2. Automated Testing

**Unit Tests:**

- [ ] **Desktop (Main):** Unit tests for `TranscriptionService` methods (start, stop, token processing)
- [ ] **Desktop (Main):** Unit tests for `TextBufferManager` (accumulation, finalization, preview)
- [ ] **Desktop (Main):** Mock Soniox WebSocket responses to test token parsing

**Integration Tests:**

- [ ] **Desktop (Main):** Integration test for full transcription lifecycle (start → tokens → stop → insert)
- [ ] **Desktop (Main):** Integration test for error handling (WebSocket failure, API errors)

**Pre-PR Checks:**

- [ ] `bun run --filter @prompt-saver/desktop typecheck`
- [ ] `bun run --filter @prompt-saver/desktop lint`
- [ ] Manual smoke test on macOS
- [ ] Verify no console errors during normal transcription flow

## 6. Open Questions

### 6.1. Technical Decisions

- **Q1: Audio Format Choice:** Should we use auto-detected formats (WAV, MP3) or raw PCM for maximum control and compatibility?
  - **Recommendation:** Start with PCM 16kHz mono for simplicity and universal Soniox support. Can add auto-detection later.
- **Q2: Text Insertion Library:** `robotjs` is powerful but requires native compilation. Alternatives like `@nut-tree/nut-js` or platform-specific scripts?
  - **Recommendation:** Test `robotjs` first for cross-platform consistency. Consider `@nut-tree/nut-js` if compilation issues arise.
- **Q3: Overlay Window vs Native OS Widget:** Should status indicator be an Electron window or native OS widget (e.g., NSPanel on macOS)?
  - **Recommendation:** Electron window for MVP (cross-platform consistency). Can explore native widgets for performance optimization later.

### 6.2. User Experience

- **Q4: Continuous vs Toggle Mode:** Should holding the shortcut activate transcription (release to stop) or toggle mode (press to start, press again to stop)?
  - **Recommendation:** Toggle mode for MVP (less physical strain, more flexible). Consider push-to-talk as advanced option.
- **Q5: Text Preview Length:** How many words should be shown in the floating window preview?
  - **Recommendation:** 3-5 words with auto-scroll. User testing will inform optimal length.
- **Q6: Indicator Position:** Top-right corner default, or allow user to drag/configure position?
  - **Recommendation:** Fixed top-right for MVP. Add drag-to-reposition in future iteration based on user feedback.

### 6.3. Security & Privacy

- **Q7: Audio Storage:** Should we store audio for quality improvement or debugging purposes?
  - **Recommendation:** No audio storage in MVP for privacy. If needed later, require explicit opt-in with clear disclosure.
- **Q8: API Key Security:** Best practice for storing Soniox API key on desktop?
  - **Recommendation:** Use Electron's `safeStorage` API or OS keychain integration. Never store in plain text config files.

## 7. Success Metrics

- **Adoption Rate:** % of desktop users who activate transcription at least once within 30 days of release
- **Usage Frequency:** Average transcription sessions per active user per week
- **Accuracy Perception:** User-reported satisfaction with transcription accuracy (survey or in-app feedback)
- **Latency:** Average time from speech to text appearance in floating window (target: <500ms for final tokens)
- **Reliability:** % of transcription sessions completed successfully without errors

## 8. Future Enhancements

- **Multi-Language Support:** Language picker in settings, auto-detection of spoken language
- **Custom Vocabulary:** Domain-specific vocabulary training for improved accuracy in specialized fields
- **Voice Commands:** Meta-commands like "new paragraph", "delete last sentence" for advanced editing
- **Transcription History:** Local storage of recent transcriptions for review and re-insertion
- **Configurable Hotkeys:** User-defined shortcuts for start/stop transcription
- **Offline Mode:** Local transcription model for privacy-sensitive or offline scenarios (e.g., Whisper.cpp)
