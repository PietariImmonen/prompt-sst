import { Check } from 'lucide-react'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`
                flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all
                ${
                  isCompleted
                    ? 'border-purple-500 bg-purple-500 text-white'
                    : isCurrent
                      ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                      : 'border-muted-foreground/30 bg-muted/20 text-muted-foreground'
                }
              `}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`
                  mx-2 h-0.5 w-8 transition-all
                  ${isCompleted ? 'bg-purple-500' : 'bg-muted-foreground/30'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
