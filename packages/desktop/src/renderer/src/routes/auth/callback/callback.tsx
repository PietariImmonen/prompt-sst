import * as React from 'react'
import { createSearchParams, Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export function CallbackPage() {
  const navigate = useNavigate()

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

  if (error) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4">
        <p className="max-w-lg text-center text-secondary-foreground">
          {error === 'access_denied'
            ? 'Access was denied. Please try again.'
            : 'An unknown error occurred. Please try again.'}
        </p>
        <Button asChild>
          <Link to={'/auth/login'}>Back to Login</Link>
        </Button>
      </div>
    )
  }

  return <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4"></div>
}
