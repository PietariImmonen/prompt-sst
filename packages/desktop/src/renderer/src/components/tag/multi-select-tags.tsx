import * as React from 'react'
import { X, Check, ChevronsUpDown, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Tag } from '@prompt-saver/core/models/Tag'

export type MultiSelectTagsProps = {
  tags: Tag[]
  selectedTagIds: string[]
  onSelectionChange: (tagIds: string[]) => void
  onCreateTag?: (name: string) => Promise<void>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MultiSelectTags({
  tags,
  selectedTagIds,
  onSelectionChange,
  onCreateTag,
  placeholder = 'Select tags...',
  disabled = false,
  className
}: MultiSelectTagsProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [isCreating, setIsCreating] = React.useState(false)

  const selectedTags = React.useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  )

  const normalizedSearch = search.trim().toLowerCase()
  const searchMatches = tags.filter((tag) =>
    tag.name.toLowerCase().includes(normalizedSearch)
  )

  const exactMatch = tags.find((tag) => tag.name.toLowerCase() === normalizedSearch)
  const canCreate = onCreateTag && normalizedSearch.length > 0 && !exactMatch

  const toggleTag = React.useCallback(
    (tagId: string) => {
      if (disabled) return

      if (selectedTagIds.includes(tagId)) {
        onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
      } else {
        onSelectionChange([...selectedTagIds, tagId])
      }
    },
    [selectedTagIds, onSelectionChange, disabled]
  )

  const removeTag = React.useCallback(
    (tagId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId))
    },
    [selectedTagIds, onSelectionChange, disabled]
  )

  const handleCreateTag = React.useCallback(
    async (name: string) => {
      if (!onCreateTag || isCreating || disabled) return

      setIsCreating(true)
      try {
        await onCreateTag(name)
        setSearch('')
      } catch (error) {
        console.error('Failed to create tag:', error)
      } finally {
        setIsCreating(false)
      }
    },
    [onCreateTag, isCreating, disabled]
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${selectedTags.length === 1 ? '' : 's'} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full bg-black p-0" align="start">
          <Command shouldFilter={false} className="bg-black">
            <CommandInput
              placeholder="Search or create tags..."
              value={search}
              onValueChange={setSearch}
              className="bg-black"
            />
            <CommandList className="bg-black">
              {searchMatches.length === 0 && !canCreate && (
                <CommandEmpty>No tags found.</CommandEmpty>
              )}

              {canCreate && (
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      handleCreateTag(search.trim())
                    }}
                    disabled={isCreating}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>
                      Create <strong>"{search.trim()}"</strong>
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {searchMatches.length > 0 && (
                <CommandGroup>
                  {searchMatches.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.id}
                        onSelect={() => toggleTag(tag.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>{tag.name}</span>
                        {tag.description && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {tag.description}
                          </span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-sm">{tag.name}</span>
              <button
                type="button"
                onClick={(e) => removeTag(tag.id, e)}
                disabled={disabled}
                className={cn(
                  'rounded-sm p-0.5 transition-colors hover:bg-muted',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                aria-label={`Remove ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
