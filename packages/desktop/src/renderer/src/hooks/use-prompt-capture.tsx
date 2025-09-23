import { useEffect, useRef, useState } from 'react'
import { createId } from '@paralleldrive/cuid2'
import { toast } from 'sonner'

import { useReplicache, useSubscribe } from './use-replicache'
import { PromptStore } from '@/data/prompt-store'

type CaptureStatus = 'idle' | 'listening' | 'capturing' | 'success' | 'failed'

type CapturePayload = {
  content: string
  title: string
  source: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
  categoryPath: string
  visibility: 'private' | 'workspace'
  isFavorite: boolean
  metadata?: Record<string, string | number | boolean | null>
}

export function usePromptCapture(enabled = true) {
  const rep = useReplicache()
  const prompts = useSubscribe(PromptStore.list(), { default: [] })
  const lastCaptureRef = useRef<{ content: string; timestamp: number } | null>(null)
  const lastStatusRef = useRef<CaptureStatus>('idle')
  const [status, setStatus] = useState<CaptureStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string | undefined>(undefined)

  // Ensure the main process shortcut is registered while authenticated
  useEffect(() => {
    if (!window.promptCapture) return

    let active = true

    if (enabled) {
      window.promptCapture
        .enable()
        .then((isListening) => {
          if (isListening) {
            lastStatusRef.current = 'listening'
            setStatus('listening')
          }
        })
        .catch((error) => console.error('Failed to enable capture service', error))
    } else {
      void window.promptCapture.disable()
      active = false
      setStatus('idle')
    }

    return () => {
      if (!active) return
      void window.promptCapture.disable()
      setStatus('idle')
      lastStatusRef.current = 'idle'
    }
  }, [enabled])

  // Listen for background status updates and surface via toast notifications
  useEffect(() => {
    if (!window.promptCapture) return

    const unsubscribe = window.promptCapture.onStatus(({ status, message }) => {
      setStatus(status)
      setStatusMessage(message)

      if (lastStatusRef.current === status) {
        return
      }

      if (status === 'success') {
        toast.success(message ?? 'Prompt captured')
      }
      if (status === 'failed') {
        toast.error(message ?? 'Prompt capture failed')
      }

      lastStatusRef.current = status
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!window.promptCapture) return

    const unsubscribe = window.promptCapture.onCapture((payload: CapturePayload) => {
      ;(async () => {
        const normalizedContent = payload.content.trim()

        if (!normalizedContent) {
          await window.promptCapture.notifyCapture({
            success: false,
            message: 'Capture ignored because the payload was empty.'
          })
          return
        }

        const lastCapture = lastCaptureRef.current
        const now = Date.now()
        if (
          lastCapture &&
          lastCapture.content === normalizedContent &&
          now - lastCapture.timestamp < 1500
        ) {
          await window.promptCapture.notifyCapture({
            success: false,
            message: 'Prompt already captured.'
          })
          return
        }

        try {
          const id = createId()
          await rep.mutate.prompt_create({
            id,
            title: payload.title,
            content: normalizedContent,
            source: payload.source,
            categoryPath: payload.categoryPath,
            visibility: payload.visibility,
            isFavorite: payload.isFavorite,
            metadata: payload.metadata ?? {}
          })
          await rep.pull()

          lastCaptureRef.current = { content: normalizedContent, timestamp: now }

          await window.promptCapture.notifyCapture({
            success: true,
            message: `Saved "${payload.title}"`
          })
        } catch (error) {
          console.error('Failed to persist prompt', error)
          await window.promptCapture.notifyCapture({
            success: false,
            message: 'Unable to save the prompt. Check your connection.'
          })
        }
      })()
    })

    return () => {
      unsubscribe?.()
    }
  }, [rep])

  // Handle overlay prompt requests
  useEffect(() => {
    if (!window.electron?.ipcRenderer) {
      console.log('Main window: IPC renderer not available')
      return
    }

    const handleOverlayRequest = () => {
      console.log('Main window: Received overlay prompt request, sending', prompts.length, 'prompts')
      console.log('First few prompts:', prompts.slice(0, 2).map(p => ({ id: p.id, title: p.title })))
      window.electron.ipcRenderer.send('overlay:prompts-response', prompts)
    }

    window.electron.ipcRenderer.on('overlay:request-prompts', handleOverlayRequest)
    console.log('Main window: Registered overlay prompt request handler')

    return () => {
      window.electron.ipcRenderer.removeListener('overlay:request-prompts', handleOverlayRequest)
      console.log('Main window: Unregistered overlay prompt request handler')
    }
  }, [prompts])

  return { status, message: statusMessage }
}
