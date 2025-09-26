import * as React from 'react'
import { format } from 'date-fns'
import { NotebookPen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn, stripHtml, truncateString } from '@/lib/utils'

import type { Prompt } from '@prompt-saver/core/models/Prompt'

type PromptsTableProps = {
  prompts: Prompt[]
  className?: string
}

const truncateContent = (value: string, limit = 60) => {
  const plainText = stripHtml(value)
  if (plainText.length <= limit) return plainText
  return truncateString(plainText, limit)
}

const formatCaptured = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, 'MMM d, HH:mm')
}

export function PromptsTable(props: PromptsTableProps) {
  const { prompts, className } = props
  const navigate = useNavigate()

  const handleRowSelect = React.useCallback(
    (promptID: string) => {
      navigate(`/sessions/${promptID}/edit`)
    },
    [navigate]
  )

  return (
    <>
      <div
        className={cn(
          'w-full overflow-hidden rounded-lg  bg-card/80 shadow-lg backdrop-blur',
          className
        )}
      >
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="w-3/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Prompt
                </TableHead>
                <TableHead className="w-1/4 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Captured
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.length === 0 ? (
                <TableRow className="border-border/60">
                  <TableCell
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                    colSpan={3}
                  >
                    No prompts captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                prompts.map((prompt) => (
                  <TableRow
                    key={prompt.id}
                    className="group cursor-pointer border-b border-border/60 bg-transparent transition hover:bg-muted/20"
                    onClick={() => handleRowSelect(prompt.id)}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground transition group-hover:border-border group-hover:text-foreground">
                          <NotebookPen className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium text-foreground group-hover:text-foreground">
                            {prompt.title || 'Untitled prompt'}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {truncateContent(prompt.content, 60)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatCaptured(prompt.timeCreated)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    </>
  )
}

PromptsTable.displayName = 'PromptsTable'
