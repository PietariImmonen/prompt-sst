import * as React from 'react'
import { Star } from 'lucide-react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Switch } from '@/components/ui/switch'
import { useSubscribe } from '@/hooks/use-replicache'
import { PromptStore } from '@/data/prompt-store'
import { stripHtml } from '@/lib/utils'

import { getPromptPaletteShortcutDisplay } from './shortcut'

export function PromptInsertionOverlay() {
  const prompts = useSubscribe(PromptStore.list(), { default: [] })

  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [includeTitle, setIncludeTitle] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(false)

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const autoCloseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 120)

    return () => window.clearTimeout(handle)
  }, [query])

  // Listen for the palette open event from main process
  React.useEffect(() => {
    console.log('Overlay: Setting up event listeners')

    if (!window.promptCapture?.onOpenPalette) {
      console.warn('promptCapture.onOpenPalette not available in overlay')
      return
    }

    const unsubscribe = window.promptCapture.onOpenPalette(() => {
      console.log('Overlay: Received onOpenPalette event from main process')
      setIsVisible(true)
      setQuery('')
      setIncludeTitle(false)

      // Clear any existing auto-close timeout
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current)
      }

      // Set auto-close timeout (30 seconds) to prevent stuck overlays
      autoCloseTimeoutRef.current = setTimeout(() => {
        console.log('Overlay: Auto-closing after timeout')
        setIsVisible(false)
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('overlay:force-close')
        }
      }, 30000)

      // Focus the input after a brief delay to ensure the window is ready
      setTimeout(() => {
        console.log('Overlay: Focusing input field')
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 150)
    })

    // Also show immediately if we're in overlay mode (for testing)
    console.log('Overlay component mounted, hash:', window.location.hash)

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Handle escape key to close
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        console.log('Overlay: Escape pressed, hiding window')
        setIsVisible(false)
        // Clear auto-close timeout
        if (autoCloseTimeoutRef.current) {
          clearTimeout(autoCloseTimeoutRef.current)
          autoCloseTimeoutRef.current = null
        }
        // Use electron API to hide the window properly
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('overlay:hide')
        }
      }
      // Force close with Cmd+Escape (for when overlay gets stuck)
      if (event.key === 'Escape' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        console.log('Overlay: Force close triggered')
        setIsVisible(false)
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('overlay:force-close')
        }
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isVisible])

  const handleSelectPrompt = React.useCallback(
    (promptID: string) => {
      const prompt = prompts.find((item) => item.id === promptID)
      if (!prompt) return

      const textToInsert = includeTitle ? `${prompt.title}\n\n${prompt.content}` : prompt.content

      console.log('Overlay: Selected prompt, copying to clipboard')
      // Copy the selected prompt to clipboard for insertion
      navigator.clipboard
        .writeText(textToInsert)
        .then(() => {
          console.log('Overlay: Prompt copied to clipboard, hiding window')
          setIsVisible(false)
          // Clear auto-close timeout
          if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current)
            autoCloseTimeoutRef.current = null
          }
          // Use electron API to hide the window properly
          if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('overlay:hide')
          }
        })
        .catch((error) => {
          console.error('Failed to copy prompt to clipboard:', error)
        })
    },
    [includeTitle, prompts]
  )

  const filteredPrompts = React.useMemo(() => {
    if (!debouncedQuery) {
      return prompts.slice(0, 30)
    }

    const tokens = debouncedQuery.toLowerCase().split(/\s+/).filter(Boolean)

    const isSubsequence = (needle: string, haystack: string) => {
      if (!needle) return true
      let index = 0
      for (let i = 0; i < needle.length; i += 1) {
        const position = haystack.indexOf(needle[i]!, index)
        if (position === -1) {
          return false
        }
        index = position + 1
      }
      return true
    }

    const scored = prompts
      .map((prompt, rank) => {
        const title = prompt.title.toLowerCase()
        const content = stripHtml(prompt.content).toLowerCase()

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
            if (isSubsequence(token, title)) {
              score += 120
              tokenMatched = true
            } else if (isSubsequence(token, content)) {
              score += 60
              tokenMatched = true
            }
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

    return scored.slice(0, 30).map((entry) => entry.prompt)
  }, [debouncedQuery, prompts])

  const shortcutHint = React.useMemo(getPromptPaletteShortcutDisplay, [])

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="rounded-lg border border-border/60 bg-popover/95 backdrop-blur-sm p-2 shadow-lg">
          <Command
            value={query}
            onValueChange={setQuery}
            shouldFilter={false}
            className="border-none shadow-none"
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                event.preventDefault()
              }
            }}
          >
            <CommandInput
              ref={inputRef}
              placeholder={`Search prompts – ${shortcutHint}`}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="mt-1 max-h-64">
              <CommandEmpty>
                {debouncedQuery ? 'No prompts match your search' : 'No prompts captured yet'}
              </CommandEmpty>
              <CommandGroup heading="Prompts">
                {filteredPrompts.map((prompt) => (
                  <CommandItem
              key={prompt.id}
              keywords={[prompt.title, stripHtml(prompt.content).slice(0, 200)]}
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {prompt.title}
                      </p>
                      <p
                        className="text-xs text-muted-foreground/90 whitespace-pre-wrap break-words overflow-hidden"
                        style={{
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2
                        }}
                      >
                        {stripHtml(prompt.content)}
                      </p>
                    </div>
                    {prompt.isFavorite ? (
                      <Star className="mt-0.5 size-3.5 fill-amber-400 text-amber-500" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                id="prompt-include-title"
                checked={includeTitle}
                onCheckedChange={(checked) => setIncludeTitle(checked === true)}
              />
              <label htmlFor="prompt-include-title" className="cursor-pointer select-none">
                Include title
              </label>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-[10px] font-medium uppercase tracking-widest">
                {shortcutHint}
              </span>
              <span className="ml-2">• ESC to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
