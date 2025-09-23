export interface Prompt {
  id: string
  title: string
  content: string
  categoryPath?: string
  isFavorite?: boolean
  source?: string
  timeCreated?: string
  timeUpdated?: string
  timeDeleted?: string
}

export interface PromptSearchResult {
  prompt: Prompt
  score: number
  rank: number
}

export interface OverlayState {
  isVisible: boolean
  isLoading: boolean
  error?: string
}

export interface PromptPaletteConfig {
  maxResults: number
  searchDebounceMs: number
  retryAttempts: number
  retryDelayMs: number
}

export interface IPCPromptService {
  getPrompts(): Promise<Prompt[]>
  requestPrompts(): void
  onPromptsReceived(callback: (prompts: Prompt[]) => void): () => void
}