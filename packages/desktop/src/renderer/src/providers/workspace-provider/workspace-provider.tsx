import * as React from 'react'

import { Workspace } from '@prompt-saver/core/models/Workspace'

import { WorkspaceContext, workspaceStore } from './workspace-context'

interface WorkspaceProviderProps {
  workspace: Workspace
  children: React.ReactNode
}

export function WorkspaceProvider({ workspace, children }: WorkspaceProviderProps) {
  React.useEffect(() => {
    workspaceStore.set(workspace)
    return () => {
      workspaceStore.remove()
    }
  }, [workspace])

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}
