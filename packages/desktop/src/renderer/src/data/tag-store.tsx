import type { ReadTransaction, WriteTransaction } from 'replicache'

import type { PromptTag, Tag } from '@prompt-saver/core/models/Tag'

const TAG_PREFIX = '/tag/'
const PROMPT_TAG_PREFIX = '/prompt_tag/'

function promptTagKey(promptID: string, tagID: string) {
  return `${PROMPT_TAG_PREFIX}${promptID}/${tagID}`
}

export namespace TagStore {
  export function list() {
    return async (tx: ReadTransaction) => {
      const tags = await tx.scan<Tag>({ prefix: TAG_PREFIX }).toArray()
      return tags.filter((tag) => !tag.timeDeleted)
    }
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const tag = await tx.get<Tag>(`${TAG_PREFIX}${id}`)
      if (!tag || tag.timeDeleted) return undefined
      return tag
    }
  }

  export function set(tag: Tag) {
    return async (tx: WriteTransaction) => {
      await tx.set(`${TAG_PREFIX}${tag.id}`, tag)
    }
  }
}

export namespace PromptTagStore {
  export function listAll() {
    return async (tx: ReadTransaction) => {
      const entries = await tx.scan<PromptTag>({ prefix: PROMPT_TAG_PREFIX }).toArray()
      return entries.filter((entry) => !entry.timeDeleted)
    }
  }

  export function listForPrompt(promptID: string) {
    return async (tx: ReadTransaction) => {
      const entries = await tx
        .scan<PromptTag>({ prefix: `${PROMPT_TAG_PREFIX}${promptID}/` })
        .toArray()
      return entries.filter((entry) => !entry.timeDeleted)
    }
  }

  export function get(promptID: string, tagID: string) {
    return async (tx: ReadTransaction) => {
      const entry = await tx.get<PromptTag>(promptTagKey(promptID, tagID))
      return entry ?? undefined
    }
  }

  export function set(entry: PromptTag) {
    return async (tx: WriteTransaction) => {
      await tx.set(promptTagKey(entry.promptID, entry.tagID), entry)
    }
  }
}
