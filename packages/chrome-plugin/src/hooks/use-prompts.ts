import { useEffect, useState } from "react"

import type { Prompt } from "~lib/types"
import { useReplicache } from "~providers/replicache-provider"

export function usePrompts() {
  const rep = useReplicache()
  const [prompts, setPrompts] = useState<Prompt[]>([])

  useEffect(() => {
    if (!rep) return

    const loadPrompts = async () => {
      const items = await rep.scan({ prefix: "/prompt/" }).toArray()
      const promptData = items.map((item) => item[1] as Prompt)
      setPrompts(promptData)
    }

    loadPrompts()

    // Subscribe to changes
    const unsubscribe = rep.subscribe(
      async (tx) => {
        const items = await tx.scan({ prefix: "/prompt/" }).toArray()
        return items.map((item) => item[1] as Prompt)
      },
      {
        onData: (data) => setPrompts(data)
      }
    )

    return () => unsubscribe()
  }, [rep])

  return prompts
}
