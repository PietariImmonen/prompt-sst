// Type definitions for window APIs exposed by preload

interface TranscriptionAPI {
  getStatus: () => Promise<{
    status: string
    isRecording: boolean
    hasApiKey: boolean
  }>
  requestMicrophoneAccess: () => Promise<boolean>
}

declare global {
  interface Window {
    transcription: TranscriptionAPI
  }
}

export {}
