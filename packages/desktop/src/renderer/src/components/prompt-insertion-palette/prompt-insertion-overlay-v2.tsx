import * as React from 'react'
import { Star } from 'lucide-react'

import { useSubscribe } from '@/hooks/use-replicache'
import { PromptStore } from '@/data/prompt-store'

import { getPromptPaletteShortcutDisplay } from './shortcut'

export function PromptInsertionOverlayV2() {
  const prompts = useSubscribe(PromptStore.list(), { default: [] })

  const [isVisible, setIsVisible] = React.useState(false)
  const [searchBuffer, setSearchBuffer] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [useGlobalCapture, setUseGlobalCapture] = React.useState(true)
  const [localQuery, setLocalQuery] = React.useState('') // For fallback mode

  // Listen for overlay events from main process
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) {
      console.warn('IPC renderer not available in overlay v2')
      return
    }

    const ipc = window.electron.ipcRenderer

    // Show overlay
    const handleShow = (
      _event: any,
      data: { searchBuffer: string; useGlobalCapture?: boolean }
    ) => {
      console.log('Overlay V2: Show event received', data)
      setIsVisible(true)
      setSearchBuffer(data.searchBuffer || '')
      setSelectedIndex(0)
      setUseGlobalCapture(data.useGlobalCapture !== false) // Default to true
      setLocalQuery('') // Reset local query
    }

    // Hide overlay
    const handleHide = () => {
      console.log('Overlay V2: Hide event received')
      setIsVisible(false)
      setSearchBuffer('')
      setSelectedIndex(0)
    }

    // Update search
    const handleSearchUpdate = (_event: any, data: { searchBuffer: string }) => {
      console.log('Overlay V2: Search update:', data.searchBuffer)
      setSearchBuffer(data.searchBuffer)
      setSelectedIndex(0) // Reset selection when search changes
    }

    ipc.on('overlay:show', handleShow)
    ipc.on('overlay:hide', handleHide)
    ipc.on('overlay:search-update', handleSearchUpdate)

    return () => {
      ipc.removeListener('overlay:show', handleShow)
      ipc.removeListener('overlay:hide', handleHide)
      ipc.removeListener('overlay:search-update', handleSearchUpdate)
    }
  }, [])

  // Use appropriate search query based on mode
  const currentQuery = useGlobalCapture ? searchBuffer : localQuery

  // Filter prompts based on search query
  const filteredPrompts = React.useMemo(() => {
    if (!currentQuery.trim()) {
      return prompts.slice(0, 10) // Show top 10 when no search
    }

    const tokens = currentQuery.toLowerCase().split(/\s+/).filter(Boolean)

    const scored = prompts
      .map((prompt, rank) => {
        const title = prompt.title.toLowerCase()
        const content = prompt.content.toLowerCase()

        let score = prompt.isFavorite ? 150 : 0
        let matched = false

        for (const token of tokens) {
          let tokenMatched = false

          if (title === token) {
            score += 600
            tokenMatched = true
          }
          if (title.startsWith(token)) {
            score += 450
            tokenMatched = true
          }
          if (title.includes(token)) {
            score += 240
            tokenMatched = true
          }
          if (content.includes(token)) {
            score += 160
            tokenMatched = true
          }

          if (!tokenMatched) {
            return null
          }

          matched = matched || tokenMatched
        }

        if (!matched && tokens.length > 0) {
          return null
        }

        const recencyBoost = prompts.length - rank
        score += recencyBoost * 0.5

        return { prompt, score, rank }
      })
      .filter((entry): entry is { prompt: (typeof prompts)[number]; score: number; rank: number } =>
        Boolean(entry)
      )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.rank - b.rank
      })

    return scored.slice(0, 10).map((entry) => entry.prompt)
  }, [currentQuery, prompts])

  // Handle keyboard input in fallback mode (when window is focusable)
  React.useEffect(() => {
    if (useGlobalCapture || !isVisible) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('overlay:hide')
        }
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (filteredPrompts.length > 0 && selectedIndex < filteredPrompts.length) {
          const selectedPrompt = filteredPrompts[selectedIndex]
          if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('overlay:select-prompt', selectedPrompt.content)
          }
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filteredPrompts.length - 1))
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        return
      }

      // Handle regular typing
      if (event.key.length === 1) {
        setLocalQuery((prev) => prev + event.key)
        setSelectedIndex(0)
      } else if (event.key === 'Backspace') {
        setLocalQuery((prev) => prev.slice(0, -1))
        setSelectedIndex(0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [useGlobalCapture, isVisible, filteredPrompts, selectedIndex])

  // Auto-select first prompt when filtered prompts change
  React.useEffect(() => {
    if (filteredPrompts.length > 0 && selectedIndex >= filteredPrompts.length) {
      setSelectedIndex(0)
    }
  }, [filteredPrompts, selectedIndex])

  // Handle prompt selection via Enter key (triggered from main process)
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleEnterKey = () => {
      if (filteredPrompts.length > 0 && selectedIndex < filteredPrompts.length) {
        const selectedPrompt = filteredPrompts[selectedIndex]
        const promptText = selectedPrompt.content

        console.log('Overlay V2: Sending selected prompt to main process')
        window.electron.ipcRenderer.send('overlay:select-prompt', promptText)
      }
    }

    // Listen for enter key from main process
    window.electron.ipcRenderer.on('overlay:enter-pressed', handleEnterKey)

    return () => {
      window.electron.ipcRenderer.removeListener('overlay:enter-pressed', handleEnterKey)
    }
  }, [filteredPrompts, selectedIndex])

  const shortcutHint = React.useMemo(getPromptPaletteShortcutDisplay, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-32">
      <div className="w-full max-w-2xl mx-4">
        <div className="rounded-lg border border-border/60 bg-popover/95 backdrop-blur-sm shadow-2xl">
          {/* Search Input Display */}
          <div className="p-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {useGlobalCapture ? 'Search:' : 'Type to search:'}
              </div>
              <div className="flex-1 p-2 bg-muted/30 rounded-md font-mono text-sm">
                {currentQuery ||
                  (useGlobalCapture
                    ? 'Start typing to search prompts...'
                    : 'Focus and type to search...')}
                <span className="animate-pulse">|</span>
              </div>
              {!useGlobalCapture && (
                <div className="text-xs text-muted-foreground">Fallback mode</div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {filteredPrompts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchBuffer ? 'No prompts match your search' : 'No prompts available'}
              </div>
            ) : (
              <div className="p-2">
                {filteredPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className={`p-3 rounded-md mb-1 transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-tight text-foreground">
                            {prompt.title}
                          </p>
                          {prompt.isFavorite && (
                            <Star className="size-3 fill-amber-400 text-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground/90 mt-1 line-clamp-2">
                          {prompt.content}
                        </p>
                      </div>
                      {index === selectedIndex && (
                        <div className="text-xs text-primary font-medium">ENTER</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/30 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div>
                {useGlobalCapture
                  ? 'Type to search • ENTER to select • ESC to close'
                  : '↑↓ to navigate • ENTER to select • ESC to close'}
              </div>
              <div className="font-mono">{shortcutHint}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
