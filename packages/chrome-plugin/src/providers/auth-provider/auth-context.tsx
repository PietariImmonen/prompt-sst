import * as React from "react"

import type { Account as CoreAccount } from "@prompt-saver/core/models/Account"
import type { Workspace } from "@prompt-saver/core/models/Workspace"

export type Account = CoreAccount & {
  token: string
  workspaces: Workspace[]
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

// In-memory store with chrome.storage.local persistence
let memoryStore: AuthStorage | null = null;

export const authStore = {
  get(): AuthStorage | null {
    return memoryStore;
  },
  set(input: AuthStorage): void {
    memoryStore = input;
    chrome.storage.local.set({ "prompt-saver.auth": JSON.stringify(input) });
  },
  remove(): void {
    memoryStore = null;
    chrome.storage.local.remove(["prompt-saver.auth"]);
  },
  async init(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(["prompt-saver.auth"], (result) => {
        const data = result["prompt-saver.auth"];
        memoryStore = data ? JSON.parse(data) : null;
        resolve();
      });
    });
  }
}

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
)
