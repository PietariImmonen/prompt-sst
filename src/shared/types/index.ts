// Shared types between main, preload, and renderer processes

import type { AuthSession, AuthState, AuthUser } from '../schemas/auth'

export type { AuthSession, AuthState, AuthUser }
export type { AuthBridge } from './bridge'

export type OAuthProvider = 'google' | 'github'

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
  'auth:get-session': () => Promise<AuthState>
  'auth:sign-out': () => Promise<void>
  'auth:sign-in-oauth': (provider: OAuthProvider) => Promise<void>
  'auth:on-state-change': (callbackId: string) => void
  'window:show': () => void
  'window:hide': () => void
  'tray:update': (menu: TrayMenu) => void
}
