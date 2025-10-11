import { format } from 'date-fns'
import { Tag as TagIcon, Edit2, Trash2 } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { Tag } from '@prompt-saver/core/models/Tag'

type TagsTableProps = {
  tags: Tag[]
  onEdit: (tag: Tag) => void
  onDelete: (tag: Tag) => void
  className?: string
}

const formatUpdated = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'MMM d, HH:mm')
}

export function TagsTable(props: TagsTableProps) {
  const { tags, onEdit, onDelete, className } = props

  return (
    <div
      className={cn(
        'mx-4 overflow-hidden rounded-lg bg-card/80 shadow-lg backdrop-blur',
        className
      )}
    >
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-border/60">
              <TableHead className="w-2/5 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tag
              </TableHead>
              <TableHead className="w-1/5 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Slug
              </TableHead>
              <TableHead className="w-1/5 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Updated
              </TableHead>
              <TableHead className="w-1/5 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow className="border-border/60">
                <TableCell
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                  colSpan={4}
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <TagIcon className="h-12 w-12 text-muted-foreground/50" />
                    <div>
                      <p className="mb-1 font-medium">No tags yet</p>
                      <p className="text-xs">Create your first tag to start organizing prompts</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow
                  key={tag.id}
                  className="group border-b border-border/60 bg-transparent transition hover:bg-muted/20"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground transition group-hover:border-border group-hover:text-foreground">
                        <TagIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                          {tag.name}
                        </p>
                        {tag.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {tag.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {tag.slug}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatUpdated(tag.timeUpdated)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(tag)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit {tag.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(tag)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {tag.name}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

TagsTable.displayName = 'TagsTable'
