import * as React from 'react'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { UserSettingsStore } from '@/data/user-settings'
import { ProgressIndicator } from '@/components/onboarding/progress-indicator'
import { StepRoleSelection } from '@/components/onboarding/step-role-selection'
import { StepShortcuts } from '@/components/onboarding/step-shortcuts'
import { StepTranscription } from '@/components/onboarding/step-transcription'
import { StepChromeExtension } from '@/components/onboarding/step-chrome-extension'
import { toast } from 'sonner'
import type { UserRole } from '@prompt-saver/core/domain/onboarding/role-tags'
import { useAuth } from '@/hooks/use-auth'
import { useWorkspace } from '@/hooks/use-workspace'

type OnboardingStep = 1 | 2 | 3 | 4

export function OnboardingPage() {
  const rep = useReplicache()
  const auth = useAuth()
  const workspace = useWorkspace()
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>(1)
  const [autoCapture, setAutoCapture] = React.useState(true)
  const [examplePrompt, setExamplePrompt] = React.useState<{
    title: string
    content: string
  } | null>(null)
  const userSettings = useSubscribe(UserSettingsStore.get(), {
    dependencies: []
  })

  // Note: Onboarding completion routing is handled by OnboardingRouter in App.tsx
  // No need to check and redirect here to avoid race conditions

  // Show loading state while Replicache is initializing
  if (!rep) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black p-4 text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const handleRoleSelection = async (role: UserRole, autoCaptureEnabled: boolean) => {
    setAutoCapture(autoCaptureEnabled)

    // Get example prompt for the selected role
    const { getExamplePromptForRole } = await import(
      '@prompt-saver/core/domain/onboarding/example-prompts'
    )
    const promptData = getExamplePromptForRole(role)
    setExamplePrompt(promptData)

    // Save user role to user settings immediately
    if (rep && userSettings) {
      try {
        await rep.mutate.user_settings_update({
          ...userSettings,
          userRole: role,
          enableAutoCapture: autoCaptureEnabled
        })
      } catch (error) {
        console.error('Failed to save user role:', error)
        // Continue with onboarding even if this fails
      }
    }

    // Proceed to next step immediately
    setCurrentStep(2)

    // Create tags in background (non-blocking)
    if (rep && auth.current) {
      const apiUrl = import.meta.env.VITE_API_URL.endsWith('/')
        ? import.meta.env.VITE_API_URL.slice(0, -1)
        : import.meta.env.VITE_API_URL

      // Fire and forget - tags will sync via Replicache
      fetch(`${apiUrl}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.current.token}`,
          'x-prompt-saver-workspace': workspace.id
        },
        body: JSON.stringify({ role })
      }).catch((error) => {
        console.error('Failed to create tags:', error)
        // Don't show error to user since they've already moved on
        // Tags will be available once they sync
      })
    }
  }

  const handleTranscriptionNext = () => {
    setCurrentStep(3)
  }

  const handleTranscriptionSkip = () => {
    setCurrentStep(3)
  }

  const handleShortcutsNext = () => {
    setCurrentStep(4)
  }

  const handleShortcutsSkip = () => {
    setCurrentStep(4)
  }

  const handleChromeExtensionNext = async () => {
    // Complete onboarding after Chrome extension step
    await completeOnboarding()
  }

  const completeOnboarding = async () => {
    if (!rep) {
      toast.error('Application not ready. Please try again.')
      throw new Error('Replicache not available')
    }

    try {
      // Update user settings to mark onboarding complete
      if (userSettings) {
        await rep.mutate.user_settings_update({
          ...userSettings,
          inAppOnboardingCompleted: true,
          enableAutoCapture: autoCapture
        })
        toast.success('Welcome to Clyo! Your workspace is ready.')
      }

      // Navigation will be handled by OnboardingRouter once it detects the updated settings
      // No need to manually navigate here
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      toast.error('Failed to complete onboarding. Please try again.')
      throw error
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-4 text-foreground">
      <div className="w-full space-y-8">
        <ProgressIndicator currentStep={currentStep} totalSteps={4} />

        <div className="flex justify-center">
          {currentStep === 1 && <StepRoleSelection onNext={handleRoleSelection} />}
          {currentStep === 2 && (
            <StepTranscription
              onNext={handleTranscriptionNext}
              onSkip={handleTranscriptionSkip}
            />
          )}
          {currentStep === 3 && examplePrompt && (
            <StepShortcuts
              onNext={handleShortcutsNext}
              onSkip={handleShortcutsSkip}
              examplePromptTitle={examplePrompt.title}
              examplePromptContent={examplePrompt.content}
            />
          )}
          {currentStep === 4 && <StepChromeExtension onNext={handleChromeExtensionNext} />}
        </div>
      </div>
    </div>
  )
}
