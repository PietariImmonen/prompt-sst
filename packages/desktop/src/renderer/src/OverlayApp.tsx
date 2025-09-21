import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { ReplicacheProvider } from '@/providers/replicache-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import { PromptInsertionOverlayV2 } from '@/components/prompt-insertion-palette/prompt-insertion-overlay-v2'
import { Toaster } from '@/components/ui/sonner'

const OverlayContent = () => {
  const auth = useAuth()
  const activeAccount = auth.current
  const [workspaceID, setWorkspaceID] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAccount || !activeAccount.workspaces?.length) {
      return
    }

    if (!workspaceID) {
      const firstWorkspace = activeAccount.workspaces[0]
      if (firstWorkspace && firstWorkspace.id) {
        setWorkspaceID(firstWorkspace.id)
      }
    }
  }, [activeAccount, workspaceID])

  if (!auth.isReady) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!activeAccount) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-foreground font-medium">Authentication Required</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please authenticate in the main desktop app first.
          </p>
        </div>
      </div>
    )
  }

  if (!workspaceID) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-foreground font-medium">No workspace available</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add a workspace to your account from the web app to continue.
          </p>
        </div>
      </div>
    )
  }

  const workspace = activeAccount?.workspaces?.find((w) => w.id === workspaceID)
  if (!workspace || !activeAccount) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm border border-border/60 rounded-lg p-4 shadow-lg">
          <p className="text-sm text-foreground font-medium">Workspace not found</p>
          <p className="text-xs text-muted-foreground mt-1">
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
          <PromptInsertionOverlayV2 />
        </WorkspaceProvider>
      </ReplicacheProvider>
    </RealtimeProvider>
  )
}

function OverlayApp(): JSX.Element {
  console.log('OverlayApp: Initializing overlay application')

  return (
    <ThemeProvider defaultTheme="system" storageKey="prompt-desktop-overlay-theme">
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <OverlayContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default OverlayApp
