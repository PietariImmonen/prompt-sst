import { create } from 'zustand'
import type { Prompt, SearchFilters, SavePromptPayload } from '../types'
import { PromptsService } from '../services/api/prompts'

interface PromptsStore {
  // State
  prompts: Prompt[]
  currentPrompt: Prompt | null
  publicPrompts: Prompt[]
  recentPrompts: Prompt[]
  loading: boolean
  error: string | null
  searchFilters: SearchFilters

  // Actions
  savePrompt: (payload: SavePromptPayload) => Promise<Prompt>
  loadPrompts: () => Promise<void>
  loadPromptById: (id: string) => Promise<Prompt | null>
  updatePrompt: (id: string, updates: Partial<Prompt>) => Promise<void>
  deletePrompt: (id: string) => Promise<void>
  searchPrompts: (filters: SearchFilters) => Promise<void>
  loadPublicPrompts: (filters: SearchFilters) => Promise<void>
  loadRecentPrompts: (limit?: number) => Promise<void>
  loadPromptsByCategory: (category: string) => Promise<void>
  makePromptPublic: (id: string) => Promise<void>
  makePromptPrivate: (id: string) => Promise<void>
  incrementUsageCount: (id: string) => Promise<void>
  setCurrentPrompt: (prompt: Prompt | null) => void
  setSearchFilters: (filters: Partial<SearchFilters>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

const defaultSearchFilters: SearchFilters = {
  query: undefined,
  category: undefined,
  tags: undefined,
  sortBy: 'recent',
  limit: 20,
  offset: 0
}

export const usePromptsStore = create<PromptsStore>((set, get) => ({
  // Initial state
  prompts: [],
  currentPrompt: null,
  publicPrompts: [],
  recentPrompts: [],
  loading: false,
  error: null,
  searchFilters: defaultSearchFilters,

  // Actions
  savePrompt: async (payload: SavePromptPayload) => {
    set({ loading: true, error: null })
    try {
      const newPrompt = await PromptsService.savePrompt(payload)
      const { prompts } = get()
      set({
        prompts: [newPrompt, ...prompts],
        loading: false
      })
      return newPrompt
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save prompt'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  loadPrompts: async () => {
    set({ loading: true, error: null })
    try {
      const prompts = await PromptsService.getAllPrompts()
      set({ prompts, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load prompts'
      set({ error: errorMessage, loading: false })
    }
  },

  loadPromptById: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const prompt = await PromptsService.getPromptById(id)
      set({ currentPrompt: prompt, loading: false })
      return prompt
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load prompt'
      set({ error: errorMessage, loading: false })
      return null
    }
  },

  updatePrompt: async (id: string, updates: Partial<Prompt>) => {
    set({ loading: true, error: null })
    try {
      const updatedPrompt = await PromptsService.updatePrompt(id, updates)
      const { prompts } = get()
      const updatedPrompts = prompts.map((p) => (p.id === id ? updatedPrompt : p))
      set({
        prompts: updatedPrompts,
        currentPrompt: updatedPrompt,
        loading: false
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update prompt'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  deletePrompt: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await PromptsService.deletePrompt(id)
      const { prompts } = get()
      const filteredPrompts = prompts.filter((p) => p.id !== id)
      set({
        prompts: filteredPrompts,
        currentPrompt: null,
        loading: false
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete prompt'
      set({ error: errorMessage, loading: false })
      throw error
    }
  },

  searchPrompts: async (filters: SearchFilters) => {
    set({ loading: true, error: null, searchFilters: filters })
    try {
      const prompts = await PromptsService.searchPrompts(filters)
      set({ prompts, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search prompts'
      set({ error: errorMessage, loading: false })
    }
  },

  loadPublicPrompts: async (filters: SearchFilters) => {
    set({ loading: true, error: null })
    try {
      const publicPrompts = await PromptsService.getPublicPrompts(filters)
      set({ publicPrompts, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load public prompts'
      set({ error: errorMessage, loading: false })
    }
  },

  loadRecentPrompts: async (limit = 10) => {
    set({ loading: true, error: null })
    try {
      const recentPrompts = await PromptsService.getRecentPrompts(limit)
      set({ recentPrompts, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recent prompts'
      set({ error: errorMessage, loading: false })
    }
  },

  loadPromptsByCategory: async (category: string) => {
    set({ loading: true, error: null })
    try {
      const prompts = await PromptsService.getPromptsByCategory(category)
      set({ prompts, loading: false })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load prompts by category'
      set({ error: errorMessage, loading: false })
    }
  },

  makePromptPublic: async (id: string) => {
    try {
      await PromptsService.makePromptPublic(id)
      const { prompts } = get()
      const updatedPrompts = prompts.map((p) => (p.id === id ? { ...p, is_public: true } : p))
      set({ prompts: updatedPrompts })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to make prompt public'
      set({ error: errorMessage })
      throw error
    }
  },

  makePromptPrivate: async (id: string) => {
    try {
      await PromptsService.makePromptPrivate(id)
      const { prompts } = get()
      const updatedPrompts = prompts.map((p) => (p.id === id ? { ...p, is_public: false } : p))
      set({ prompts: updatedPrompts })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to make prompt private'
      set({ error: errorMessage })
      throw error
    }
  },

  incrementUsageCount: async (id: string) => {
    try {
      await PromptsService.incrementUsageCount(id)
      const { prompts } = get()
      const updatedPrompts = prompts.map((p) =>
        p.id === id ? { ...p, usage_count: p.usage_count + 1 } : p
      )
      set({ prompts: updatedPrompts })
    } catch (error) {
      // Silent fail for usage count increment
      console.warn('Failed to increment usage count:', error)
    }
  },

  setCurrentPrompt: (prompt: Prompt | null) => {
    set({ currentPrompt: prompt })
  },

  setSearchFilters: (filters: Partial<SearchFilters>) => {
    const { searchFilters } = get()
    set({ searchFilters: { ...searchFilters, ...filters } })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  }
}))
