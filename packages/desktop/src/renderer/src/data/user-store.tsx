import { ReadTransaction, WriteTransaction } from 'replicache'

import { User } from '@prompt-saver/core/models/User'

export namespace UserStore {
  export function list() {
    return async (tx: ReadTransaction) => {
      const result = await tx.scan<User>({ prefix: `/user/` }).toArray()
      return result.sort((a, b) => a.name.localeCompare(b.name)) as User[]
    }
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const result = await tx.get<User>(`/user/${id}`)
      return result as User | undefined
    }
  }

  export function fromEmail(email: string) {
    return async (tx: ReadTransaction) => {
      const all = await list()(tx)
      return all.find((u) => u.email === email) as User | undefined
    }
  }

  export function set(item: User) {
    return async (tx: WriteTransaction) => {
      await tx.set(`/user/${item.id}`, item)
    }
  }

  export function remove(id: string) {
    return async (tx: WriteTransaction) => {
      await tx.del(`/user/${id}`)
    }
  }
}
