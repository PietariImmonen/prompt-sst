import type { WriteTransaction } from "replicache"

// Define the mutators for Replicache
// These should match the mutations defined in your backend
export const mutators = {
  // Example mutators - adjust based on your actual backend implementation
  async createPrompt(
    tx: WriteTransaction,
    args: {
      id: string
      content: string
      workspaceID: string
    }
  ) {
    await tx.set(`/prompt/${args.id}`, {
      id: args.id,
      content: args.content,
      workspaceID: args.workspaceID,
      timeCreated: new Date().toISOString(),
      timeUpdated: new Date().toISOString()
    })
  },

  async updatePrompt(
    tx: WriteTransaction,
    args: {
      id: string
      content: string
    }
  ) {
    const existing = await tx.get(`/prompt/${args.id}`)
    if (existing) {
      await tx.set(`/prompt/${args.id}`, {
        ...existing,
        content: args.content,
        timeUpdated: new Date().toISOString()
      })
    }
  },

  async deletePrompt(tx: WriteTransaction, args: { id: string }) {
    await tx.del(`/prompt/${args.id}`)
  }
}
