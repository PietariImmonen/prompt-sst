import { ReadTransaction, WriteTransaction } from 'replicache'

import { UserSettings } from '@sst-replicache-template/core/models/UserSettings'

export namespace UserSettingsStore {
  export function get() {
    return async (tx: ReadTransaction) => {
      const result = await tx.scan<UserSettings>({ prefix: `/userSettings/` }).toArray()
      return result.length ? (result[0] as UserSettings) : undefined
    }
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const result = await tx.get<UserSettings>(`/userSettings/${id}`)
      return result as UserSettings | undefined
    }
  }

  export function set(item: UserSettings) {
    return async (tx: WriteTransaction) => {
      await tx.set(`/userSettings/${item.id}`, item)
    }
  }
}
