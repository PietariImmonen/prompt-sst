import * as React from "react"
import { dropAllDatabases } from "replicache"

import { api } from "~/lib/hono"

import { AuthContext, authStore } from "./auth-context"

export type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider(props: AuthProviderProps) {
  const [isReady, setIsReady] = React.useState<boolean>(false)
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  const [accessToken, setAccessToken] = React.useState<string | null>(() => {
    return new URLSearchParams(window.location.hash.substring(1)).get("access_token")
  })

  // Initialize storage
  React.useEffect(() => {
    authStore.init().then(() => {
      if (!authStore.get()) {
        authStore.set({ accounts: {} })
      }
      forceUpdate()
    })
  }, [])

  // Listen for hash changes (auth callback)
  React.useEffect(() => {
    const handleHashChange = () => {
      const params = new URLSearchParams(window.location.hash.substring(1))
      const token = params.get("access_token")
      if (token) {
        setAccessToken(token)
      }
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  React.useEffect(() => {
    if (accessToken) return
    if (authStore.get() && Object.keys(authStore.get()!.accounts).length) return
    setIsReady(true)
  }, [accessToken])

  React.useEffect(() => {
    if (!authStore.get()) return
    if (authStore.get()!.current && !authStore.get()!.accounts[authStore.get()!.current!]) {
      const prevStore = authStore.get()!
      authStore.set({
        ...prevStore,
        current: Object.keys(authStore.get()!.accounts)[0]
      })
      forceUpdate()
    }
  }, [])

  const refresh = React.useCallback(async () => {
    try {
      console.log("Refresh called, accessToken:", accessToken)
      const all = []
      const store = authStore.get()
      const tokens = store ? Object.keys(store.accounts) : []
      if (accessToken) tokens.push(accessToken)

      console.log("Tokens to refresh:", tokens)

      if (tokens.length === 0) {
        setIsReady(true)
        return
      }

      for (const token of tokens) {
        if (!token) continue

        console.log("Fetching account info for token:", token.substring(0, 20) + "...")
        const prom = api.account.me
          .$get({}, { headers: { authorization: `Bearer ${token}` } })
          .then(async (response) => {
            console.log("Account.me response status:", response.status)
            if (response.ok) {
              const info = await response.json()
              console.log("Account info:", info)

              // Add or update account in store
              const prevStore = authStore.get() || { accounts: {} }
              authStore.set({
                ...prevStore,
                accounts: {
                  ...prevStore.accounts,
                  [token]: {
                    ...info.result,
                    token
                  }
                }
              })

              // If this is the new access token, set it as current
              if (accessToken === token) {
                const updatedStore = authStore.get()!
                authStore.set({ ...updatedStore, current: token })

                // Clear the hash
                window.location.hash = ""
                setAccessToken(null)
              }

              forceUpdate()
            } else {
              console.error("Account.me failed:", response.status)
              // Remove invalid token
              const prevStore = authStore.get()
              if (prevStore?.accounts[token]) {
                delete prevStore.accounts[token]
                authStore.set(prevStore)
                forceUpdate()
              }
            }
          })
          .catch((error) => {
            console.error("Failed to refresh auth token:", error)
            const prevStore = authStore.get()
            if (prevStore?.accounts[token]) {
              delete prevStore.accounts[token]
              authStore.set(prevStore)
              forceUpdate()
            }
          })
        all.push(prom)
      }
      await Promise.all(all)
    } catch (error) {
      console.error("Auth refresh failed:", error)
    } finally {
      setIsReady(true)
    }
  }, [accessToken])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  const contextValue = React.useMemo(
    () => ({
      get current() {
        const store = authStore.get()
        if (!store) return null
        const key = store.current
        if (!key) return null
        return store.accounts[key] || null
      },
      get accounts() {
        return authStore.get()?.accounts || {}
      },
      logout: () => {
        authStore.remove()
        chrome.storage.local.remove(["prompt-saver.workspace"])
        dropAllDatabases()
        window.location.hash = ""
        forceUpdate()
      },
      refresh,
      isReady
    }),
    [refresh, isReady]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  )
}
