import * as React from 'react'
import { createPortal } from 'react-dom'
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

import { getPromptPaletteShortcutDisplay, PROMPT_INSERTION_PALETTE_OPEN_EVENT } from './shortcut'

type EditableSnapshot =
  | {
      type: 'input'
      element: HTMLInputElement | HTMLTextAreaElement
      selectionStart: number
      selectionEnd: number
      selectionDirection: 'forward' | 'backward' | 'none'
    }
  | {
      type: 'content-editable'
      element: HTMLElement
      range: Range
    }

type Position = {
  top: number
  left: number
  width: number
}

// Define the Prompt type locally since we can't import it directly
type Prompt = {
  id: string
  title: string
  content: string
  categoryPath?: string
  isFavorite?: boolean
  source?: string
  timeCreated?: string
  timeUpdated?: string
  timeDeleted?: string
}

function isInputElement(
  node: Element | null
): (HTMLInputElement & { type: string }) | HTMLTextAreaElement | null {
  if (!node) return null
  if (node instanceof HTMLTextAreaElement) return node
  if (node instanceof HTMLInputElement) return node
  return null
}

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!element) return false
  if (element instanceof HTMLTextAreaElement) return true
  if (element instanceof HTMLInputElement) {
    const type = element.type?.toLowerCase?.()
    if (type === 'password') return false
    if (element.readOnly || element.disabled) return false
    return [
      'email',
      'number',
      'search',
      'tel',
      'text',
      'url',
      'week',
      'month',
      'time',
      'datetime-local'
    ].includes(type)
  }
  const htmlElement = element as HTMLElement
  if (htmlElement.dataset?.promptPaletteIgnored === 'true') return false
  if (htmlElement.isContentEditable) return true
  return false
}

function captureSnapshot(element: HTMLElement): EditableSnapshot | null {
  if (!element.isConnected) {
    return null
  }

  const input = isInputElement(element)
  if (input) {
    return {
      type: 'input',
      element: input,
      selectionStart: input.selectionStart ?? input.value.length,
      selectionEnd: input.selectionEnd ?? input.value.length,
      selectionDirection: input.selectionDirection ?? 'none'
    }
  }

  if (element.isContentEditable) {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange()
      return {
        type: 'content-editable',
        element,
        range
      }
    }
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    return {
      type: 'content-editable',
      element,
      range
    }
  }

  return null
}

function restoreSelection(snapshot: EditableSnapshot) {
  if (!snapshot.element.isConnected) {
    return
  }

  snapshot.element.focus({ preventScroll: true })

  if (snapshot.type === 'input') {
    snapshot.element.setSelectionRange(
      snapshot.selectionStart,
      snapshot.selectionEnd,
      snapshot.selectionDirection
    )
  } else {
    const selection = window.getSelection()
    if (!selection) return

    selection.removeAllRanges()
    const range = snapshot.range.cloneRange()
    selection.addRange(range)
  }
}

function insertText(snapshot: EditableSnapshot, text: string) {
  if (!snapshot.element.isConnected) {
    return
  }

  if (snapshot.type === 'input') {
    const { element } = snapshot
    const start = element.selectionStart ?? snapshot.selectionStart
    const end = element.selectionEnd ?? snapshot.selectionEnd

    element.setRangeText(text, start, end, 'end')
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertText'
    })
    element.dispatchEvent(inputEvent)
    return
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)

  const cursor = document.createRange()
  cursor.setStartAfter(node)
  cursor.collapse(true)

  selection.removeAllRanges()
  selection.addRange(cursor)

  snapshot.element.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertText'
    })
  )
}

export function PromptInsertionPalette() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([])

  // Add refs to track state
  const isOpeningRef = React.useRef(false)
  const hasRequestedDataRef = React.useRef(false)

  const [state, setState] = React.useState<{
    snapshot: EditableSnapshot
    position: Position
  } | null>(null)

  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [includeTitle, setIncludeTitle] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const lastEditableRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 120)

    return () => window.clearTimeout(handle)
  }, [query])

  React.useEffect(() => {
    const handler = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null
      if (isEditableElement(target)) {
        lastEditableRef.current = target
      }
    }

    document.addEventListener('focusin', handler)
    return () => document.removeEventListener('focusin', handler)
  }, [])

  const updatePosition = React.useCallback(
    (snapshot: EditableSnapshot, options?: { preserveSnapshot?: boolean }) => {
      if (!snapshot.element.isConnected) {
        setState(null)
        return
      }
      const rect = snapshot.element.getBoundingClientRect()
      const scrollY = window.scrollY ?? window.pageYOffset
      const scrollX = window.scrollX ?? window.pageXOffset
      const width = Math.min(Math.max(rect.width, 280), 420)
      let left = rect.left + scrollX
      const maxLeft = window.innerWidth - width - 12
      left = Math.max(12, Math.min(left, maxLeft))
      const top = rect.top + scrollY

      setState((prev) => {
        const nextSnapshot = options?.preserveSnapshot && prev ? prev.snapshot : snapshot
        return {
          snapshot: nextSnapshot,
          position: { top, left, width }
        }
      })
    },
    []
  )

  const closePalette = React.useCallback(
    (focusAnchor: boolean) => {
      setState(null)
      setQuery('')
      setIncludeTitle(false)
      isOpeningRef.current = false
      hasRequestedDataRef.current = false

      if (focusAnchor && state?.snapshot) {
        requestAnimationFrame(() => restoreSelection(state.snapshot))
      }
    },
    [state]
  )

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (!(event.shiftKey && event.key.toLowerCase() === 'o')) return
      if (!event.metaKey && !event.ctrlKey) return

      const active = document.activeElement as HTMLElement | null
      if (!isEditableElement(active)) return

      event.preventDefault()
      event.stopPropagation()

      // Prevent multiple openings
      if (isOpeningRef.current) {
        console.log('Palette already opening, ignoring duplicate shortcut')
        return
      }

      console.log('Keyboard shortcut triggered for prompt palette')
      const snapshot = captureSnapshot(active)
      if (!snapshot) return

      isOpeningRef.current = true
      lastEditableRef.current = snapshot.element
      updatePosition(snapshot)
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [updatePosition])

  React.useEffect(() => {
    const handler = (event: Event) => {
      console.log('Custom event handler triggered for prompt palette')

      // Prevent multiple openings
      if (isOpeningRef.current) {
        console.log('Palette already opening, ignoring duplicate event')
        return
      }

      const active = document.activeElement as HTMLElement | null
      const anchor = isEditableElement(active) ? active : lastEditableRef.current
      if (!anchor || !anchor.isConnected) {
        console.log('No valid anchor element found for prompt palette')
        if (!anchor?.isConnected) {
          lastEditableRef.current = null
        }
        return
      }

      const snapshot = captureSnapshot(anchor)
      if (!snapshot) {
        console.log('Failed to capture snapshot for prompt palette')
        return
      }

      const detail = (event as CustomEvent<{ includeTitle?: boolean }>).detail
      if (typeof detail?.includeTitle === 'boolean') {
        setIncludeTitle(detail.includeTitle)
      }
      lastEditableRef.current = snapshot.element
      console.log('Opening prompt palette with snapshot')

      isOpeningRef.current = true
      updatePosition(snapshot)
    }

    document.addEventListener(PROMPT_INSERTION_PALETTE_OPEN_EVENT, handler as EventListener)
    return () =>
      document.removeEventListener(PROMPT_INSERTION_PALETTE_OPEN_EVENT, handler as EventListener)
  }, [updatePosition])

  React.useEffect(() => {
    if (!window.promptCapture?.onOpenPalette) {
      console.warn('promptCapture.onOpenPalette not available')
      return
    }

    const unsubscribe = window.promptCapture.onOpenPalette(() => {
      console.log('Received onOpenPalette event from main process')

      // Prevent multiple openings
      if (isOpeningRef.current) {
        console.log('Palette already opening, ignoring duplicate main process event')
        return
      }

      document.dispatchEvent(new CustomEvent(PROMPT_INSERTION_PALETTE_OPEN_EVENT))
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  React.useEffect(() => {
    if (!state) return

    const handleScroll = () => updatePosition(state.snapshot, { preserveSnapshot: true })
    const handleResize = () => updatePosition(state.snapshot, { preserveSnapshot: true })

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [state, updatePosition])

  React.useEffect(() => {
    if (!state) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!containerRef.current) return
      if (
        containerRef.current.contains(target) ||
        state.snapshot.element.contains(target as Node)
      ) {
        return
      }
      closePalette(true)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePalette(true)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [state, closePalette])

  React.useEffect(() => {
    if (!state?.snapshot.element.isConnected) {
      setState(null)
      isOpeningRef.current = false
      hasRequestedDataRef.current = false
    }
  }, [state?.snapshot.element])

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    if (state) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [state])

  // Request prompt data when the palette opens
  React.useEffect(() => {
    if (state && !hasRequestedDataRef.current && window.electron?.ipcRenderer) {
      hasRequestedDataRef.current = true
      console.log('Requesting prompt data from main window')
      window.electron.ipcRenderer.send('overlay:request-prompts')
    }
  }, [state])

  // Listen for prompt data updates from main window
  React.useEffect(() => {
    if (!window.electron?.ipcRenderer) {
      return
    }

    const handlePromptData = (_event: any, data: Prompt[]) => {
      console.log('Received prompt data from main window:', data?.length || 0)
      setPrompts(data || [])
    }

    window.electron.ipcRenderer.on('overlay:prompts-response', handlePromptData)

    return () => {
      window.electron.ipcRenderer.removeListener('overlay:prompts-response', handlePromptData)
    }
  }, [])

  const handleSelectPrompt = React.useCallback(
    (promptID: string) => {
      if (!state) return
      const prompt = prompts.find((item) => item.id === promptID)
      if (!prompt) return

      const textToInsert = includeTitle ? `${prompt.title}\n\n${prompt.content}` : prompt.content

      restoreSelection(state.snapshot)
      insertText(state.snapshot, textToInsert)
      closePalette(false)
    },
    [closePalette, includeTitle, prompts, state]
  )

  React.useEffect(() => {
    if (!state) return

    const observer = new MutationObserver(() => {
      if (!state.snapshot.element.isConnected) {
        setState(null)
        isOpeningRef.current = false
        hasRequestedDataRef.current = false
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [state])

  // Add a check to ensure we have valid prompt data
  const hasValidPrompts = prompts && Array.isArray(prompts) && prompts.length > 0
  const isLoadingPrompts = prompts === undefined || prompts === null

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

  if (!state) {
    return null
  }

  const overlay = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Prompt insertion palette"
      style={{
        position: 'absolute',
        top: state.position.top,
        left: state.position.left,
        width: state.position.width,
        transform: 'translateY(calc(-100% - 8px))',
        zIndex: 60
      }}
      className="rounded-lg border border-border/60 bg-popover p-2 shadow-lg"
    >
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
            {debouncedQuery
              ? 'No prompts match your search'
              : isLoadingPrompts
                ? 'Loading prompts...'
                : hasValidPrompts
                  ? 'No prompts captured yet'
                  : 'No prompts available'}
          </CommandEmpty>
          <CommandGroup heading="Prompts">
            {filteredPrompts.map((prompt) => (
              <CommandItem
                key={prompt.id}
                value={prompt.id}
                keywords={[prompt.title, prompt.content.slice(0, 200)]}
                className="flex items-start gap-2"
                onSelect={handleSelectPrompt}
              >
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
                    {prompt.content}
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
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {shortcutHint}
        </span>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
