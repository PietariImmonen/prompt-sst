import * as React from 'react'
import { Star, Search, RefreshCw } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useOverlayPrompts } from './hooks/use-overlay-prompts'
import { usePromptSearch } from './hooks/use-prompt-search'
import { Prompt } from './types'

interface PromptOverlayProps {
  onSelectPrompt?: (prompt: Prompt) => void
  onClose?: () => void
}

export function PromptOverlay({ onSelectPrompt, onClose }: PromptOverlayProps) {
  const { prompts, state, setVisible, refreshPrompts } = useOverlayPrompts()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsContainerRef = React.useRef<HTMLDivElement>(null)
  const selectedItemRef = React.useRef<HTMLDivElement>(null)

  const filteredPrompts = usePromptSearch(prompts, searchQuery, { maxResults: 10 })

  // Initialize overlay when component mounts
  React.useEffect(() => {
    setVisible(true)

    // Focus input after a brief delay
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)

    return () => {
      clearTimeout(timer)
      setVisible(false)
    }
  }, [setVisible])

  // Listen for overlay events from main process
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) {
      console.warn('IPC renderer not available in overlay')
      return
    }

    const ipc = window.electron.ipcRenderer

    const handleShow = () => {
      console.log('Overlay: Show event received')
      setVisible(true)
      setSearchQuery('')
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }

    const handleHide = () => {
      console.log('Overlay: Hide event received')
      setVisible(false)
      setSearchQuery('')
      setSelectedIndex(0)
      onClose?.()
    }

    ipc.on('overlay:show', handleShow)
    ipc.on('overlay:hide', handleHide)

    return () => {
      ipc.removeListener('overlay:show', handleShow)
      ipc.removeListener('overlay:hide', handleHide)
    }
  }, [setVisible, onClose])

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!state.isVisible) return

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
          const selectedPrompt = filteredPrompts[selectedIndex]!
          handlePromptSelect(selectedPrompt)
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
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.isVisible, filteredPrompts, selectedIndex])

  // Auto-select first prompt when filtered prompts change
  React.useEffect(() => {
    if (filteredPrompts.length > 0 && selectedIndex >= filteredPrompts.length) {
      setSelectedIndex(0)
    }
  }, [filteredPrompts, selectedIndex])

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedItemRef.current && resultsContainerRef.current) {
      const container = resultsContainerRef.current
      const selectedItem = selectedItemRef.current

      const containerRect = container.getBoundingClientRect()
      const itemRect = selectedItem.getBoundingClientRect()

      const isItemVisible =
        itemRect.top >= containerRect.top && itemRect.bottom <= containerRect.bottom

      if (!isItemVisible) {
        selectedItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [selectedIndex, filteredPrompts])

  const handlePromptSelect = React.useCallback(
    (prompt: Prompt) => {
      onSelectPrompt?.(prompt)

      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('overlay:select-prompt', prompt.content)
      }
    },
    [onSelectPrompt]
  )

  const handleRefresh = React.useCallback(() => {
    refreshPrompts()
  }, [refreshPrompts])

  if (!state.isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-8 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 animate-in slide-in-from-top-4 duration-200">
        <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl ring-1 ring-white/10">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Prompt Insertion Palette</span>
              <div className="ml-auto text-xs">
                {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                className="w-full pl-10 pr-12 py-3 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50"
              />
              <button
                onClick={handleRefresh}
                disabled={state.isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Results */}
          <div ref={resultsContainerRef} className="max-h-80 overflow-y-auto">
            {state.isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
                Loading prompts...
              </div>
            ) : state.error ? (
              <div className="p-8 text-center text-destructive">
                <p>Error: {state.error}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Try again
                </button>
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery
                  ? 'No prompts match your search'
                  : prompts.length === 0
                    ? 'No prompts found'
                    : 'No prompts available'}
              </div>
            ) : (
              <div className="p-2">
                {filteredPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    ref={index === selectedIndex ? selectedItemRef : null}
                    onClick={() => handlePromptSelect(prompt)}
                    className={`p-4 rounded-lg mb-2 transition-all duration-200 cursor-pointer ${
                      index === selectedIndex
                        ? 'bg-primary/20 border border-primary/30 shadow-sm'
                        : 'hover:bg-muted/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold leading-tight text-foreground truncate">
                            {prompt.title}
                          </h3>
                          {prompt.isFavorite && (
                            <Star className="size-3 fill-amber-400 text-amber-500 flex-shrink-0" />
                          )}
                          {prompt.source && prompt.source !== 'other' && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted/70 text-muted-foreground rounded uppercase flex-shrink-0">
                              {prompt.source}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground/90 line-clamp-2 mb-2 leading-relaxed">
                          {prompt.content}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground/60 truncate">
                            {prompt.categoryPath}
                          </span>
                          {prompt.timeUpdated && (
                            <span className="text-xs text-muted-foreground/60 flex-shrink-0 ml-2">
                              {new Date(prompt.timeUpdated).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {index === selectedIndex && (
                        <div className="flex-shrink-0 self-start">
                          <div className="text-xs text-primary font-medium bg-primary/15 px-2 py-1 rounded border border-primary/20">
                            ENTER
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/30 bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-background border border-border rounded">
                    ↑↓
                  </kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-background border border-border rounded">
                    ↵
                  </kbd>
                  <span>insert</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-xs bg-background border border-border rounded">
                    Esc
                  </kbd>
                  <span>close</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Hotkey:</span>
                <kbd className="px-1.5 py-0.5 text-xs bg-background border border-border rounded font-mono">
                  {process.platform === 'darwin' ? '⌘⇧O' : 'Ctrl+Shift+O'}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
