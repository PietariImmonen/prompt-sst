import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProviderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  subtle?: boolean
}

export const ProviderButton = ({ icon, label, subtle, className, ...rest }: ProviderButtonProps) => {
  return (
    <Button
      variant={subtle ? 'outline' : 'default'}
      className={cn(
        'w-full justify-start gap-3 border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white',
        subtle && 'bg-transparent text-white/80 hover:text-white',
        className
      )}
      {...rest}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.08]">
        {icon}
      </span>
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </Button>
  )
}
