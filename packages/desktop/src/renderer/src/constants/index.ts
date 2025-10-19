// Renderer-specific constants

export const ROUTES = {
  DASHBOARD: '/',
  LIBRARY: '/library',
  PUBLIC_BROWSE: '/public',
  SETTINGS: '/settings',
  AUTH: '/auth'
} as const

export const VIEWS = {
  DASHBOARD: 'dashboard',
  LIBRARY: 'library',
  PUBLIC_BROWSE: 'public-browse',
  SETTINGS: 'settings'
} as const

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const

export const PROMPT_CATEGORIES = [
  'Writing',
  'Code',
  'Analysis',
  'Research',
  'Creative',
  'Business',
  'Education',
  'Productivity',
  'Technical',
  'Other'
] as const

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'relevance', label: 'Most Relevant' }
] as const

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const

export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  AUTO_SAVE: 1000
} as const

export const LOCAL_STORAGE_KEYS = {
  AUTH_STORE: 'auth-store',
  APP_STORE: 'app-store',
  SHORTCUTS: 'app-shortcuts'
} as const

export const DEFAULT_SHORTCUTS = {
  capture: 'CmdOrCtrl+Shift+P',
  palette: 'CmdOrCtrl+Shift+O',
  transcribe: 'CmdOrCtrl+Shift+F'
} as const
