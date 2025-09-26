import { PromptsPageHeader, PromptsTable } from '@/components/prompts-table'
import { PromptStore } from '@/data/prompt-store'
import { useSubscribe } from '@/hooks/use-replicache'

import type { Prompt } from '@prompt-saver/core/models/Prompt'

const PromptsPage = () => {
  const prompts = (useSubscribe(PromptStore.list(), {
    default: [] as Prompt[]
  }) ?? []) as Prompt[]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col gap-4 max-w-full overflow-hidden">
        <PromptsPageHeader />
        <PromptsTable prompts={prompts} />
      </div>
    </div>
  )
}

export default PromptsPage
