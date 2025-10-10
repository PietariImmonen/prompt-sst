import * as React from 'react'
import { createId } from '@paralleldrive/cuid2'
import { toast } from 'sonner'

import { PromptsPageHeader, PromptsTable } from '@/components/prompts-table'
import { PromptStore } from '@/data/prompt-store'
import { TagStore } from '@/data/tag-store'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

import type { Prompt, PromptWithTags } from '@prompt-saver/core/models/Prompt'

const PromptsPage = () => {
  const rep = useReplicache()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([])
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newPromptTitle, setNewPromptTitle] = React.useState('')
  const [newPromptContent, setNewPromptContent] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const prompts = (useSubscribe(PromptStore.list(), {
    default: [] as Prompt[]
  }) ?? []) as Prompt[]

  const tags = useSubscribe(TagStore.list(), { default: [] })

  // Filter prompts based on search query and selected tags
  const filteredPrompts = React.useMemo(() => {
    let filtered = prompts

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (prompt) =>
          prompt.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prompt.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by selected tags
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((prompt) => {
        const promptWithTags = prompt as PromptWithTags
        const promptTagIds = promptWithTags.tagIDs || []
        // Check if prompt has ALL selected tags (AND logic)
        return selectedTagIds.every((tagId) => promptTagIds.includes(tagId))
      })
    }

    return filtered
  }, [prompts, searchQuery, selectedTagIds])

  const handleCreatePrompt = React.useCallback(async () => {
    if (!rep) return

    const title = newPromptTitle.trim()
    const content = newPromptContent.trim()

    if (!title) {
      toast.error('Prompt title is required')
      return
    }

    if (!content) {
      toast.error('Prompt content is required')
      return
    }

    setIsSubmitting(true)
    try {
      const id = createId()
      await rep.mutate.prompt_create({
        id,
        title,
        content,
        source: 'other',
        categoryPath: 'general',
        visibility: 'private',
        isFavorite: false,
        metadata: {}
      })

      toast.success(`Prompt "${title}" created`)
      setIsCreateOpen(false)
      setNewPromptTitle('')
      setNewPromptContent('')
    } catch (error) {
      console.error('Failed to create prompt:', error)
      toast.error('Failed to create prompt. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [rep, newPromptTitle, newPromptContent])

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="sticky top-0 z-10 bg-black shadow-sm">
          <PromptsPageHeader
            onSearch={(value) => setSearchQuery(value)}
            onCreatePrompt={() => setIsCreateOpen(true)}
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagFilterChange={setSelectedTagIds}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <PromptsTable prompts={filteredPrompts} />
        </div>
      </div>

      {/* Create Prompt Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-black border-border">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Add a new prompt manually. You can edit and organize it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Code Review Prompt"
                value={newPromptTitle}
                onChange={(e) => setNewPromptTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    document.getElementById('content')?.focus()
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Enter your prompt content..."
                value={newPromptContent}
                onChange={(e) => setNewPromptContent(e.target.value)}
                disabled={isSubmitting}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false)
                setNewPromptTitle('')
                setNewPromptContent('')
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreatePrompt} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PromptsPage
