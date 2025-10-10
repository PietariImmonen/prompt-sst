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
        e.preventDefault()
        console.log('✅ Capture shortcut detected!')
        setCapturePressed(true)
      }

      // Check for Cmd/Ctrl+Shift+O
      if (isModPressed && e.shiftKey && (e.key.toLowerCase() === 'o' || e.code === 'KeyO')) {
        e.preventDefault()
        console.log('✅ Palette shortcut detected!')
        setPalettePressed(true)
      }
    }

    // Listen to keyboard events with capture phase to ensure we catch them
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isMac])

  const allPressed = capturePressed && palettePressed

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Try the keyboard shortcuts</h2>
        <p className="text-sm text-muted-foreground">Press both shortcuts to continue</p>
      </div>

      {/* First Box: Capture Shortcut */}
      <div
        className={`
          rounded-lg border-2 p-3.5 transition-all
          ${
            capturePressed
              ? 'border-green-500 bg-green-500/10'
              : 'border-purple-500/30 bg-purple-500/5'
          }
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold">Capture Prompt</h3>
          </div>
          {capturePressed && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Press</span>
          <kbd className="rounded bg-muted px-2 py-1 text-xs font-semibold text-foreground">
            {modKey} + Shift + C
          </kbd>
        </div>
      </div>

      {/* Second Box: Palette Shortcut */}
      <div
        className={`
          rounded-lg border-2 p-3.5 transition-all
          ${
            palettePressed
              ? 'border-green-500 bg-green-500/10'
              : capturePressed
                ? 'border-purple-500/30 bg-purple-500/5'
                : 'border-border/30 bg-muted/10 opacity-50'
          }
        `}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold">Open Prompt Palette</h3>
          </div>
          {palettePressed && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Press</span>
          <kbd className="rounded bg-muted px-2 py-1 text-xs font-semibold text-foreground">
            {modKey} + Shift + O
          </kbd>
        </div>
      </div>

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
