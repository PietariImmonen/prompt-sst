import * as React from 'react'
import { Account as CoreAccount } from '@prompt-saver/core/models/Account'
import { UserSettings } from '@prompt-saver/core/models/UserSettings'
import { Workspace } from '@prompt-saver/core/models/Workspace'

export type WorkspaceWithSettings = Workspace & {
  userSettings?: UserSettings
}

export type Account = CoreAccount & {
  token: string
  workspaces: WorkspaceWithSettings[]
}

export interface AuthContextType {
  current: Account | null
  accounts: Record<string, Account>
  logout: () => void
  refresh: () => Promise<void>
  isReady: boolean
}

interface AuthStorage {
  accounts: Record<string, Account>
  current?: string
}

export const authStore = {
  get() {
    const raw = localStorage.getItem('prompt-saver.auth')
    if (!raw) return null
    return JSON.parse(raw) as AuthStorage
  },
  set(input: AuthStorage) {
    return localStorage.setItem('prompt-saver.auth', JSON.stringify(input))
  },
  remove() {
    return localStorage.removeItem('prompt-saver.auth')
  }
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined)
