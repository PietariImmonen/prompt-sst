import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TagsPageHeaderProps = {
  className?: string
  onCreateTag: () => void
}

export function TagsPageHeader(props: TagsPageHeaderProps) {
  const { className, onCreateTag } = props

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-border/60 pb-4 pt-2 bg-black px-4',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">Tags</h1>
        </div>
        <Button size="sm" onClick={onCreateTag}>
          <Plus className="mr-2 h-4 w-4" />
          New Tag
        </Button>
      </div>
    </div>
  )
}

TagsPageHeader.displayName = 'TagsPageHeader'
