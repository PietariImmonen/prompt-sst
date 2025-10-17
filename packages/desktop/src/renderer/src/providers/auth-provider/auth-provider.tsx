import * as React from 'react'
import { dropAllDatabases } from 'replicache'

import { api } from '@/lib/hono'
import { AuthContext, authStore } from './auth-context'

export type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider(props: AuthProviderProps) {
  const [isReady, setIsReady] = React.useState<boolean>(false)

  const [accessToken, setAccessToken] = React.useState<string | null>(() => {
    return new URLSearchParams(window.location.hash.substring(1)).get('access_token')
  })

  if (!authStore.get()) {
    authStore.set({ accounts: {} })
  }

  React.useEffect(() => {
    if (!window.desktopAuth) return

    const unsubscribe = window.desktopAuth.onCallback((payload) => {
      const hash = payload.hash.startsWith('#') ? payload.hash.slice(1) : payload.hash
      const search = payload.search.startsWith('?') ? payload.search.slice(1) : payload.search

      const nextSearch = search ? `?${search}` : ''
      window.location.hash = `#/auth/callback${nextSearch}`

      if (hash) {
        const token = new URLSearchParams(hash).get('access_token')
        setAccessToken(token)
      } else {
        setAccessToken(null)
      }
    })

    return unsubscribe
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
    }
  }, [])

  const refresh = React.useCallback(
    async (retryCount = 0) => {
      const MAX_RETRIES = 2
      try {
        const all = []
        if (!authStore.get()) return

        console.log('AuthProvider - Starting refresh, retry count:', retryCount)

        for (const token of [...Object.keys(authStore.get()!.accounts), accessToken]) {
          if (!token) continue

          const prom = api.account.me
            .$get({}, { headers: { authorization: `Bearer ${token}` } })
            .then(async (response: any) => {
              if (response.ok) {
                const info = await response.json()
                console.log('AuthProvider - Successfully fetched account info:', info.result.id)

                if (
                  !accessToken ||
                  !Object.values(authStore.get()!.accounts).find((a) => a.id === info.result.id)
                ) {
                  const prevStore = authStore.get()!
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
                  console.log('AuthProvider - Account stored in authStore')
                }
              } else {
                console.warn('AuthProvider - Account fetch failed with status:', response.status)
                const errorBody = await response.text()
                console.warn('AuthProvider - Error body:', errorBody)

                // Only remove token if it's actually invalid (401), not for other errors
                // Cast to number to handle status codes not in the OpenAPI spec (like 401 from auth middleware)
                const statusCode = response.status as number
                if (statusCode === 401) {
                  const prevStore = authStore.get()!
                  delete prevStore.accounts[token]
                  authStore.set(prevStore)
                  console.log('AuthProvider - Removed invalid token from store')
                } else if (retryCount < MAX_RETRIES) {
                  // Retry on other errors (like 500)
                  throw new Error(`HTTP ${response.status}: ${errorBody}`)
                }
              }

              if (accessToken === token) {
                const prevStore = authStore.get()!
                authStore.set({ ...prevStore, current: token })
                console.log('AuthProvider - Set current account to new token')

                // Clear access token from URL/state
                setAccessToken(null)
              }
            })
            .catch((error: any) => {
              console.warn('AuthProvider - Failed to refresh auth token:', error)
              // Only remove token on network errors after retries
              if (retryCount >= MAX_RETRIES && authStore.get()?.accounts[token]) {
                const prevStore = authStore.get()!
                delete prevStore.accounts[token]
                authStore.set(prevStore)
                console.log('AuthProvider - Removed token after max retries')
              } else {
                // Propagate error for retry
                throw error
              }
            })
          all.push(prom)
        }
        await Promise.all(all)
        console.log('AuthProvider - Refresh completed successfully')
      } catch (error) {
        console.error('AuthProvider - Refresh failed, retry count:', retryCount, error)
        // Retry if we haven't exceeded max retries
        if (retryCount < MAX_RETRIES) {
          console.log('AuthProvider - Retrying refresh after 1 second...')
          await new Promise((resolve) => setTimeout(resolve, 1000))
          return refresh(retryCount + 1)
        }
      } finally {
        setIsReady(true)
      }
    },
    [accessToken]
  )

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthContext.Provider
      value={{
        get current() {
          const store = authStore.get()
          if (!store) return null
          const key = store.current
          if (!key) return null
          return store.accounts[key] || null
        },
        get accounts() {
          return authStore.get()!.accounts
        },
        logout: () => {
          authStore.remove()
          localStorage.removeItem('prompt-saver.workspace')
          dropAllDatabases()
          window.location.hash = '#/auth/login'
        },
        refresh,
        isReady
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}
