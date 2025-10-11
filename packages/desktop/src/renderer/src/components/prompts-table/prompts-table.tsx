import * as React from 'react'
import { format } from 'date-fns'
import { NotebookPen, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, stripHtml, truncateString } from '@/lib/utils'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { TagStore } from '@/data/tag-store'

import type { Prompt, PromptWithTags } from '@prompt-saver/core/models/Prompt'

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
  const rep = useReplicache()
  const tags = useSubscribe(TagStore.list(), { default: [] })

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [selectedPrompt, setSelectedPrompt] = React.useState<Prompt | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Create a map of tag IDs to tag objects for quick lookup
  const tagMap = React.useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags])

  const handleRowSelect = React.useCallback(
    (promptID: string) => {
      navigate(`/sessions/${promptID}/edit`)
    },
    [navigate]
  )

  const handleDeleteClick = React.useCallback((e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation()
    setSelectedPrompt(prompt)
    setIsDeleteOpen(true)
  }, [])

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!selectedPrompt || !rep) return

    setIsDeleting(true)
    try {
      await rep.mutate.prompt_remove(selectedPrompt.id)
      toast.success(`Prompt "${selectedPrompt.title}" deleted`)
      setIsDeleteOpen(false)
      setSelectedPrompt(null)
    } catch (error) {
      console.error('Failed to delete prompt:', error)
      toast.error('Failed to delete prompt. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [rep, selectedPrompt])

  return (
    <>
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
                  Prompt
                </TableHead>
                <TableHead className="w-1/5 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tags
                </TableHead>
                <TableHead className="w-1/6 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Captured
                </TableHead>
                <TableHead className="w-16 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
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
                prompts.map((prompt) => {
                  const promptWithTags = prompt as PromptWithTags
                  const promptTags = (promptWithTags.tagIDs || [])
                    .map((tagId) => tagMap.get(tagId))
                    .filter(Boolean)

                  return (
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
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1">
                          {promptTags.length > 0 ? (
                            promptTags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag?.id}
                                variant="secondary"
                                className="text-xs px-2 py-0.5"
                              >
                                {tag?.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {promptTags.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{promptTags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatCaptured(prompt.timeCreated)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteClick(e, prompt)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {prompt.title}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-black border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPrompt?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

PromptsTable.displayName = 'PromptsTable'
