import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { ReplicacheProvider } from '@/providers/replicache-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { BackgroundSyncProvider } from '@/providers/background-sync-provider'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { UserSettingsStore } from '@/data/user-settings'

import AuthPage from '@/pages/auth'
import PromptsPage from '@/pages/prompts'
import SettingsPage from '@/pages/settings'
import TagsPage from '@/pages/tags'
import SidebarLayout from '@/components/layout/sidebar-layout'
import { Toaster } from '@/components/ui/sonner'
import { PromptCaptureProvider } from '@/providers/prompt-capture-provider'
import { CallbackPage } from '@/routes/auth/callback/callback'
import OnboardingPage from '@/routes/onboarding'
import PromptEditorPage from '@/pages/prompt-editor'

const SplashScreen = ({ message = 'Loading workspace…' }: { message?: string }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/80" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

const OnboardingRouter = ({ children }: { children: React.ReactNode }) => {
  const rep = useReplicache()
  const auth = useAuth()
  const location = useLocation()
  const [onboardingStatus, setOnboardingStatus] = useState<'checking' | 'needed' | 'completed'>(
    'checking'
  )
  const userSettings = useSubscribe(UserSettingsStore.get(), {
    dependencies: []
  })
  // Subscribe to user settings from Replicache to react to changes in real-time
  console.log('OnboardingRouter - userSettings', userSettings)
  useEffect(() => {
    // Wait for auth to be ready
    if (!auth.current) {
      return
    }

    // Check from Replicache subscription (real-time updates)
    if (userSettings !== null) {
      console.log('OnboardingRouter - Using user settings from subscription:', userSettings)
      if (userSettings?.inAppOnboardingCompleted) {
        console.log('OnboardingRouter - User has completed onboarding')
        setOnboardingStatus('completed')
      } else {
        console.log('OnboardingRouter - User needs onboarding')
        setOnboardingStatus('needed')
      }
      return
    }

    // Fallback: check from auth context (API response) - this is immediate on first load
    const workspace = auth.current?.workspaces?.[0]
    const apiSettings = workspace?.userSettings

    if (apiSettings) {
      console.log('OnboardingRouter - Using user settings from API:', apiSettings)
      if (apiSettings.inAppOnboardingCompleted) {
        console.log('OnboardingRouter - User has completed onboarding (from API)')
        setOnboardingStatus('completed')
      } else {
        console.log('OnboardingRouter - User needs onboarding (from API)')
        setOnboardingStatus('needed')
      }
    }
  }, [auth.current, userSettings])

  if (onboardingStatus === 'checking') {
    return <SplashScreen message="Loading workspace…" />
  }

  // Handle routing based on onboarding status and current location
  const isOnOnboardingPage = location.pathname === '/onboarding'
  const isProtectedRoute = !location.pathname.startsWith('/auth') && !isOnOnboardingPage

  // If user needs onboarding but is on a protected route, redirect to onboarding
  if (onboardingStatus === 'needed' && isProtectedRoute) {
    console.log('OnboardingRouter - Redirecting to onboarding from:', location.pathname)
    return <Navigate to="/onboarding" replace />
  }

  // If user has completed onboarding but is on the onboarding page, redirect to sessions
  if (onboardingStatus === 'completed' && isOnOnboardingPage) {
    console.log('OnboardingRouter - Redirecting to sessions from onboarding')
    return <Navigate to="/sessions" replace />
  }

  return <>{children}</>
}

const AuthenticatedApp = () => {
  const auth = useAuth()
  const activeAccount = auth.current
  const [workspaceID, setWorkspaceID] = useState<string | null>(
    () => activeAccount?.workspaces?.[0]?.id ?? null
  )

  useEffect(() => {
    if (!activeAccount?.workspaces?.length) {
      setWorkspaceID(null)
      return
    }

    if (
      !workspaceID ||
      !activeAccount.workspaces.some((workspace) => workspace.id === workspaceID)
    ) {
      setWorkspaceID(activeAccount.workspaces[0]?.id ?? null)
    }
  }, [activeAccount, workspaceID])

  // Show loading screen while checking for workspaces
  if (!activeAccount) {
    return <SplashScreen />
  }

  // If no workspaces yet, show loading screen
  if (!activeAccount.workspaces?.length) {
    return <SplashScreen />
  }

  // If we have workspaces but no workspaceID selected yet, set it
  if (activeAccount.workspaces?.length && !workspaceID) {
    setWorkspaceID(activeAccount.workspaces[0]?.id ?? null)
    return <SplashScreen />
  }

  // If we have a workspaceID but can't find the workspace, show error
  const workspace = activeAccount?.workspaces?.find((w) => w.id === workspaceID)
  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-foreground">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Workspace not found</h1>
          <p className="text-sm text-muted-foreground">
            Select a different workspace from the menu.
          </p>
        </div>
      </div>
    )
  }

  return (
    <RealtimeProvider>
      <ReplicacheProvider
        token={activeAccount.token}
        workspaceID={workspace.id}
        email={activeAccount.email}
      >
        <WorkspaceProvider workspace={workspace}>
          <PromptCaptureProvider>
            <OnboardingRouter>
              <Routes>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/" element={<SidebarLayout />}>
                  <Route index element={<Navigate to="/sessions" replace />} />
                  <Route path="sessions" element={<PromptsPage />} />
                  <Route path="sessions/:promptId/edit" element={<PromptEditorPage />} />
                  <Route path="tags" element={<TagsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </OnboardingRouter>
          </PromptCaptureProvider>
        </WorkspaceProvider>
      </ReplicacheProvider>
    </RealtimeProvider>
  )
}

const Content = () => {
  const auth = useAuth()
  const activeAccount = auth.current

  if (!auth.isReady) {
    return <SplashScreen />
  }

  if (!activeAccount) {
    return <AuthPage />
  }

  return <AuthenticatedApp />
}

function App(): JSX.Element {
  return (
    <HashRouter>
      <AuthProvider>
        <BackgroundSyncProvider>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route path="/*" element={<Content />} />
          </Routes>
        </BackgroundSyncProvider>
      </AuthProvider>
    </HashRouter>
  )
}

export default App
