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
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <Card className="max-w-md border-destructive/30 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-2xl">Missing configuration</CardTitle>
            <CardDescription className="text-muted-foreground">
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
      if (!window.desktopAuth) {
        throw new Error('Desktop auth bridge is unavailable')
      }

      const request = await window.desktopAuth.prepare()

      try {
        const { url } = await client.authorize(request.callbackUrl, 'token', {
          provider
        })

        await window.desktopAuth.launch({ id: request.id, url })
      } catch (error) {
        await window.desktopAuth.cancel({ id: request.id }).catch(() => undefined)
        throw error
      }
    } catch (err) {
      console.error('Failed to start OAuth flow', err)
      setError(err instanceof Error ? err.message : 'Unable to start sign-in')
      setLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="max-w-md border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Secure sign-in via Prompt SST
          </div>
          <CardTitle className="text-2xl">Sign in to Prompt Desktop</CardTitle>
          <CardDescription>
            Use the same identity provider as the web app to sync your workspaces locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                size="lg"
                variant="outline"
                className="w-full"
                disabled={loading !== null}
                onClick={() => handleProviderClick(provider.id)}
              >
                {loading === provider.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {provider.label}
              </Button>
            ))}
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            After completing authentication in the browser window, you'll return here automatically.
            We never store provider passwords or additional scopes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthPage
