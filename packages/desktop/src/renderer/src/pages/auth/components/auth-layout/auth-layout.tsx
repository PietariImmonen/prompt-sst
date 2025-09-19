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
    <div className="min-h-screen bg-[#0E111A] text-[#F5F6F8] flex items-center justify-center px-6 py-12">
      <Card className={cn('w-full max-w-md border border-white/5 bg-[#1B1F2A]/80 backdrop-blur', className)}>
        <CardHeader className="space-y-2">
          {hero}
          <CardTitle className="text-2xl font-semibold tracking-tight text-white">{title}</CardTitle>
          <CardDescription className="text-sm text-white/60">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </div>
  )
}
