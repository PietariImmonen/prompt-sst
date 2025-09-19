import * as React from 'react'
import { Navigate, Outlet, useParams } from 'react-router'
import { ReadTransaction } from 'replicache'

import { SidebarNav } from '@/components/layout/navigation/sidebar-nav/sidebar-nav'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { WorkspaceStore } from '@/data/workspace-store'
import { useAuth } from '@/hooks/use-auth'
import { useReplicache } from '@/hooks/use-replicache'
import { useSubscribe } from '@/hooks/use-subscribe'
import { RealtimeProvider } from '@/providers/realtime-provider'
import { ReplicacheProvider } from '@/providers/replicache-provider'
import { WorkspaceProvider } from '@/providers/workspace-provider'
import { workspaceStore } from '@/providers/workspace-provider/workspace-context'

import { WorkspaceLoading } from '../workspace-loading/workspace-loading'

function WorkspaceLayoutInner() {
  const replicache = useReplicache()
  const params = useParams()

  const result = useSubscribe(replicache, async (tx: ReadTransaction) => {
    const init = await tx.get('/init')
    return init
  })

  const workspace = useSubscribe(replicache, WorkspaceStore.fromSlug(params.workspaceSlug!))

  if (!result) {
    return <WorkspaceLoading />
  }

  // if (user?.isOnboarded === false && params["*"] !== "welcome") {
  //   return <Navigate to={`/${workspace!.slug}/welcome`} replace />;
  // }

  if (params['*'] === 'welcome') {
    return <Navigate to={`/${workspace!.slug}/dashboard`} replace />
  }

  // if (user?.isOnboarded === false && params["*"] === "welcome") {
  //   return <Outlet />;
  // }

  return (
    <RealtimeProvider>
      <SidebarProvider>
        <SidebarNav />
        <SidebarInset className="overflow-hidden">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </RealtimeProvider>
  )
}

export function WorkspaceLayout() {
  const auth = useAuth()
  const params = useParams()

  const workspace = React.useMemo(() => {
    try {
      return auth.current.workspaces.find(
        (item: any) => item.slug === localStorage.getItem('sst-replicache-template.workspace')
      )
    } catch (error) {
      console.error(error)
      return undefined
    }
  }, [auth, params.workspaceSlug])

  if (workspace) {
    workspaceStore.set(workspace)
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="relative z-10 flex-1">
        {workspace ? (
          <WorkspaceProvider workspace={workspace as any}>
            <ReplicacheProvider
              token={auth.current.token}
              email={auth.current.email}
              workspaceID={workspace?.id}
            >
              <WorkspaceLayoutInner />
            </ReplicacheProvider>
          </WorkspaceProvider>
        ) : (
          <p>Not found</p>
        )}
      </div>
    </div>
  )
}
