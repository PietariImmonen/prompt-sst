import type { WriteTransaction } from "replicache"
import { createId } from "@paralleldrive/cuid2"

// Define the mutators for Replicache
// These match the mutations defined in the backend
export const mutators = {
  async prompt_create(
    tx: WriteTransaction,
    input: {
      id?: string
      title?: string
      content: string
      source?: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
      categoryPath?: string
      visibility?: 'private' | 'workspace'
      isFavorite?: boolean
      metadata?: Record<string, string | number | boolean | null>
    }
  ) {
    const now = new Date().toISOString()
    const content = (input.content ?? '').trim()
    if (!content) return

    const title = (input.title ?? '').trim() || content.slice(0, 120) || 'Untitled prompt'
    const source = input.source ?? 'other'

    const prompt = {
      id: input.id ?? createId(),
      title,
      content,
      source,
      categoryPath: input.categoryPath ?? `inbox/${source}`,
      visibility: input.visibility ?? 'private',
      isFavorite: input.isFavorite ?? false,
      metadata: input.metadata ?? {},
      timeCreated: now,
      timeUpdated: now,
      timeDeleted: null
    }

    await tx.set(`/prompt/${prompt.id}`, prompt)
  },

  async prompt_update(
    tx: WriteTransaction,
    input: {
      id: string
      title?: string
      content?: string
      source?: 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'other'
      categoryPath?: string
      visibility?: 'private' | 'workspace'
      isFavorite?: boolean
      metadata?: Record<string, string | number | boolean | null>
    }
  ) {
    const existing = await tx.get(`/prompt/${input.id}`)
    if (!existing) return

    const updated = {
      ...existing,
      ...input,
      timeUpdated: new Date().toISOString()
    }

    await tx.set(`/prompt/${input.id}`, updated)
  },

  async prompt_toggle_favorite(
    tx: WriteTransaction,
    input: {
      id: string
      isFavorite: boolean
    }
  ) {
    const existing = await tx.get(`/prompt/${input.id}`)
    if (!existing) return

    await tx.set(`/prompt/${input.id}`, {
      ...existing,
      isFavorite: input.isFavorite,
      timeUpdated: new Date().toISOString()
    })
  },

  async prompt_set_visibility(
    tx: WriteTransaction,
    input: {
      id: string
      visibility: 'private' | 'workspace'
    }
  ) {
    const existing = await tx.get(`/prompt/${input.id}`)
    if (!existing) return

    await tx.set(`/prompt/${input.id}`, {
      ...existing,
      visibility: input.visibility,
      timeUpdated: new Date().toISOString()
    })
  }
}
