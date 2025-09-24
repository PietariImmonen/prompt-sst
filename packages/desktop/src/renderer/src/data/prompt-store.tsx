import { ReadTransaction, WriteTransaction } from 'replicache'

import { Prompt } from '@prompt-saver/core/models/Prompt'

export namespace PromptStore {
  function sortPrompts(list: Prompt[]) {
    return [...list].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1
      if (!a.isFavorite && b.isFavorite) return 1
      const createdA = a.timeCreated ? new Date(a.timeCreated).getTime() : 0
      const createdB = b.timeCreated ? new Date(b.timeCreated).getTime() : 0
      return createdB - createdA
    })
  }

  export function list() {
    return async (tx: ReadTransaction) => {
      try {
        const prompts = await tx.scan<Prompt>({ prefix: '/prompt/' }).toArray()
        // Filter out any invalid prompts and those marked as deleted
        const validPrompts = prompts.filter((prompt) => {
          // Check if prompt has required fields
          if (!prompt.id || !prompt.title || !prompt.content) {
            console.warn('Invalid prompt found, skipping:', prompt)
            return false
          }
          return !prompt.timeDeleted
        })
        return sortPrompts(validPrompts)
      } catch (error) {
        console.error('Error fetching prompts from Replicache:', error)
        return []
      }
    }
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      try {
        const prompt = await tx.get<Prompt>(`/prompt/${id}`)
        // Validate prompt before returning
        if (!prompt) return undefined
        if (!prompt.id || !prompt.title || !prompt.content) {
          console.warn('Invalid prompt found for ID:', id)
          return undefined
        }
        return prompt && !prompt.timeDeleted ? prompt : undefined
      } catch (error) {
        console.error(`Error fetching prompt with ID ${id} from Replicache:`, error)
        return undefined
      }
    }
  }

  export function set(prompt: Prompt) {
    return async (tx: WriteTransaction) => {
      try {
        // Validate prompt before setting
        if (!prompt.id || !prompt.title || !prompt.content) {
          throw new Error('Invalid prompt: missing required fields')
        }
        await tx.set(`/prompt/${prompt.id}`, prompt)
      } catch (error) {
        console.error('Error setting prompt in Replicache:', error)
        throw error
      }
    }
  }

  export function remove(id: string) {
    return async (tx: WriteTransaction) => {
      try {
        await tx.del(`/prompt/${id}`)
      } catch (error) {
        console.error(`Error removing prompt with ID ${id} from Replicache:`, error)
        throw error
      }
    }
  }
}
