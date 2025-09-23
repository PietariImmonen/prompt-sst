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
        'flex flex-wrap items-center gap-3 border-b border-gray-800 pb-4 pt-2 overflow-hidden',
        className
      )}
    >
      <div className="ml-auto flex flex-wrap items-center gap-2 justify-between w-full">
        <div className="relative w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search prompts..."
            className="pl-9 text-sm bg-gray-900 border-gray-800 focus:border-gray-700 text-gray-200 placeholder:text-gray-500"
            onChange={(event) => onSearch?.(event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

PromptsPageHeader.displayName = 'PromptsPageHeader'
