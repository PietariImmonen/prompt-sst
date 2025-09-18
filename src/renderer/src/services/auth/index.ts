import { supabase } from '../supabase/client'
import type { AuthState, User, Session } from '../../types'

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<AuthState> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw new Error(error.message)
      }

      return {
        user: data.user as User,
        session: data.session as Session,
        loading: false
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string): Promise<AuthState> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        throw new Error(error.message)
      }

      return {
        user: data.user as User,
        session: data.session as Session,
        loading: false
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  /**
   * Sign in with OAuth provider
   */
  static async signInWithOAuth(provider: 'google' | 'github'): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('OAuth sign in error:', error)
      throw error
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<AuthState> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        throw new Error(error.message)
      }

      return {
        user: data.session?.user as User | null,
        session: data.session as Session | null,
        loading: false
      }
    } catch (error) {
      console.error('Get session error:', error)
      return {
        user: null,
        session: null,
        loading: false
      }
    }
  }

  /**
   * Refresh current session
   */
  static async refreshSession(): Promise<AuthState> {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        throw new Error(error.message)
      }

      return {
        user: data.user as User,
        session: data.session as Session,
        loading: false
      }
    } catch (error) {
      console.error('Refresh session error:', error)
      throw error
    }
  }

  /**
   * Subscribe to auth state changes
   */
  static onAuthStateChange(callback: (state: AuthState) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      const authState: AuthState = {
        user: session?.user as User | null,
        session: session as Session | null,
        loading: false
      }
      callback(authState)
    })
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Update password error:', error)
      throw error
    }
  }
}
