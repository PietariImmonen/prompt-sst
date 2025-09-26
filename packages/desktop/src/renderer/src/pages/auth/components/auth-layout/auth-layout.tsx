import type { PropsWithChildren, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AuthLayoutProps extends PropsWithChildren {
  title: string
  description: string
  hero?: ReactNode
  className?: string
}

export const AuthLayout = ({
  title,
  description,
  hero,
  className,
  children
}: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <Card className={cn('w-full max-w-md border border-border/60 bg-card/80 backdrop-blur', className)}>
        <CardHeader className="space-y-2">
          {hero}
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </div>
  )
}
