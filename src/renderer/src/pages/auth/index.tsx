import { useCallback, useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { OAuthProvider } from '@/types'
import { AuthLayout } from './components/auth-layout'
import { ProviderButton } from './components/provider-button'

const providerConfigs: Array<{
  id: OAuthProvider
  label: string
  description: string
  icon: JSX.Element
}> = [
  {
    id: 'google',
    label: 'Continue with Google',
    description: 'Use your Google Workspace or personal account',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="#EA4335"
          d="M12 10.8v3.84h5.453c-.24 1.248-.872 2.304-1.856 3.024l2.995 2.328c1.752-1.608 2.761-3.984 2.761-6.816 0-.648-.056-1.272-.16-1.872H12z"
        />
        <path
          fill="#34A853"
          d="M6.624 14.328 5.76 15l-2.4 1.824C5.248 20.76 8.4 22.8 12 22.8c2.64 0 4.848-.872 6.464-2.352l-2.993-2.328c-.832.56-1.896.912-3.471.912-2.664 0-4.928-1.8-5.736-4.296z"
        />
        <path
          fill="#4A90E2"
          d="m3.36 6.224-2.4-1.824C-.32 6.144-1.2 8.448-1.2 10.8c0 2.352.88 4.656 2.16 6.4l2.4-1.872c-.56-.8-.88-1.792-.88-2.992 0-1.2.32-2.192.88-3.104z"
        />
        <path
          fill="#FBBC05"
          d="M12 4.8c1.44 0 2.736.496 3.744 1.456l2.8-2.8C16.848 1.568 14.64.6 12 .6 8.4.6 5.248 2.64 3.36 6.224l2.4 1.872C6.96 6.6 9.336 4.8 12 4.8z"
        />
      </svg>
    )
  },
  {
    id: 'github',
    label: 'Continue with GitHub',
    description: 'Authenticate with your GitHub developer account',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          fill="currentColor"
          d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.438 9.8 8.207 11.387.6.11.793-.26.793-.577 0-.285-.012-1.233-.017-2.237-3.338.726-4.042-1.415-4.042-1.415-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.204.085 1.838 1.235 1.838 1.235 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.763-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.41 11.41 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.296-1.23 3.296-1.23.654 1.653.243 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.921.43.372.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.293 0 .319.192.694.8.576C20.565 21.796 24 17.307 24 12 24 5.37 18.63 0 12 0z"
        />
      </svg>
    )
  }
]

const heroBadge = (
  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/70">
    <ShieldCheck className="h-4 w-4" />
    Enterprise-grade security powered by Supabase
  </div>
)

const AuthPage = () => {
  const { signInWithOAuth, loading, error, setError } = useAuth()

  const handleProviderClick = useCallback(
    async (provider: OAuthProvider) => {
      try {
        setError(null)
        await signInWithOAuth(provider)
      } catch (err) {
        console.error('OAuth sign-in failed', err)
      }
    },
    [setError, signInWithOAuth]
  )

  const providers = useMemo(() => providerConfigs, [])

  return (
    <AuthLayout
      title="Sign in to Prompt Saver"
      description="Connect with a trusted provider to sync prompts securely across devices."
      hero={heroBadge}
    >
      {error ? (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-100">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {providers.map((provider) => (
          <ProviderButton
            key={provider.id}
            icon={provider.icon}
            label={provider.label}
            disabled={loading}
            onClick={() => handleProviderClick(provider.id)}
          />
        ))}
      </div>

      <Separator className="bg-white/10" />

      <p className="text-xs text-white/50">
        By continuing you agree to our privacy promise. We only request the scopes required to authenticate your
        identity and never store provider passwords.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to provider…
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default AuthPage
