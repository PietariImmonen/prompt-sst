import * as React from 'react'
import { Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { promptIPCService } from './services/prompt-ipc-service'
import { Prompt } from './types'
import { stripHtml } from '@/lib/utils'

export function SimplePromptPalette() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [isVisible, setIsVisible] = React.useState(true)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const selectedRef = React.useRef<HTMLDivElement>(null)

  // Load prompts on mount
  React.useEffect(() => {
    const loadPrompts = async () => {
      try {
        console.log('Simple palette: Loading prompts...')
        const data = await promptIPCService.getPrompts()
        console.log('Simple palette: Loaded', data?.length || 0, 'prompts')
        setPrompts(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load prompts:', error)
        setPrompts([])
      }
    }

    loadPrompts()
  }, [])

  // Focus input on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  // Filter prompts based on search
  const filteredPrompts = React.useMemo(() => {
    if (!searchQuery) {
      return prompts
    }

    const query = searchQuery.toLowerCase()
    return prompts.filter((prompt) =>
      prompt.title.toLowerCase().includes(query) ||
      stripHtml(prompt.content).toLowerCase().includes(query) ||
      prompt.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [prompts, searchQuery])

  // Reset selection when filtered prompts change
  React.useEffect(() => {
    if (filteredPrompts.length > 0 && selectedIndex >= filteredPrompts.length) {
      setSelectedIndex(0)
    }
  }, [filteredPrompts, selectedIndex])

  // Scroll selected item into view
  React.useEffect(() => {
    if (selectedRef.current && listRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          hide()
          break

        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, filteredPrompts.length - 1))
          break

        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break

        case 'Enter':
          event.preventDefault()
          if (filteredPrompts[selectedIndex]) {
            selectPrompt(filteredPrompts[selectedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredPrompts, selectedIndex])

  const hide = () => {
    setIsVisible(false)
    if (window.electron?.ipcRenderer) {
      // Use the same hide mechanism as the original overlay
      window.electron.ipcRenderer.send('overlay:hide')
    }
  }

  const selectPrompt = (prompt: Prompt) => {
    if (window.electron?.ipcRenderer) {
      // Use the same selection mechanism as the original overlay
      window.electron.ipcRenderer.send('overlay:select-prompt', prompt.content)
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in slide-in-from-top-4 fade-in-80 duration-150">
        <div className="rounded-lg border border-border/50 bg-black/95 backdrop-blur-sm shadow-xl">
          {/* Header with search */}
          <div className="p-3 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                placeholder="Search prompts..."
                className="pl-10 pr-4 py-2 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{filteredPrompts.length} results</span>
              <span>{process.platform === 'darwin' ? '⌘⇧O' : 'Ctrl+Shift+O'}</span>
            </div>
          </div>

          {/* Results list */}
          <div ref={listRef} className="max-h-80 overflow-y-auto">
            {filteredPrompts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? 'No prompts match your search' : 'No prompts found'}
              </div>
            ) : (
              <div className="p-1">
                {filteredPrompts.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    ref={index === selectedIndex ? selectedRef : null}
                    onClick={() => selectPrompt(prompt)}
                    className={`
                      p-2 mx-1 mb-1 rounded cursor-pointer transition-colors
                      ${
                        index === selectedIndex
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-medium truncate text-foreground">
                            {prompt.title}
                          </h3>
                          {prompt.isFavorite && (
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500 flex-shrink-0" />
                          )}
                          {prompt.source && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted/80 text-muted-foreground rounded uppercase flex-shrink-0">
                              {prompt.source}
                            </span>
                          )}
                        </div>

                        {/* Content preview */}
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {stripHtml(prompt.content)}
                        </p>

                        {/* Meta info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                          <span className="truncate">{prompt.categoryPath}</span>
                          {prompt.timeUpdated && (
                            <span className="flex-shrink-0 ml-2">
                              {new Date(prompt.timeUpdated).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {index === selectedIndex && (
                        <div className="flex-shrink-0 self-start mt-0.5">
                          <div className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                            ↵
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
          <div className="px-3 py-2 border-t border-border/30 bg-muted/30 text-xs text-muted-foreground rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
              <span>Press {process.platform === 'darwin' ? '⌘⇧O' : 'Ctrl+Shift+O'} to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
