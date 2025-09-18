import { usePromptsStore } from '../store/prompts'

/**
 * Custom hook for prompts management
 */
export const usePrompts = () => {
  const promptsStore = usePromptsStore()

  return {
    prompts: promptsStore.prompts,
    currentPrompt: promptsStore.currentPrompt,
    publicPrompts: promptsStore.publicPrompts,
    recentPrompts: promptsStore.recentPrompts,
    loading: promptsStore.loading,
    error: promptsStore.error,
    searchFilters: promptsStore.searchFilters,
    savePrompt: promptsStore.savePrompt,
    loadPrompts: promptsStore.loadPrompts,
    loadPromptById: promptsStore.loadPromptById,
    updatePrompt: promptsStore.updatePrompt,
    deletePrompt: promptsStore.deletePrompt,
    searchPrompts: promptsStore.searchPrompts,
    loadPublicPrompts: promptsStore.loadPublicPrompts,
    loadRecentPrompts: promptsStore.loadRecentPrompts,
    loadPromptsByCategory: promptsStore.loadPromptsByCategory,
    makePromptPublic: promptsStore.makePromptPublic,
    makePromptPrivate: promptsStore.makePromptPrivate,
    incrementUsageCount: promptsStore.incrementUsageCount,
    setCurrentPrompt: promptsStore.setCurrentPrompt,
    setSearchFilters: promptsStore.setSearchFilters,
    clearError: promptsStore.clearError
  }
}
