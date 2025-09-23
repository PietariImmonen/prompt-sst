import { useState } from 'react'
import { Button } from '@desktop/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@desktop/components/ui/card'
import { Input } from '@desktop/components/ui/input'
import { Label } from '@desktop/components/ui/label'
import { Switch } from '@desktop/components/ui/switch'

import { Shell } from '@desktop/components/layout/shell'

import { useReplicache, useSubscribe } from '@/hooks/use-replicache'

import { UserSettingsStore } from '@/data/user-settings'
import { UserSettings } from '@sst-replicache-template/core/models/UserSettings'

const SettingsPage = () => {
  const rep = useReplicache()
  const [isSaving, _setIsSaving] = useState(false)
  const [isLoading, _setIsLoading] = useState(true)

  // Fetch current settings using Replicache
  const userSettings = useSubscribe(UserSettingsStore.get(), {
    dependencies: []
  })

  console.log('SettingsPage: userSettings', userSettings)

  const updateSettings = async (settings: UserSettings) => {
    if (!rep) return
    try {
      await rep.mutate.user_settings_update(settings)
    } catch (error) {
      console.error('SettingsPage: error updating settings', error)
    }
  }

  if (isLoading) {
    return (
      <Shell header={<div>Settings Page</div>}>
        <Shell.Main>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </Shell.Main>
      </Shell>
    )
  }
  if (!userSettings) {
    return (
      <Shell header={<div>Settings Page</div>}>
        <Shell.Main>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </Shell.Main>
      </Shell>
    )
  }

  return (
    <Shell header={<div>Settings Page</div>}>
      <Shell.Main>
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your Prompt Desktop experience</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Customize your keyboard shortcuts for capturing prompts and opening the palette
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut-capture">Prompt Capture Shortcut</Label>
                <Input
                  id="shortcut-capture"
                  value={userSettings.shortcutCapture}
                  onChange={(e) =>
                    updateSettings({ ...userSettings, shortcutCapture: e.target.value || '' })
                  }
                  placeholder="CmdOrCtrl+Shift+P"
                />
                <p className="text-sm text-muted-foreground">
                  Shortcut to capture selected text as a prompt
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortcut-palette">Prompt Palette Shortcut</Label>
                <Input
                  id="shortcut-palette"
                  value={userSettings.shortcutPalette}
                  onChange={(e) =>
                    updateSettings({ ...userSettings, shortcutPalette: e.target.value || '' })
                  }
                  placeholder="CmdOrCtrl+Shift+O"
                />
                <p className="text-sm text-muted-foreground">
                  Shortcut to open the prompt insertion palette
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto Capture</CardTitle>
              <CardDescription>Control automatic prompt capture behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Auto Capture</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically capture prompts when detected
                  </p>
                </div>
                <Switch
                  checked={userSettings.enableAutoCapture}
                  onCheckedChange={(checked) =>
                    updateSettings({ ...userSettings, enableAutoCapture: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => updateSettings(userSettings)} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Shell.Main>
    </Shell>
  )
}

export default SettingsPage
