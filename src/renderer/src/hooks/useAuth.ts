import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

/**
 * Custom hook for authentication
 */
export const useAuth = () => {
  const authStore = useAuthStore()
  const isInitialized = useRef(false)

  useEffect(() => {
    // Only initialize once to prevent infinite loops
    if (!isInitialized.current) {
      isInitialized.current = true
      authStore.initialize()
    }
  }, []) // Empty dependency array to run only once

  return {
    user: authStore.user,
    session: authStore.session,
    loading: authStore.loading,
    isAuthenticated: !!authStore.user,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signInWithOAuth: authStore.signInWithOAuth,
    signOut: authStore.signOut,
    refreshSession: authStore.refreshSession,
    resetPassword: authStore.resetPassword,
    updatePassword: authStore.updatePassword
  }
}
