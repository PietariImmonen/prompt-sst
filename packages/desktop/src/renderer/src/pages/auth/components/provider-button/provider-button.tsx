import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProviderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  subtle?: boolean
}

export const ProviderButton = ({
  icon,
  label,
  subtle,
  className,
  ...rest
}: ProviderButtonProps) => {
  return (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start gap-3 border border-border/60 bg-black/80 text-foreground hover:bg-black',
        subtle && 'bg-transparent text-muted-foreground hover:text-foreground',
        className
      )}
      {...rest}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-black/70">
        {icon}
      </span>
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </Button>
  )
}
