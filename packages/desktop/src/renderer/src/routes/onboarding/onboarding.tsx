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

type OnboardingStep = 1 | 2 | 3 | 4

export function OnboardingPage() {
  const rep = useReplicache()
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

    // Create tags and example prompt immediately so it's available in the palette
    if (rep) {
      try {
        // Get tags for the selected role and example prompt
        const { createRoleTags } = await import('@prompt-saver/core/domain/onboarding/create-role-tags')
        const { getExamplePromptForRole } = await import(
          '@prompt-saver/core/domain/onboarding/example-prompts'
        )

        const promptData = getExamplePromptForRole(role)
        setExamplePrompt(promptData)

        // Create role-specific tags using the core domain function
        await createRoleTags(role)

        // Wait a bit for tags to be created
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        console.error('Failed to create example prompt or tags:', error)
        toast.error('Failed to create example prompt or tags')
      }
    }

    setCurrentStep(2)
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
