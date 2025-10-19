import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { UserSettingsStore } from '@/data/user-settings'

import { useShortcutSync } from '@/hooks/use-shortcut-sync'
import { saveShortcuts } from '@/lib/shortcut-storage'
import { ChevronDown } from 'lucide-react'

interface ShortcutState {
  capture: string
  palette: string
  transcribe: string
}

export function ShortcutSettings() {
  const rep = useReplicache()
  const { lastUpdateResult } = useShortcutSync()

  // Fetch current settings using Replicache
  const userSettings = useSubscribe(UserSettingsStore.get(), {
    dependencies: []
  })

  // Local state for unsaved shortcuts
  const [shortcuts, setShortcuts] = React.useState<ShortcutState>({
    capture: '',
    palette: '',
    transcribe: ''
  })

  const [isSaving, setIsSaving] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [recordingField, setRecordingField] = React.useState<keyof ShortcutState | null>(null)
  const [pressedKeys, setPressedKeys] = React.useState<Set<string>>(new Set())
  const [isGuideOpen, setIsGuideOpen] = React.useState(false)

  // Refs for input fields
  const captureInputRef = React.useRef<HTMLInputElement>(null)
  const paletteInputRef = React.useRef<HTMLInputElement>(null)
  const transcribeInputRef = React.useRef<HTMLInputElement>(null)

  // Initialize shortcuts from user settings
  React.useEffect(() => {
    if (userSettings) {
      setShortcuts({
        capture: userSettings.shortcutCapture || 'CmdOrCtrl+Shift+P',
        palette: userSettings.shortcutPalette || 'CmdOrCtrl+Shift+O',
        transcribe: userSettings.shortcutTranscribe || 'CmdOrCtrl+Shift+F'
      })
    }
  }, [userSettings])

  // Check if there are unsaved changes
  React.useEffect(() => {
    if (!userSettings) return
    const hasChanged =
      shortcuts.capture !== userSettings.shortcutCapture ||
      shortcuts.palette !== userSettings.shortcutPalette ||
      shortcuts.transcribe !== userSettings.shortcutTranscribe
    setHasChanges(hasChanged)
  }, [shortcuts, userSettings])

  const normalizeKey = (key: string): string | null => {
    // Normalize modifier keys
    if (key === 'Control' || key === 'Meta' || key === 'Command') {
      return 'CmdOrCtrl'
    }
    if (key === 'Alt') {
      return 'Alt'
    }
    if (key === 'Shift') {
      return 'Shift'
    }

    // Ignore some keys
    if (key === 'Unidentified' || key === ' ') {
      return null
    }

    // Convert single characters to uppercase
    if (key.length === 1) {
      return key.toUpperCase()
    }

    // Handle special keys
    if (key.startsWith('Arrow')) {
      return key // Keep ArrowUp, ArrowDown, etc.
    }
    if (['Escape', 'Enter', 'Tab', 'Backspace', 'Delete'].includes(key)) {
      return key
    }
    if (key.startsWith('F') && /^F\d+$/.test(key)) {
      return key // Keep F1, F2, etc.
    }

    return key
  }

  const handleKeyDown = (field: keyof ShortcutState) => (event: React.KeyboardEvent) => {
    if (recordingField !== field) return

    event.preventDefault()
    event.stopPropagation()

    const normalizedKey = normalizeKey(event.key)
    if (normalizedKey) {
      setPressedKeys((prev) => {
        const newSet = new Set(prev)
        newSet.add(normalizedKey)
        return newSet
      })

      // Update display to show currently pressed keys
      if (pressedKeys.size > 0 || normalizedKey) {
        const currentKeys = new Set(pressedKeys)
        currentKeys.add(normalizedKey)
        setShortcuts((prev) => ({
          ...prev,
          [field]: Array.from(currentKeys).join('+')
        }))
      }
    }
  }

  const handleKeyUp = (field: keyof ShortcutState) => (event: React.KeyboardEvent) => {
    if (recordingField !== field) return

    event.preventDefault()
    event.stopPropagation()

    // When any key is released, finalize the combination
    if (pressedKeys.size >= 2) {
      const combo = Array.from(pressedKeys).join('+')
      setShortcuts((prev) => ({ ...prev, [field]: combo }))
      setRecordingField(null)
      setPressedKeys(new Set())
    } else if (pressedKeys.size === 1) {
      // If only one key was pressed, show error or reset
      setShortcuts((prev) => ({ ...prev, [field]: 'Press at least 2 keys...' }))
      setPressedKeys(new Set())
    }
  }

  const startRecording = (field: keyof ShortcutState) => {
    setRecordingField(field)
    setPressedKeys(new Set())
    setShortcuts((prev) => ({ ...prev, [field]: 'Press keys...' }))

    // Focus the input immediately
    setTimeout(() => {
      if (field === 'capture') captureInputRef.current?.focus()
      else if (field === 'palette') paletteInputRef.current?.focus()
      else if (field === 'transcribe') transcribeInputRef.current?.focus()
    }, 0)
  }

  const cancelRecording = (field: keyof ShortcutState) => {
    setRecordingField(null)
    setPressedKeys(new Set())
    // Restore original value
    if (userSettings) {
      const originalValue =
        field === 'capture'
          ? userSettings.shortcutCapture
          : field === 'palette'
            ? userSettings.shortcutPalette
            : userSettings.shortcutTranscribe
      setShortcuts((prev) => ({ ...prev, [field]: originalValue }))
    }
  }

  const handleSave = async () => {
    if (!rep || !userSettings) return

    setIsSaving(true)
    try {
      // Clean up shortcuts - replace placeholder text with original values
      const cleanedShortcuts = {
        capture:
          shortcuts.capture === 'Press keys...' || shortcuts.capture === 'Press at least 2 keys...'
            ? userSettings.shortcutCapture
            : shortcuts.capture,
        palette:
          shortcuts.palette === 'Press keys...' || shortcuts.palette === 'Press at least 2 keys...'
            ? userSettings.shortcutPalette
            : shortcuts.palette,
        transcribe:
          shortcuts.transcribe === 'Press keys...' ||
          shortcuts.transcribe === 'Press at least 2 keys...'
            ? userSettings.shortcutTranscribe
            : shortcuts.transcribe
      }

      // Update database via Replicache
      await rep.mutate.user_settings_update({
        ...userSettings,
        shortcutCapture: cleanedShortcuts.capture,
        shortcutPalette: cleanedShortcuts.palette,
        shortcutTranscribe: cleanedShortcuts.transcribe
      })

      // Save to localStorage
      saveShortcuts(cleanedShortcuts)

      // Send to main process via IPC
      if (window.shortcuts) {
        await window.shortcuts.update(cleanedShortcuts)
      }

      // Update local state with cleaned shortcuts
      setShortcuts(cleanedShortcuts)
      setHasChanges(false)
    } catch (error) {
      console.error('ShortcutSettings: error saving settings', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!userSettings) {
    return (
      <Card className="bg-card/80 backdrop-blur border-border/60">
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>Loading shortcuts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground/20"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-border/60">
      <CardHeader>
        <CardTitle>Keyboard Shortcuts</CardTitle>
        <CardDescription>
          Customize global keyboard shortcuts for quick access to features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions - Collapsible */}
        <Collapsible open={isGuideOpen} onOpenChange={setIsGuideOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between p-2 h-auto hover:bg-muted/50"
            >
              <span className="text-xs font-medium flex items-center gap-2">
                <span>ℹ️</span>
                How to set shortcuts
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isGuideOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3 space-y-2">
              <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Click "Record" next to the shortcut you want to change</li>
                <li>Press and hold your key combination (2-3 keys)</li>
                <li>Release any key to capture the combination</li>
                <li>Click "Record" again to try a different combination</li>
                <li>Click "Save Changes" when satisfied</li>
              </ol>
              <p className="text-xs text-muted-foreground ml-4 mt-1">
                💡 Tip: Use Cmd/Ctrl, Shift, Alt with a letter or function key
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="shortcut-capture">Prompt Capture Shortcut</Label>
            {recordingField === 'capture' && (
              <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                Recording...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={captureInputRef}
                id="shortcut-capture"
                value={shortcuts.capture}
                onKeyDown={handleKeyDown('capture')}
                onKeyUp={handleKeyUp('capture')}
                placeholder="Not set"
                className={`font-mono text-sm pr-20 ${recordingField === 'capture' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                readOnly
              />
              {recordingField === 'capture' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Press keys...
                </div>
              )}
            </div>
            {recordingField === 'capture' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelRecording('capture')}
                className="shrink-0"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startRecording('capture')}
                className="shrink-0"
              >
                Record
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Captures selected text and saves it as a prompt
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="shortcut-palette">Prompt Palette Shortcut</Label>
            {recordingField === 'palette' && (
              <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                Recording...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={paletteInputRef}
                id="shortcut-palette"
                value={shortcuts.palette}
                onKeyDown={handleKeyDown('palette')}
                onKeyUp={handleKeyUp('palette')}
                placeholder="Not set"
                className={`font-mono text-sm pr-20 ${recordingField === 'palette' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                readOnly
              />
              {recordingField === 'palette' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Press keys...
                </div>
              )}
            </div>
            {recordingField === 'palette' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelRecording('palette')}
                className="shrink-0"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startRecording('palette')}
                className="shrink-0"
              >
                Record
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Opens the prompt insertion palette for quick access
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="shortcut-transcribe">Transcription Shortcut</Label>
            {recordingField === 'transcribe' && (
              <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
                Recording...
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={transcribeInputRef}
                id="shortcut-transcribe"
                value={shortcuts.transcribe}
                onKeyDown={handleKeyDown('transcribe')}
                onKeyUp={handleKeyUp('transcribe')}
                placeholder="Not set"
                className={`font-mono text-sm pr-20 ${recordingField === 'transcribe' ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                readOnly
              />
              {recordingField === 'transcribe' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Press keys...
                </div>
              )}
            </div>
            {recordingField === 'transcribe' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelRecording('transcribe')}
                className="shrink-0"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => startRecording('transcribe')}
                className="shrink-0"
              >
                Record
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Starts or stops voice-to-text transcription
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="default">
            {isSaving ? (
              <>
                <span className="mr-2">⏳</span>
                Saving...
              </>
            ) : hasChanges ? (
              <>
                <span className="mr-2">💾</span>
                Save Changes
              </>
            ) : (
              <>
                <span className="mr-2">✓</span>
                No Changes
              </>
            )}
          </Button>
        </div>

        {lastUpdateResult && lastUpdateResult.requiresRestart && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <div className="flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <p className="font-medium">Restart Required</p>
                <p className="text-xs mt-1">
                  {lastUpdateResult.message ||
                    'Some shortcuts require an app restart to take effect.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {lastUpdateResult && !lastUpdateResult.requiresRestart && lastUpdateResult.success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 p-3 text-sm text-green-800 dark:text-green-200">
            <div className="flex items-start gap-2">
              <span className="text-base">✅</span>
              <div>
                <p className="font-medium">Success</p>
                <p className="text-xs mt-1">
                  {lastUpdateResult.message || 'Shortcuts updated successfully!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
