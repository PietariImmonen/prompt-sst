import type { AuthState, OAuthProvider } from '.'

export interface AuthBridge {
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
  getSession: () => Promise<AuthState>
  onAuthStateChange: (callback: (state: AuthState) => void) => () => void
}
