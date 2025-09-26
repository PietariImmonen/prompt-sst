import { PromptsPageHeader, PromptsTable } from '@/components/prompts-table'
import { PromptStore } from '@/data/prompt-store'
import { useSubscribe } from '@/hooks/use-replicache'

import type { Prompt } from '@prompt-saver/core/models/Prompt'
import { useState } from 'react'

const PromptsPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const prompts = (useSubscribe(PromptStore.list(), {
    default: [] as Prompt[]
  }) ?? []) as Prompt[]
  
  // Filter prompts based on search query
  const filteredPrompts = searchQuery 
    ? prompts.filter(prompt => 
        prompt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : prompts

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground">
      <div className="flex flex-1 flex-col gap-4 max-w-full overflow-hidden">
        <div className="sticky top-0 z-10 bg-background shadow-sm">
          <PromptsPageHeader 
            onSearch={(value) => setSearchQuery(value)} 
          />
        </div>
        <PromptsTable prompts={filteredPrompts} />
      </div>
    </div>
  )
}

export default PromptsPage
