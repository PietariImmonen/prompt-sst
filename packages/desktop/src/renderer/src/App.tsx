import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { ReplicacheProvider } from '@/providers/replicache-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import AuthPage from '@/pages/auth'
import PromptsPage from '@/pages/prompts'
import SettingsPage from '@/pages/settings'
import SidebarLayout from '@/components/layout/sidebar-layout'
import { Toaster } from '@/components/ui/sonner'
import { PromptCaptureProvider } from '@/providers/prompt-capture-provider'
import { CallbackPage } from '@/routes/auth/callback/callback'

const SplashScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0E111A] text-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        <p className="text-sm text-white/60">Loading workspace…</p>
      </div>
    </div>
  )
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

    if (!workspaceID || !activeAccount.workspaces.some((workspace) => workspace.id === workspaceID)) {
      setWorkspaceID(activeAccount.workspaces[0]?.id ?? null)
    }
  }, [activeAccount, workspaceID])

  if (!workspaceID) {
    if (activeAccount?.workspaces?.length) {
      return <SplashScreen />
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E111A] text-white">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">No workspace available</h1>
          <p className="text-sm text-white/60">
            Add a workspace to your account from the web app to continue.
          </p>
        </div>
      </div>
    )
  }

  const workspace = activeAccount?.workspaces?.find((w) => w.id === workspaceID)
  if (!workspace || !activeAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0E111A] text-white">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Workspace not found</h1>
          <p className="text-sm text-white/60">Select a different workspace from the menu.</p>
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
            <Routes>
              <Route path="/" element={<SidebarLayout />}>
                <Route index element={<Navigate to="/sessions" replace />} />
                <Route path="sessions" element={<PromptsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
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
      <ThemeProvider defaultTheme="system" storageKey="prompt-desktop-theme">
        <AuthProvider>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route path="/*" element={<Content />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}

export default App
