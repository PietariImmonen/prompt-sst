import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

export const useAuth = () => {
  const initialize = useAuthStore((state) => state.initialize)
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth)
  const signOut = useAuthStore((state) => state.signOut)
  const setError = useAuthStore((state) => state.setError)
  const user = useAuthStore((state) => state.user)
  const session = useAuthStore((state) => state.session)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)
  const initialized = useAuthStore((state) => state.initialized)

  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      void initialize()
    }
  }, [initialize])

  return {
    user,
    session,
    loading,
    error,
    initialized,
    isAuthenticated: Boolean(user),
    signInWithOAuth,
    signOut,
    setError
  }
}
