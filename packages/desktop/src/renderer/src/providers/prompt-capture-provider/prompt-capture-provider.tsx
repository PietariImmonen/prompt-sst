import * as React from 'react'

import { usePromptCapture } from '@/hooks/use-prompt-capture'

import { PromptCaptureContext } from './prompt-capture-context'

type PromptCaptureProviderProps = {
  children: React.ReactNode
}

export function PromptCaptureProvider(props: PromptCaptureProviderProps) {
  const { children } = props
  const capture = usePromptCapture(true)

  return (
    <PromptCaptureContext.Provider value={capture}>{children}</PromptCaptureContext.Provider>
  )
}
