import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { ReplicacheProvider } from '@/providers/replicache-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import AuthPage from '@/pages/auth'
import DashboardPage from '@/pages/dashboard'
import PromptsPage from '@/pages/prompts'
import SettingsPage from '@/pages/settings'
import SidebarLayout from '@/components/layout/sidebar-layout'

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
  const [workspaceID, setWorkspaceID] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAccount || !activeAccount.workspaces.length) {
      return
    }

    if (!workspaceID) {
      setWorkspaceID(activeAccount.workspaces[0].id as string)
    }
  }, [activeAccount, workspaceID])

  if (!workspaceID) {
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

  const workspace = activeAccount.workspaces.find((w: any) => w.id === workspaceID)
  if (!workspace) {
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
          <Routes>
            <Route path="/" element={<SidebarLayout />}>
              <Route
                path="/sessions"
                index
                element={
                  <DashboardPage
                    workspaces={activeAccount.workspaces}
                    activeWorkspaceID={workspaceID}
                    onWorkspaceChange={setWorkspaceID}
                  />
                }
              />
              <Route path="/prompts" element={<PromptsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
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
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="prompt-desktop-theme">
        <AuthProvider>
          <Content />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
