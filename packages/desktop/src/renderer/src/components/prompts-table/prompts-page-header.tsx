import { Search, Plus } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MultiSelectTags } from '@/components/tag/multi-select-tags'
import type { Tag } from '@prompt-saver/core/models/Tag'

type PromptsPageHeaderProps = {
  className?: string
  activeScope?: 'mine' | 'all'
  onScopeChange?: (scope: 'mine' | 'all') => void
  onSearch?: (value: string) => void
  onCreatePrompt?: () => void
  tags?: Tag[]
  selectedTagIds?: string[]
  onTagFilterChange?: (tagIds: string[]) => void
}

export function PromptsPageHeader(props: PromptsPageHeaderProps) {
  const {
    className,
    onSearch,
    onCreatePrompt,
    tags = [],
    selectedTagIds = [],
    onTagFilterChange
  } = props

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-4 pt-2 bg-black px-4',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="relative w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              className="pl-9 text-sm"
              onChange={(event) => onSearch?.(event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onTagFilterChange && (
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-64">
                <MultiSelectTags
                  tags={tags}
                  selectedTagIds={selectedTagIds}
                  onSelectionChange={onTagFilterChange}
                  placeholder="Select tags to filter..."
                  className="w-full"
                />
              </div>
            </div>
          )}
          {onCreatePrompt && (
            <Button size="sm" onClick={onCreatePrompt}>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

PromptsPageHeader.displayName = 'PromptsPageHeader'
