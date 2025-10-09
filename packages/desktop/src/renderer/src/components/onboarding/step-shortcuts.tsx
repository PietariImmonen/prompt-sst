import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Check, Command } from 'lucide-react'

interface StepShortcutsProps {
  onNext: () => void
  onSkip: () => void
  examplePromptTitle: string
  examplePromptContent: string
}

export function StepShortcuts({ onNext, onSkip, examplePromptContent }: StepShortcutsProps) {
  const [capturePressed, setCapturePressed] = React.useState(false)
  const [palettePressed, setPalettePressed] = React.useState(false)

  const isMac = navigator.platform.toLowerCase().includes('mac')
  const modKey = isMac ? '⌘' : 'Ctrl'

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModPressed = isMac ? e.metaKey : e.ctrlKey

      console.log(
        'Onboarding key event:',
        e.key,
        e.code,
        'meta:',
        e.metaKey,
        'ctrl:',
        e.ctrlKey,
        'shift:',
        e.shiftKey
      )

      // Check for Cmd/Ctrl+Shift+C
      if (isModPressed && e.shiftKey && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
        console.log('✅ Capture shortcut detected!')
        setCapturePressed(true)
      }

      // Check for Cmd/Ctrl+Shift+O
      if (isModPressed && e.shiftKey && (e.key.toLowerCase() === 'o' || e.code === 'KeyO')) {
        console.log('✅ Palette shortcut keypress detected!')
        setPalettePressed(true)
      }
    }

    const handleBlur = () => {
      console.log(
        '🎯 Window blur event, capturePressed:',
        capturePressed,
        'palettePressed:',
        palettePressed
      )
      // When window loses focus after capture is done, assume palette opened
      if (capturePressed && !palettePressed) {
        console.log('✅ Marking palette as opened due to blur!')
        setPalettePressed(true)
      }
    }

    const handleFocus = () => {
      console.log(
        '🎯 Window focus event, capturePressed:',
        capturePressed,
        'palettePressed:',
        palettePressed
      )
      // When window regains focus after blur, palette was definitely opened
      if (capturePressed && !palettePressed) {
        console.log('✅ Marking palette as opened due to focus!')
        setPalettePressed(true)
      }
    }

    const handleVisibilityChange = () => {
      console.log(
        '🎯 Visibility changed, hidden:',
        document.hidden,
        'capturePressed:',
        capturePressed
      )
      if (document.hidden && capturePressed && !palettePressed) {
        console.log('✅ Marking palette as opened due to visibility change!')
        setPalettePressed(true)
      }
    }

    // Listen to keyboard events
    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keydown', handleKeyDown, true)

    // Listen to focus changes
    window.addEventListener('blur', handleBlur, true)
    window.addEventListener('focus', handleFocus, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('blur', handleBlur, true)
      window.removeEventListener('focus', handleFocus, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isMac, capturePressed, palettePressed])

  // For now, just require capture to be pressed (palette detection will be fixed later)
  const allPressed = capturePressed

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Try the keyboard shortcuts</h2>
        <p className="text-muted-foreground">Complete both steps to continue</p>
      </div>

      {/* First Box: Capture Shortcut with Example Prompt */}
      <div
        className={`
          rounded-lg border-2 p-5 transition-all
          ${
            capturePressed
              ? 'border-green-500 bg-green-500/10'
              : 'border-purple-500/30 bg-purple-500/5'
          }
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold">Step 1: Capture Prompt</h3>
          </div>
          {capturePressed && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded bg-black/40 p-4 text-sm text-muted-foreground select-text">
            {examplePromptContent.split('\n')[0].substring(0, 180)}...
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Press</span>
            <kbd className="rounded bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
              {modKey} + Shift + C
            </kbd>
            <span className="text-sm text-muted-foreground">to capture</span>
          </div>
        </div>
      </div>

      {/* Second Box: Palette Shortcut */}
      <div
        className={`
          rounded-lg border-2 p-5 transition-all
          ${
            palettePressed
              ? 'border-green-500 bg-green-500/10'
              : capturePressed
                ? 'border-purple-500/30 bg-purple-500/5'
                : 'border-border/30 bg-muted/10 opacity-50'
          }
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold">Step 2: Open Prompt Palette</h3>
          </div>
          {palettePressed && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Opens the palette to search and insert your saved prompts
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Press</span>
            <kbd className="rounded bg-muted px-3 py-1.5 text-sm font-semibold text-foreground">
              {modKey} + Shift + O
            </kbd>
            <span className="text-sm text-muted-foreground">to open palette</span>
          </div>
        </div>
      </div>

      {/* Manual completion option if detection doesn't work */}
      {capturePressed && !palettePressed && (
        <div className="text-center">
          <button
            onClick={() => setPalettePressed(true)}
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            I already tried the palette shortcut (click to continue)
          </button>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        <Button onClick={onSkip} variant="outline" className="flex-1" size="lg">
          Skip
        </Button>
        <Button
          onClick={onNext}
          disabled={!allPressed}
          className="flex-1 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/20 disabled:opacity-50 disabled:hover:scale-100"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
