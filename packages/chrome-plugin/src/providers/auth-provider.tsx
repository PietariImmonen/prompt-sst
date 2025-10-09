import type { ReactNode } from "react"
import { useEffect, useState } from "react"

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  email: string | null
  workspaceID: string | null
  isReady: boolean
}

interface AuthContextValue extends AuthState {
  login: () => void
  logout: () => void
}

const PRIMARY_STORAGE_KEY = "prompt-saver.auth"
const LEGACY_STORAGE_KEY = "prompt-saver-auth"

export function AuthProvider({
  children
}: {
  children: (auth: AuthContextValue) => ReactNode
}) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    token: null,
    email: null,
    workspaceID: null,
    isReady: false
  })

  // Load auth state from chrome storage on mount
  useEffect(() => {
    chrome.storage.local.get([PRIMARY_STORAGE_KEY, LEGACY_STORAGE_KEY], (result) => {
      const stored = result[PRIMARY_STORAGE_KEY] ?? result[LEGACY_STORAGE_KEY]
      if (stored) {
        setAuthState({
          isAuthenticated: true,
          token: stored.token,
          email: stored.email,
          workspaceID: stored.workspaceID,
          isReady: true
        })
      } else {
        setAuthState((prev) => ({ ...prev, isReady: true }))
      }
    })
  }, [])

  const login = () => {
    // Get API URL from environment
    const apiRoot = process.env.PLASMO_PUBLIC_API_URL || "http://localhost:3000"
    const authUrl = `${apiRoot}/auth/login`

    // Open auth flow in new tab
    chrome.tabs.create({ url: authUrl }, (tab) => {
      // Listen for the auth callback
      const messageListener = (
        message: any,
        sender: chrome.runtime.MessageSender
      ) => {
        if (
          message.type === "AUTH_SUCCESS" &&
          sender.tab?.id === tab.id
        ) {
          const { token, email, workspaceID } = message.payload

          // Store auth state
          const value = { token, email, workspaceID }
          chrome.storage.local.set({
            [PRIMARY_STORAGE_KEY]: value,
            [LEGACY_STORAGE_KEY]: value
          })

          setAuthState({
            isAuthenticated: true,
            token,
            email,
            workspaceID,
            isReady: true
          })

          // Close the auth tab
          if (tab.id) {
            chrome.tabs.remove(tab.id)
          }

          chrome.runtime.onMessage.removeListener(messageListener)
        }
      }

      chrome.runtime.onMessage.addListener(messageListener)
    })
  }

  const logout = () => {
    chrome.storage.local.remove([PRIMARY_STORAGE_KEY, LEGACY_STORAGE_KEY])
    setAuthState({
      isAuthenticated: false,
      token: null,
      email: null,
      workspaceID: null,
      isReady: true
    })
  }

  return <>{children({ ...authState, login, logout })}</>
}
