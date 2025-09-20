import { useState } from 'react'
import { useMemo } from 'react'
import { createClient } from '@openauthjs/openauth/client'
import { Loader2, ShieldCheck } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const issuer = import.meta.env.VITE_AUTH_URL

const providers = [
  {
    id: 'google' as const,
    label: 'Continue with Google'
  },
  {
    id: 'microsoft' as const,
    label: 'Continue with Microsoft'
  }
]

export function AuthPage() {
  if (!issuer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E111A] px-4 text-white">
        <Card className="max-w-md border-red-500/40 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-2xl">Missing configuration</CardTitle>
            <CardDescription className="text-white/70">
              Set <code className="font-mono">VITE_AUTH_URL</code> in{' '}
              <code>packages/desktop/.env</code> so the desktop app knows which OpenAuth issuer to
              use.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const client = useMemo(
    () =>
      createClient({
        clientID: 'desktop',
        issuer
      }),
    [issuer]
  )

  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProviderClick = async (provider: 'google' | 'microsoft') => {
    try {
      setError(null)
      setLoading(provider)
      const { url } = await client.authorize(`${location.origin}/auth/callback`, 'token', {
        provider
      })
      window.location.href = url
    } catch (err) {
      console.error('Failed to start OAuth flow', err)
      setError(err instanceof Error ? err.message : 'Unable to start sign-in')
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0E111A] px-4 text-white">
      <Card className="max-w-md border-white/10 bg-white/5 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4" />
            Secure sign-in via Prompt SST
          </div>
          <CardTitle className="text-2xl">Sign in to Prompt Desktop</CardTitle>
          <CardDescription className="text-white/60">
            Use the same identity provider as the web app to sync your workspaces locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-100">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                size="lg"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                disabled={loading !== null}
                onClick={() => handleProviderClick(provider.id)}
              >
                {loading === provider.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {provider.label}
              </Button>
            ))}
          </div>

          <Separator className="bg-white/10" />

          <p className="text-xs text-white/50">
            After completing authentication in the browser window, you'll return here automatically.
            We never store provider passwords or additional scopes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthPage
