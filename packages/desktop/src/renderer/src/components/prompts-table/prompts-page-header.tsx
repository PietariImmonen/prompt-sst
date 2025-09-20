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
        'flex flex-wrap items-center gap-3 border-b border-white/5 pb-2 text-white/70 overflow-hidden',
        className
      )}
    >
      <div className="ml-auto flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="relative w-[220px] mx-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Search prompts"
            className=" border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/40 focus:border-white/20"
            onChange={(event) => onSearch?.(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

PromptsPageHeader.displayName = 'PromptsPageHeader'
