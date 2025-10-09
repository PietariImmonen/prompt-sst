import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2 } from 'lucide-react'
import type { UserRole } from '@prompt-saver/core/domain/onboarding/role-tags'
import { getExamplePromptForRole } from '@prompt-saver/core/domain/onboarding/example-prompts'

interface StepCompletionProps {
  role: UserRole
  onComplete: (examplePrompt: {
    title: string
    content: string
    tagNames: string[]
  }) => Promise<void>
}

export function StepCompletion({ role, onComplete }: StepCompletionProps) {
  const [isCompleting, setIsCompleting] = React.useState(false)
  const examplePrompt = getExamplePromptForRole(role)

  const handleGetStarted = async () => {
    setIsCompleting(true)
    try {
      await onComplete(examplePrompt)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setIsCompleting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-4">
            <Sparkles className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">You're all set!</h2>
        <p className="text-muted-foreground">
          We've created tags for your workspace. Here's an example prompt to get you started.
        </p>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h3 className="text-lg font-semibold">{examplePrompt.title}</h3>
            <div className="flex flex-wrap gap-2">
              {examplePrompt.tagNames.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-purple-500/10 text-purple-400 border-purple-500/20"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="rounded bg-black/40 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
            {examplePrompt.content}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
        <p className="text-sm text-purple-400">
          <strong>Pro tip:</strong> Use the keyboard shortcuts you just learned to quickly capture
          and access your prompts. This example will be added to your library when you continue.
        </p>
      </div>

      <Button
        onClick={handleGetStarted}
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
