import { createId } from '@paralleldrive/cuid2'
import type { WriteTransaction } from 'replicache'

import type { PromptWithTags } from '@prompt-saver/core/models/Prompt'
import type { PromptTag, Tag } from '@prompt-saver/core/models/Tag'
import { Client } from '@prompt-saver/functions/replicache/framework'
import type { ServerType } from '@prompt-saver/functions/replicache/server'

import { workspaceStore } from '@/providers/workspace-provider/workspace-context'
import { PromptStore } from './prompt-store'
import { PromptTagStore, TagStore } from './tag-store'
import { UserSettingsStore } from './user-settings'
import { UserStore } from './user-store'
import { WorkspaceStore } from './workspace-store'

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ')

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const normalizeTagIDs = (tagIDs?: string[]) => {
  if (!tagIDs) return undefined
  const unique = new Set(tagIDs.map((value) => value.trim()).filter((value) => value.length > 0))
  return Array.from(unique)
}

async function applyPromptTags(
  tx: WriteTransaction,
  workspaceID: string,
  promptID: string,
  tagIDs: string[]
) {
  const now = new Date().toISOString()
  const existing = await tx.scan<PromptTag>({ prefix: `/prompt_tag/${promptID}/` }).toArray()

  const byTag = new Map<string, PromptTag>()
  for (const entry of existing) {
    if (!entry.tagID) continue
    byTag.set(entry.tagID, entry)
  }

  const desired = new Set(tagIDs)

  for (const tagID of desired) {
    const current = byTag.get(tagID)
    const record: PromptTag = {
      id: current?.id ?? createId(),
      workspaceID,
      promptID,
      tagID,
      timeCreated: current?.timeCreated ?? now,
      timeUpdated: now,
      timeDeleted: null
    }
    await PromptTagStore.set(record)(tx)
  }

  for (const [tagID, entry] of byTag.entries()) {
    if (desired.has(tagID)) continue
    if (entry.timeDeleted) continue
    await PromptTagStore.set({
      ...entry,
      timeDeleted: now,
      timeUpdated: now
    })(tx)
  }
}

function buildTagRecord(input: {
  id?: string
  name: string
  slug?: string
  description?: string | null
}): Tag {
  const workspace = workspaceStore.get()
  if (!workspace?.id) throw new Error('Workspace unavailable')
  const now = new Date().toISOString()
  const name = normalizeWhitespace(input.name)
  const id = input.id ?? createId()
  const slugSource = input.slug ?? name
  const slug = slugify(slugSource) || slugify(name) || id

  return {
    id,
    workspaceID: workspace.id,
    name,
    slug,
    description:
      input.description === undefined
        ? null
        : input.description === null
          ? null
          : normalizeWhitespace(input.description),
    timeCreated: now,
    timeUpdated: now,
    timeDeleted: null
  }
}

export const mutators = new Client<ServerType>()
  .mutation('user_create', async (tx, input) => {
    await UserStore.set({
      ...input,
      id: input.id ?? createId(),
      timeSeen: null,
      first: input.first ?? false,
      workspaceID: (workspaceStore.get()?.id as string) ?? '',
      role: input.role ?? 'member',
      isOnboarded: false
    })(tx)
  })
  .mutation('user_remove', async (tx, input) => {
    await UserStore.remove(input)(tx)
  })
  .mutation('user_update', async (tx, input) => {
    await UserStore.set(input)(tx)
  })
  .mutation('workspace_update', async (tx, input) => {
    await WorkspaceStore.set(input)(tx)
  })
  .mutation('user_settings_update', async (tx, input) => {
    await UserSettingsStore.set(input)(tx)
  })
  .mutation('tag_create', async (tx, input) => {
    try {
      const tag = buildTagRecord(input)
      await TagStore.set(tag)(tx)
    } catch (error) {
      console.error('Failed to create tag locally', error)
    }
  })
  .mutation('tag_update', async (tx, input) => {
    const existing = await TagStore.fromID(input.id)(tx)
    if (!existing) return
    const now = new Date().toISOString()
    const name = input.name ? normalizeWhitespace(input.name) : existing.name
    const slugSource = input.slug ?? (input.name ? name : existing.slug)
    const slug = slugify(slugSource) || existing.slug
    const description =
      input.description !== undefined
        ? input.description === null
          ? null
          : normalizeWhitespace(input.description)
        : (existing.description ?? null)

    const updated: Tag = {
      ...existing,
      name,
      slug,
      description,
      timeUpdated: now,
      timeDeleted: null
    }

    await TagStore.set(updated)(tx)
  })
  .mutation('tag_remove', async (tx, input) => {
    const existing = await TagStore.fromID(input)(tx)
    if (!existing) return
    const now = new Date().toISOString()

    await TagStore.set({
      ...existing,
      timeDeleted: now,
      timeUpdated: now
    })(tx)

    const promptTags = await tx.scan<PromptTag>({ prefix: '/prompt_tag/' }).toArray()
    for (const entry of promptTags) {
      if (entry.tagID !== input || entry.timeDeleted) continue
      await PromptTagStore.set({
        ...entry,
        timeDeleted: now,
        timeUpdated: now
      })(tx)
    }
  })
  .mutation('prompt_create', async (tx, input) => {
    const workspace = workspaceStore.get()
    if (!workspace?.id) return
    const now = new Date().toISOString()
    const content = (input.content ?? '').trim()
    if (!content) return
    const title = (input.title ?? '').trim() || content.slice(0, 120) || 'Untitled prompt'
    const id = input.id ?? createId()
    const source = input.source ?? 'other'
    const tagIDs = normalizeTagIDs(input.tagIDs) ?? []

    if (tagIDs.length > 0) {
      await applyPromptTags(tx, workspace.id, id, tagIDs)
    }

    const prompt: PromptWithTags = {
      id,
      workspaceID: workspace.id,
      userID: '',
      title,
      content,
      source,
      categoryPath: input.categoryPath ?? `inbox/${source}`,
      visibility: input.visibility ?? 'private',
      isFavorite: input.isFavorite ?? false,
      metadata: input.metadata ?? {},
      timeCreated: now,
      timeUpdated: now,
      timeDeleted: null,
      tagIDs
    }

    await PromptStore.set(prompt)(tx)
  })
  .mutation('prompt_update', async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx)
    if (!existing) return
    const normalizedTagIDs = normalizeTagIDs(input.tagIDs)
    const workspaceID = existing.workspaceID || (workspaceStore.get()?.id as string) || ''

    if (normalizedTagIDs !== undefined && workspaceID) {
      await applyPromptTags(tx, workspaceID, existing.id, normalizedTagIDs)
    }

    const updated: PromptWithTags = {
      ...existing,
      ...input,
      source: input.source ?? existing.source,
      categoryPath: input.categoryPath ?? existing.categoryPath,
      visibility: input.visibility ?? existing.visibility,
      isFavorite: input.isFavorite ?? existing.isFavorite,
      metadata: input.metadata ?? existing.metadata,
      tagIDs: normalizedTagIDs ?? existing.tagIDs ?? [],
      timeUpdated: new Date().toISOString()
    }

    await PromptStore.set(updated)(tx)
  })
  .mutation('prompt_toggle_favorite', async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx)
    if (!existing) return
    await PromptStore.set({
      ...existing,
      isFavorite: input.isFavorite,
      timeUpdated: new Date().toISOString()
    })(tx)
  })
  .mutation('prompt_set_visibility', async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx)
    if (!existing) return
    await PromptStore.set({
      ...existing,
      visibility: input.visibility,
      timeUpdated: new Date().toISOString()
    })(tx)
  })
  .mutation('prompt_set_tags', async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx)
    if (!existing) return
    const workspaceID = existing.workspaceID || (workspaceStore.get()?.id as string) || ''
    if (!workspaceID) return

    const tagIDs = normalizeTagIDs(input.tagIDs) ?? []
    await applyPromptTags(tx, workspaceID, existing.id, tagIDs)

    await PromptStore.set({
      ...existing,
      tagIDs,
      timeUpdated: new Date().toISOString()
    })(tx)
  })
  .build()
