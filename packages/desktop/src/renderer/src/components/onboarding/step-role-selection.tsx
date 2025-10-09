import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { USER_ROLES, type UserRole } from '@prompt-saver/core/domain/onboarding/role-tags'

interface StepRoleSelectionProps {
  onNext: (role: UserRole, autoCapture: boolean) => void
}

export function StepRoleSelection({ onNext }: StepRoleSelectionProps) {
  const [role, setRole] = React.useState<UserRole>('Software Engineer')
  const [autoCapture, setAutoCapture] = React.useState(true)

  const handleContinue = () => {
    onNext(role, autoCapture)
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">Welcome to Clyo</h1>
        <p className="text-muted-foreground">
          Let's personalize your workspace to help you get the most out of your prompts
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="role-select" className="text-base">
            What's your role?
          </Label>
          <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
            <SelectTrigger id="role-select" className="w-full bg-black">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent className="bg-black border-border">
              {USER_ROLES.map((roleOption) => (
                <SelectItem key={roleOption} value={roleOption} className="bg-black hover:bg-muted">
                  {roleOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            We'll create relevant tags to help you organize your prompts
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor="auto-capture" className="text-sm font-medium cursor-pointer">
              Auto-capture prompts
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically save prompts from your desktop interactions
            </p>
          </div>
          <Switch id="auto-capture" checked={autoCapture} onCheckedChange={setAutoCapture} />
        </div>
      </div>

      <Button
        onClick={handleContinue}
        className="w-full rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-purple-500/20"
        size="lg"
      >
        Continue
      </Button>
    </div>
  )
}
