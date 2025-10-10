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

  const CHROME_STORE_URL = 'https://chrome.google.com/webstore' // TODO: Update with actual extension URL when published

  const handleContinue = async () => {
    setIsCompleting(true)
    try {
      await onNext()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setIsCompleting(false)
    }
  }

  const handleDownload = () => {
    window.electron?.openExternal?.(CHROME_STORE_URL)
  }

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3">
            <Chrome className="h-6 w-6 text-purple-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Install Chrome Extension</h2>
        <p className="text-sm text-muted-foreground">
          Capture prompts from ChatGPT, Claude, and Gemini
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
        <div className="flex gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
            1
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-medium">Download the extension</h3>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
            >
              <Chrome className="mr-1.5 h-3.5 w-3.5" />
              Open Chrome Web Store
            </Button>
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
            2
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-medium">Sign in with your email</h3>
            <div className="rounded bg-muted px-2.5 py-1.5 text-xs font-mono text-foreground">
              {userEmail}
            </div>
          </div>
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
