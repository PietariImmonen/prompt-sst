import * as React from 'react'

import { Workspace } from '@sst-replicache-template/core/models/Workspace'

export const workspaceStore = {
  get(): Workspace | undefined {
    const raw = localStorage.getItem('sst-replicache-template.workspace')
    if (!raw) return undefined
    try {
      const parsed = JSON.parse(raw)
      // Validate that it has the required properties
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
        return parsed as Workspace
      }
      return undefined
    } catch {
      return undefined
    }
  },
  set(input: Workspace) {
    return localStorage.setItem('sst-replicache-template.workspace', JSON.stringify(input))
  },
  remove() {
    return localStorage.removeItem('sst-replicache-template.workspace')
  }
}

export const WorkspaceContext = React.createContext<Workspace | undefined>(undefined)

// Simplify WorkspaceContextType for now
export type WorkspaceContextType = Workspace

// Original definition with AccountSchema pick:
// export type WorkspaceContextType = Workspace & {
//   account: AccountSchema.pick({
//     id: true,
//     role: true,
//   });
// };
