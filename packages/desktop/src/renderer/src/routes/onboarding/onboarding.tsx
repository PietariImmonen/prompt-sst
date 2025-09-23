import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useReplicache } from '@/hooks/use-replicache'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { UserSettingsStore } from '@/data/user-settings'
import { mutators } from '@/data/mutators'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [autoCapture, setAutoCapture] = React.useState(true)
  const { rep } = useReplicache()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rep) {
      // Get the current user settings
      const settings = await rep.query(UserSettingsStore.get())
      
      if (settings) {
        // Update the autoCapture setting
        await rep.mutate.user_settings_update({
          ...settings,
          inAppOnboardingCompleted: true,
        })
      }
    }
    
    // Redirect to the main application
    navigate('/sessions')
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0E111A] p-4">
      <Card className="w-full max-w-md bg-[#151824] text-white border-[#2A2F47]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Welcome to Prompt</CardTitle>
          <CardDescription className="text-white/70">
            Let's set up your workspace.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#1C2033] rounded-lg">
              <div>
                <h3 className="font-medium">Auto-capture prompts</h3>
                <p className="text-sm text-white/60">
                  Automatically capture prompts from your AI applications
                </p>
              </div>
              <Switch
                checked={autoCapture}
                onCheckedChange={setAutoCapture}
                className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-[#2A2F47]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}