import * as React from 'react'

type CaptureStatus = 'idle' | 'listening' | 'capturing' | 'success' | 'failed'

type PromptCaptureState = {
  status: CaptureStatus
  message?: string
}

const PromptCaptureContext = React.createContext<PromptCaptureState | undefined>(undefined)

export function usePromptCaptureStatus() {
  const ctx = React.useContext(PromptCaptureContext)
  if (!ctx) {
    throw new Error('usePromptCaptureStatus must be used within a PromptCaptureProvider')
  }
  return ctx
}

export { PromptCaptureContext }
