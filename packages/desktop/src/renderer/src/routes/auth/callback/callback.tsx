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
    }
  }, [errorDescription, navigate])

  // Redirect to main app if authentication is successful
  React.useEffect(() => {
    if (auth.isReady && auth.current && !error) {
      navigate('/sessions', { replace: true })
    }
  }, [auth.isReady, auth.current, error, navigate])

  if (error) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-[#0E111A] text-white">
        <p className="max-w-lg text-center text-white/70">
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
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-[#0E111A] text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        <p className="text-sm text-white/60">Loading workspace...</p>
      </div>
    </div>
  )
}
