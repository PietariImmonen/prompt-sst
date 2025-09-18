import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession, AuthState, AuthUser, OAuthProvider } from '../types'
import { AuthService } from '../services/auth'

interface AuthStoreState {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  error: string | null
  initialized: boolean
}

interface AuthStoreActions {
  initialize: () => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
  setAuthState: (state: AuthState) => void
  setLoading: (loading: boolean) => void
  setError: (message: string | null) => void
}

export type AuthStore = AuthStoreState & AuthStoreActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,
      initialized: false,

      initialize: async () => {
        const { initialized } = get()
        if (initialized) {
          return
        }

        set({ loading: true })

        try {
          const authState = await AuthService.getSession()
          set({
            user: authState.user,
            session: authState.session,
            loading: false,
            initialized: true
          })

          AuthService.onAuthStateChange((state) => {
            set({
              user: state.user,
              session: state.session,
              loading: state.loading,
              error: null
            })
          })
        } catch (error) {
          console.error('Failed to initialize auth store', error)
          set({ loading: false, initialized: true, user: null, session: null })
        }
      },

      signInWithOAuth: async (provider: OAuthProvider) => {
        set({ loading: true, error: null })
        try {
          await AuthService.signInWithOAuth(provider)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to sign in'
          set({ loading: false, error: message })
          throw error
        }
      },

      signOut: async () => {
        set({ loading: true, error: null })
        try {
          await AuthService.signOut()
          set({ user: null, session: null, loading: false })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to sign out'
          set({ loading: false, error: message })
          throw error
        }
      },

      setAuthState: (state: AuthState) => {
        set({ user: state.user, session: state.session, loading: state.loading })
      },

      setLoading: (loading: boolean) => set({ loading }),

      setError: (message: string | null) => set({ error: message })
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        session: state.session
      })
    }
  )
)
