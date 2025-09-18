import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../shared/supabase/client'
import { SUPABASE_REDIRECT_URL } from '../shared/config/supabase'
import { authSessionSchema, authStateSchema, authUserSchema } from '../shared/schemas/auth'
import type { AuthBridge } from '../shared/types/bridge'
import type { AuthState, AuthSession, AuthUser, OAuthProvider } from '../shared/types'

const mapUser = (user: SupabaseUser | null): AuthUser | null => {
  if (!user) return null

  const candidate: AuthUser = {
    id: user.id,
    email: user.email ?? null,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    createdAt: user.created_at ?? null,
    updatedAt: user.updated_at ?? null
  }

  return authUserSchema.parse(candidate)
}

const mapSession = (session: SupabaseSession | null): AuthSession | null => {
  if (!session) return null

  const candidate: AuthSession = {
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? null,
    expiresAt: session.expires_at ?? null,
    tokenType: session.token_type ?? null
  }

  return authSessionSchema.parse(candidate)
}

const buildAuthState = (session: SupabaseSession | null, loading: boolean): AuthState => {
  return authStateSchema.parse({
    user: mapUser(session?.user ?? null),
    session: mapSession(session),
    loading
  })
}

const signInWithOAuth = async (provider: OAuthProvider) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: SUPABASE_REDIRECT_URL,
      skipBrowserRedirect: false
    }
  })

  if (error) {
    throw new Error(error.message)
  }
}

const authBridge: AuthBridge = {
  signInWithOAuth,
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  },
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }

    return buildAuthState(data.session ?? null, false)
  },
  onAuthStateChange: (callback) => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const state = buildAuthState(session ?? null, false)
      callback(state)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }
}

const api = {
  auth: authBridge
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('auth', authBridge)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.auth = authBridge
  // @ts-ignore (define in dts)
  window.api = api
}
