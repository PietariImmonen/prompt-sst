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
    const completeAuthFlow = async () => {
      try {
        // Refresh the auth state to get the new token and updated account info
        // Since account, workspace, and user are now created during Google auth,
        // we just need to refresh to get the updated information
        await auth.refresh()
        
        // Redirect to onboarding (workspace and user should already be created)
        navigate("/onboarding", { replace: true })
      } catch (err) {
        console.error("Error completing auth flow", err)
        navigate("/auth/login")
      }
    };

    if (errorDescription === 'no_account') {
      navigate({
        pathname: '/auth/login',
        search: createSearchParams({
          error: 'no_account',
          timestamp: new Date().getTime().toString()
        }).toString()
      })
    } else if (auth.isReady && auth.current && !error) {
      completeAuthFlow()
    }
  }, [auth, errorDescription, error, navigate])

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
        <p className="text-sm text-white/60">Setting up your workspace...</p>
      </div>
    </div>
  )
}
