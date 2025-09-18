import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '../types'
import { AuthService } from '../services/auth'

interface AuthStore {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  _isInitializing?: boolean
  _isInitialized?: boolean

  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  initialize: () => Promise<void>
  setLoading: (loading: boolean) => void
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      loading: true,
      _isInitializing: false,
      _isInitialized: false,

      // Actions
      signIn: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const authState = await AuthService.signIn(email, password)
          set({
            user: authState.user,
            session: authState.session,
            loading: false
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signUp: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const authState = await AuthService.signUp(email, password)
          set({
            user: authState.user,
            session: authState.session,
            loading: false
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signInWithOAuth: async (provider: 'google' | 'github') => {
        set({ loading: true })
        try {
          await AuthService.signInWithOAuth(provider)
          // OAuth will redirect, so we don't need to set state here
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      signOut: async () => {
        set({ loading: true })
        try {
          await AuthService.signOut()
          set({
            user: null,
            session: null,
            loading: false
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },

      refreshSession: async () => {
        try {
          const authState = await AuthService.refreshSession()
          set({
            user: authState.user,
            session: authState.session,
            loading: false
          })
        } catch (error) {
          set({
            user: null,
            session: null,
            loading: false
          })
        }
      },

      resetPassword: async (email: string) => {
        await AuthService.resetPassword(email)
      },

      updatePassword: async (newPassword: string) => {
        await AuthService.updatePassword(newPassword)
      },

      initialize: async () => {
        // Prevent multiple initialization calls
        const currentState = get()
        if (currentState._isInitializing || currentState._isInitialized) {
          return
        }

        set({ loading: true, _isInitializing: true })

        try {
          const authState = await AuthService.getSession()
          set({
            user: authState.user,
            session: authState.session,
            loading: false,
            _isInitializing: false,
            _isInitialized: true
          })

          // Subscribe to auth state changes only once
          AuthService.onAuthStateChange((newAuthState) => {
            set({
              user: newAuthState.user,
              session: newAuthState.session,
              loading: false
            })
          })
        } catch (error) {
          set({
            user: null,
            session: null,
            loading: false,
            _isInitializing: false,
            _isInitialized: true
          })
        }
      },

      setLoading: (loading: boolean) => {
        set({ loading })
      },

      setUser: (user: User | null) => {
        set({ user })
      },

      setSession: (session: Session | null) => {
        set({ session })
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        session: state.session
        // Exclude internal flags from persistence
      })
    }
  )
)
