import { ReadTransaction, WriteTransaction } from 'replicache'

import { Prompt, PromptWithTags } from '@prompt-saver/core/models/Prompt'
import type { PromptTag } from '@prompt-saver/core/models/Tag'

export namespace PromptStore {
  function sortPrompts(list: PromptWithTags[]) {
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
        const promptTags = await tx
          .scan<PromptTag>({ prefix: '/prompt_tag/' })
          .toArray()

        const tagsByPrompt = promptTags.reduce<Record<string, string[]>>(
          (acc, entry) => {
            if (!entry.promptID || !entry.tagID || entry.timeDeleted) return acc
            if (!acc[entry.promptID]) acc[entry.promptID] = []
            acc[entry.promptID].push(entry.tagID)
            return acc
          },
          {}
        )

        // Filter out any invalid prompts and those marked as deleted
        const validPrompts = prompts.filter((prompt) => {
          // Check if prompt has required fields
          if (!prompt.id || !prompt.title || !prompt.content) {
            console.warn('Invalid prompt found, skipping:', prompt)
            return false
          }
          return !prompt.timeDeleted
        })
        const enriched = validPrompts.map((prompt) => ({
          ...prompt,
          tagIDs: [...(tagsByPrompt[prompt.id] ?? [])]
        })) as PromptWithTags[]

        return sortPrompts(enriched)
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
        if (prompt.timeDeleted) return undefined

        const promptTags = await tx
          .scan<PromptTag>({ prefix: `/prompt_tag/${prompt.id}/` })
          .toArray()
        const tagIDs = promptTags
          .filter((entry) => !entry.timeDeleted && entry.tagID)
          .map((entry) => entry.tagID)

        return {
          ...prompt,
          tagIDs
        } satisfies PromptWithTags
      } catch (error) {
        console.error(`Error fetching prompt with ID ${id} from Replicache:`, error)
        return undefined
      }
    }
  }

  export function set(prompt: Prompt | PromptWithTags) {
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
