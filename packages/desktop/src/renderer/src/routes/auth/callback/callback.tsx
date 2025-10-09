import * as React from 'react'
import { createSearchParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export function CallbackPage() {
  const navigate = useNavigate()
  const auth = useAuth()

  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  React.useEffect(() => {
    if (errorDescription === 'no_account') {
      navigate({
        pathname: '/auth/login',
        search: createSearchParams({
          error: 'no_account',
          timestamp: new Date().getTime().toString()
        }).toString()
      })
      return
    }

    // Once auth is ready and we have a current user, check onboarding status and route accordingly
    if (auth.isReady && auth.current && !error) {
      console.log('Callback - Auth ready, checking onboarding status')

      // Get the first workspace and its user settings
      const workspace = auth.current.workspaces?.[0]
      const userSettings = workspace?.userSettings

      console.log('Callback - User settings:', userSettings)

      if (userSettings?.inAppOnboardingCompleted) {
        console.log('Callback - User already onboarded, redirecting to /sessions')
        navigate('/sessions', { replace: true })
      } else {
        console.log('Callback - User needs onboarding, redirecting to /onboarding')
        navigate('/onboarding', { replace: true })
      }
    }
  }, [auth.isReady, auth.current, error, errorDescription, navigate])

  if (error) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-black text-foreground">
        <p className="max-w-lg text-center text-muted-foreground">
          {error === 'access_denied'
            ? 'Access was denied. Please try again.'
            : 'An unknown error occurred. Please try again.'}
        </p>
        <Button asChild>
          <Link to={'/'}>Back to Login</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-black text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/80" />
        <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
      </div>
    </div>
  )
}
