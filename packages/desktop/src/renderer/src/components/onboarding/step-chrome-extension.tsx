import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Chrome, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface StepChromeExtensionProps {
  onNext: () => Promise<void>
}

export function StepChromeExtension({ onNext }: StepChromeExtensionProps) {
  const auth = useAuth()
  const userEmail = auth.current?.email || 'your account'
  const [isCompleting, setIsCompleting] = React.useState(false)

  const handleContinue = async () => {
    setIsCompleting(true)
    try {
      await onNext()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setIsCompleting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4">
            <Chrome className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Install Chrome Extension</h2>
        <p className="text-muted-foreground">
          Automatically capture prompts from ChatGPT, Claude, and Gemini
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-400">
              1
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Download the extension</h3>
              <p className="text-sm text-muted-foreground">
                Get the Chrome extension from the Chrome Web Store
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-400">
              2
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Sign in with the same email</h3>
              <div className="rounded bg-muted px-3 py-1.5 text-sm font-mono text-foreground">
                {userEmail}
              </div>
              <p className="text-xs text-muted-foreground">
                Use this email to sync your prompts across devices
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-400">
              3
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Start capturing</h3>
              <p className="text-sm text-muted-foreground">
                Visit ChatGPT, Claude, or Gemini and your prompts will be automatically saved
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
          <p className="text-sm text-blue-400">
            <strong>Development mode:</strong> Load the extension from{' '}
            <code className="rounded bg-blue-500/20 px-1 py-0.5 text-xs">
              packages/chrome-plugin/build/chrome-mv3-prod
            </code>
          </p>
        </div>
      </div>

      <Button
        onClick={handleContinue}
        disabled={isCompleting}
        className="w-full rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/20 disabled:opacity-50 disabled:hover:scale-100"
        size="lg"
      >
        {isCompleting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Setting up your workspace...
          </>
        ) : (
          'Get Started'
        )}
      </Button>
    </div>
  )
}
