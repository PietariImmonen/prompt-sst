import { useEffect, useState } from 'react'

interface ShortcutUpdateResult {
  success: boolean
  message?: string
  requiresRestart?: boolean
}

/**
 * Hook to listen for shortcut update results from the main process.
 * Does NOT auto-sync shortcuts - that's now handled manually in the ShortcutSettings component.
 */
export function useShortcutSync() {
  const [lastUpdateResult, setLastUpdateResult] = useState<ShortcutUpdateResult | null>(null)

  // Listen for update results from main process
  useEffect(() => {
    if (!window.shortcuts) return

    const unsubscribe = window.shortcuts.onUpdateResult((result) => {
      console.log('Shortcut update result:', result)
      setLastUpdateResult(result)
    })

    return unsubscribe
  }, [])

  return {
    lastUpdateResult
  }
}
