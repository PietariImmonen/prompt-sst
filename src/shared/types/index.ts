// Shared types between main and renderer processes

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export interface Prompt {
  id: string
  user_id: string
  content: string
  title?: string
  category?: string
  subcategory?: string
  tags?: string[]
  source: 'manual' | 'claude' | 'chatgpt' | 'gemini' | 'grok'
  url?: string
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface PromptCategory {
  category: string
  subcategory: string
  tags: string[]
  confidence: number
  suggestedTitle?: string
}

export interface SavePromptPayload {
  content: string
  source: 'manual' | 'claude' | 'chatgpt' | 'gemini' | 'grok'
  url?: string
  timestamp: Date
  userId: string
}

export interface PlatformConfig {
  domain: string
  name: string
  promptSelector: string
  submitSelector: string
  conversationSelector?: string
}

export interface SearchFilters {
  query?: string
  category?: string
  tags?: string[]
  sortBy: 'relevance' | 'recent' | 'popular'
  limit: number
  offset: number
}

export interface PromptImprovement {
  type: 'clarity' | 'specificity' | 'structure' | 'variation'
  originalPrompt: string
  improvedPrompt: string
  explanation: string
  confidence: number
}

export interface TrayMenu {
  quickAccess: PromptMenuItem[]
  categories: CategoryMenuItem[]
  actions: {
    openApp: () => void
    newPrompt: () => void
    settings: () => void
    quit: () => void
  }
}

export interface PromptMenuItem {
  id: string
  title: string
  content: string
  category?: string
}

export interface CategoryMenuItem {
  name: string
  count: number
  prompts: PromptMenuItem[]
}

// IPC Channel types
export interface IpcChannels {
  'app:ready': () => void
  'prompt:save': (payload: SavePromptPayload) => void
  'prompt:get-all': () => Prompt[]
  'auth:sign-in': (email: string, password: string) => AuthState
  'auth:sign-out': () => void
  'auth:get-session': () => AuthState
  'window:show': () => void
  'window:hide': () => void
  'tray:update': (menu: TrayMenu) => void
}
