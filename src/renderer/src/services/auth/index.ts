import type { AuthState, OAuthProvider } from '../../types'
import type { AuthBridge } from '../../../../shared/types/bridge'

const getAuthBridge = (): AuthBridge => {
  if (window.auth) {
    return window.auth
  }

  throw new Error('Auth bridge is not available on window')
}

export class AuthService {
  static async signInWithOAuth(provider: OAuthProvider): Promise<void> {
    const authBridge = getAuthBridge()
    await authBridge.signInWithOAuth(provider)
  }

  static async signOut(): Promise<void> {
    const authBridge = getAuthBridge()
    await authBridge.signOut()
  }

  static async getSession(): Promise<AuthState> {
    const authBridge = getAuthBridge()
    return authBridge.getSession()
  }

  static onAuthStateChange(callback: (state: AuthState) => void): () => void {
    const authBridge = getAuthBridge()
    return authBridge.onAuthStateChange(callback)
  }
}
