// Shared constants between main and renderer processes

export const PLATFORM_CONFIGS = [
  {
    domain: 'claude.ai',
    name: 'Claude',
    promptSelector: '[data-testid="chat-input"]',
    submitSelector: '[data-testid="send-button"]',
    conversationSelector: '[data-testid="conversation"]'
  },
  {
    domain: 'chat.openai.com',
    name: 'ChatGPT',
    promptSelector: '#prompt-textarea',
    submitSelector: '[data-testid="send-button"]',
    conversationSelector: '[data-testid="conversation-turn"]'
  },
  {
    domain: 'gemini.google.com',
    name: 'Gemini',
    promptSelector: '[data-testid="chat-input"]',
    submitSelector: '[data-testid="send-button"]',
    conversationSelector: '[data-testid="conversation"]'
  },
  {
    domain: 'x.ai',
    name: 'Grok',
    promptSelector: 'textarea[placeholder*="Ask"]',
    submitSelector: 'button[type="submit"]',
    conversationSelector: '[data-testid="chat-messages"]'
  }
] as const

export const DEFAULT_CATEGORIES = [
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

export const PROMPT_SOURCES = ['manual', 'claude', 'chatgpt', 'gemini', 'grok'] as const

export const SORT_OPTIONS = ['recent', 'popular', 'relevance'] as const

// IPC Channel names
export const IPC_CHANNELS = {
  APP_READY: 'app:ready',
  PROMPT_SAVE: 'prompt:save',
  PROMPT_GET_ALL: 'prompt:get-all',
  AUTH_SIGN_IN: 'auth:sign-in',
  AUTH_SIGN_OUT: 'auth:sign-out',
  AUTH_GET_SESSION: 'auth:get-session',
  WINDOW_SHOW: 'window:show',
  WINDOW_HIDE: 'window:hide',
  TRAY_UPDATE: 'tray:update'
} as const

// Global shortcuts
export const SHORTCUTS = {
  SAVE_PROMPT: 'CommandOrControl+Shift+P',
  TOGGLE_WINDOW: 'CommandOrControl+Shift+L'
} as const

// Environment variables
export const ENV_VARS = {
  SUPABASE_URL: 'VITE_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'VITE_SUPABASE_ANON_KEY',
  OPENROUTER_API_KEY: 'VITE_OPENROUTER_API_KEY'
} as const

// Performance constants
export const PERFORMANCE = {
  PROMPT_SAVE_TIMEOUT: 500,
  SEARCH_DEBOUNCE: 300,
  AI_CATEGORIZATION_TIMEOUT: 3000,
  APP_STARTUP_TIMEOUT: 2000
} as const
