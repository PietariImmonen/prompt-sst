import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { UserSettingsStore } from '@/data/user-settings'
import { X, Plus } from 'lucide-react'

// Common language options for transcription
const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fi', name: 'Finnish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' }
]

export function TranscriptionSettings() {
  const rep = useReplicache()

  // Fetch current settings using Replicache
  const userSettings = useSubscribe(UserSettingsStore.get(), {
    dependencies: []
  })

  // Local state for unsaved changes
  const [languages, setLanguages] = React.useState<string[]>([])
  const [aiContext, setAiContext] = React.useState('')
  const [newLanguage, setNewLanguage] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)

  // Initialize from user settings
  React.useEffect(() => {
    if (userSettings) {
      // languageHints is now a JSONB array
      const langs = userSettings.languageHints
      setLanguages(Array.isArray(langs) && langs.length > 0 ? langs : ['en'])
      setAiContext(userSettings.aiContext || '')
    }
  }, [userSettings])

  // Check if there are unsaved changes
  React.useEffect(() => {
    if (!userSettings) return

    const currentLanguages = Array.isArray(userSettings.languageHints)
      ? userSettings.languageHints
      : ['en']

    const languagesChanged =
      languages.length !== currentLanguages.length ||
      languages.some((lang, i) => lang !== currentLanguages[i])
    const contextChanged = aiContext !== (userSettings.aiContext || '')

    setHasChanges(languagesChanged || contextChanged)
  }, [languages, aiContext, userSettings])

  const addLanguage = (code: string) => {
    if (code && !languages.includes(code)) {
      setLanguages([...languages, code])
      setNewLanguage('')
    }
  }

  const removeLanguage = (code: string) => {
    setLanguages(languages.filter((l) => l !== code))
  }

  const handleSave = async () => {
    if (!rep || !userSettings) return

    setIsSaving(true)
    try {
      // languageHints is now a JSONB array, save directly
      await rep.mutate.user_settings_update({
        ...userSettings,
        languageHints: languages,
        aiContext: aiContext || null
      })

      // Send updated language hints to main process for transcription overlay
      if (window.electron?.ipcRenderer) {
        window.electron.ipcRenderer.send('transcription:update-language-hints', languages)
        console.log('🌐 Sent language hints to main process:', languages)
      }

      setHasChanges(false)
    } catch (error) {
      console.error('TranscriptionSettings: error saving settings', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!userSettings) {
    return (
      <Card className="bg-card/80 backdrop-blur border-border/60">
        <CardHeader>
          <CardTitle>Transcription Settings</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground/20"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getLanguageName = (code: string) => {
    return COMMON_LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase()
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-border/60">
      <CardHeader>
        <CardTitle>Transcription Settings</CardTitle>
        <CardDescription>
          Configure language hints and AI context for voice transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language Hints */}
        <div className="space-y-3">
          <Label>Language Hints</Label>
          <p className="text-xs text-muted-foreground">
            Select languages to improve transcription accuracy. The transcription engine will use
            these as hints.
          </p>

          {/* Selected Languages */}
          <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 rounded-md border border-border/40 bg-muted/20">
            {languages.length > 0 ? (
              languages.map((code) => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {getLanguageName(code)}
                  <button
                    onClick={() => removeLanguage(code)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No languages selected</span>
            )}
          </div>

          {/* Quick Add Common Languages */}
          <div className="space-y-2">
            <p className="text-xs font-medium">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_LANGUAGES.filter((lang) => !languages.includes(lang.code)).map((lang) => (
                <Button
                  key={lang.code}
                  variant="outline"
                  size="sm"
                  onClick={() => addLanguage(lang.code)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {lang.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Language Code */}
          <div className="flex gap-2">
            <Input
              placeholder="Custom language code (e.g., 'no' for Norwegian)"
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value.toLowerCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLanguage(newLanguage)
                }
              }}
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => addLanguage(newLanguage)}
              disabled={!newLanguage}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Context */}
        <div className="space-y-3">
          <Label htmlFor="ai-context">AI Context</Label>
          <p className="text-xs text-muted-foreground">
            Provide context about your role, domain, or common terminology to improve AI
            understanding and transcription quality.
          </p>
          <Textarea
            id="ai-context"
            placeholder="Example: I'm a software engineer working on web applications. Common terms include React, TypeScript, API, database..."
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            rows={4}
            className="resize-none text-sm"
          />
        </div>

        {/* Save Button */}
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
      </CardContent>
    </Card>
  )
}
