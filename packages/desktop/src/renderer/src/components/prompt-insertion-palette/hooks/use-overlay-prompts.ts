import { useState, useRef, useCallback } from 'react'
import { Prompt, OverlayState } from '../types'
import { promptIPCService } from '../services/prompt-ipc-service'

export function useOverlayPrompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [state, setState] = useState<OverlayState>({
    isVisible: false,
    isLoading: false
  })

  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const loadAttemptedRef = useRef(false)

  // Load prompts only once when overlay becomes visible
  const loadPrompts = useCallback(async () => {
    if (isLoadingRef.current || hasLoadedRef.current) {
      console.log('Overlay: Skipping load - already loading or loaded:', { isLoading: isLoadingRef.current, hasLoaded: hasLoadedRef.current })
      return
    }

    // Prevent rapid multiple attempts
    if (loadAttemptedRef.current) {
      console.log('Overlay: Load already attempted, skipping')
      return
    }

    loadAttemptedRef.current = true
    isLoadingRef.current = true
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))

    try {
      console.log('Overlay: Starting to load prompts...')
      const data = await promptIPCService.getPrompts()
      console.log('Overlay: Loaded prompts:', data?.length || 0)
      setPrompts(data)
      hasLoadedRef.current = true
      setState(prev => ({ ...prev, isLoading: false }))
    } catch (error) {
      console.error('Failed to load prompts:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load prompts'
      }))
    } finally {
      isLoadingRef.current = false
    }
  }, [])

  // Handle overlay visibility changes
  const setVisible = useCallback((visible: boolean) => {
    setState(prev => ({ ...prev, isVisible: visible }))

    if (visible && !hasLoadedRef.current) {
      loadPrompts()
    }

    if (!visible) {
      // Reset loading state but keep prompts cached
      setState(prev => ({ ...prev, isLoading: false, error: undefined }))
      promptIPCService.reset()
    }
  }, [loadPrompts])

  // Force refresh prompts (e.g., on manual refresh)
  const refreshPrompts = useCallback(async () => {
    console.log('Overlay: Force refreshing prompts...')
    hasLoadedRef.current = false
    isLoadingRef.current = false
    loadAttemptedRef.current = false
    await loadPrompts()
  }, [loadPrompts])

  // No real-time updates needed - prompts are loaded once when overlay opens

  return {
    prompts,
    state,
    setVisible,
    refreshPrompts
  }
}