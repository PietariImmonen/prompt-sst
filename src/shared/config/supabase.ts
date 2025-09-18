/*
  Centralizes retrieval of Supabase environment settings for both preload and renderer builds.
  Falls back to placeholders so local development still boots without secrets.
*/

const readFromImportMeta = (key: string): string | undefined => {
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
    return meta?.[key]
  } catch (error) {
    console.warn(`[supabase-config] import.meta not available for ${key}`)
    return undefined
  }
}

const readFromProcessEnv = (key: string): string | undefined => {
  try {
    return typeof process !== 'undefined' ? process.env?.[key] : undefined
  } catch (error) {
    console.warn(`[supabase-config] process.env not available for ${key}`)
    return undefined
  }
}

const resolveEnv = (key: string, fallback = ''): string => {
  return readFromImportMeta(key) ?? readFromProcessEnv(key) ?? fallback
}

export const SUPABASE_URL = resolveEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co')
export const SUPABASE_ANON_KEY = resolveEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-key')
export const SUPABASE_REDIRECT_URL = resolveEnv(
  'VITE_SUPABASE_REDIRECT_URL',
  'http://localhost:5173/auth/callback'
)
