import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PromptsPageHeaderProps = {
  className?: string
  activeScope?: 'mine' | 'all'
  onScopeChange?: (scope: 'mine' | 'all') => void
  onSearch?: (value: string) => void
}

export function PromptsPageHeader(props: PromptsPageHeaderProps) {
  const { className, onSearch } = props

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-border/60 pb-4 pt-2 overflow-hidden bg-background',
        className
      )}
    >
      <div className="ml-4 flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="relative w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            className="pl-9 text-sm"
            onChange={(event) => onSearch?.(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

PromptsPageHeader.displayName = 'PromptsPageHeader'
