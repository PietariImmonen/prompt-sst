import * as React from 'react'
import { format } from 'date-fns'
import { NotebookPen } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

import type { Prompt } from '@sst-replicache-template/core/models/Prompt'
import { PromptEditDialog } from '../modals/prompt-edit-dialog'

type PromptsTableProps = {
  prompts: Prompt[]
  className?: string
}

const truncateContent = (value: string, limit = 160) => {
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}…`
}

const formatCaptured = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'MMM d, HH:mm')
}

export function PromptsTable(props: PromptsTableProps) {
  const { prompts, className } = props

  const [editingPrompt, setEditingPrompt] = React.useState<Prompt | null>(null)

  return (
    <>
      <div
        className={cn(
          'w-full overflow-hidden  border-white/10  backdrop-blur shadow-lg',
          className
        )}
      >
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="w-3/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/60">
                  Prompt
                </TableHead>
                <TableHead className="w-1/4 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/60">
                  Captured
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.length === 0 ? (
                <TableRow className="border-white/5">
                  <TableCell className="px-4 py-8 text-center text-sm text-white/50" colSpan={3}>
                    No prompts captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                prompts.map((prompt) => (
                  <TableRow
                    key={prompt.id}
                    className="group border-b border-white/5 bg-transparent text-white transition hover:bg-white/10"
                    onClick={() => setEditingPrompt(prompt)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition group-hover:border-white/20 group-hover:text-white flex-shrink-0">
                          <NotebookPen className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium text-white/90 group-hover:text-white">
                            {prompt.title || 'Untitled prompt'}
                          </p>
                          <p className="truncate text-xs text-white/50 mt-0.5">
                            {truncateContent(prompt.content, 60)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right align-middle text-xs text-white/60 whitespace-nowrap">
                      {formatCaptured(prompt.timeCreated)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PromptEditDialog
        prompt={editingPrompt || undefined}
        open={!!editingPrompt}
        onOpenChange={(open) => !open && setEditingPrompt(null)}
      />
    </>
  )
}

PromptsTable.displayName = 'PromptsTable'
