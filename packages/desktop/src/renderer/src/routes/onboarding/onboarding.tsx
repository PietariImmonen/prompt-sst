import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useReplicache } from '@/hooks/use-replicache'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { UserSettingsStore } from '@/data/user-settings'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [autoCapture, setAutoCapture] = React.useState(true)
  const rep = useReplicache()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (rep) {
      // Get the current user settings
      const settings = await rep.query(UserSettingsStore.get())

      if (settings) {
        // Update the autoCapture setting
        await rep.mutate.user_settings_update({
          ...settings,
          inAppOnboardingCompleted: true
        })
      }
    }

    // Redirect to the main application
    navigate('/sessions')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-card p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Welcome to Prompt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Let's set up your workspace.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
              <div>
                <h3 className="font-medium">Auto-capture prompts</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Automatically capture prompts from your AI applications
                </p>
              </div>
              <Switch checked={autoCapture} onCheckedChange={setAutoCapture} />
            </div>
          </div>
          <div className="mt-8">
            <Button
              type="submit"
              className="w-full rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/20 transition-all duration-200 hover:scale-[1.02]"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
