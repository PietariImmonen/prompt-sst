import * as React from 'react'
import { toast } from 'sonner'
import { createId } from '@paralleldrive/cuid2'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
import { TagsTable, TagsPageHeader } from '@/components/tags-table'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { TagStore } from '@/data/tag-store'
import type { Tag } from '@prompt-saver/core/models/Tag'

export default function TagsPage() {
  const rep = useReplicache()
  const tags = useSubscribe(TagStore.list(), { default: [] })

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [selectedTag, setSelectedTag] = React.useState<Tag | null>(null)

  const [newTagName, setNewTagName] = React.useState('')
  const [newTagDescription, setNewTagDescription] = React.useState('')
  const [editTagName, setEditTagName] = React.useState('')
  const [editTagDescription, setEditTagDescription] = React.useState('')

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleCreateTag = React.useCallback(async () => {
    if (!rep) return

    const name = newTagName.trim()
    if (!name) {
      toast.error('Tag name is required')
      return
    }

    const exists = tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      toast.error('A tag with this name already exists')
      return
    }

    setIsSubmitting(true)
    try {
      const id = createId()
      await rep.mutate.tag_create({
        id,
        name,
        description: newTagDescription.trim() || undefined
      })

      toast.success(`Tag "${name}" created`)
      setIsCreateOpen(false)
      setNewTagName('')
      setNewTagDescription('')
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast.error('Failed to create tag. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [rep, newTagName, newTagDescription, tags])

  const handleEditTag = React.useCallback(async () => {
    if (!rep || !selectedTag) return

    const name = editTagName.trim()
    if (!name) {
      toast.error('Tag name is required')
      return
    }

    const exists = tags.some(
      (tag) => tag.id !== selectedTag.id && tag.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      toast.error('A tag with this name already exists')
      return
    }

    setIsSubmitting(true)
    try {
      await rep.mutate.tag_update({
        id: selectedTag.id,
        name,
        description: editTagDescription.trim() || null
      })

      toast.success(`Tag updated to "${name}"`)
      setIsEditOpen(false)
      setSelectedTag(null)
      setEditTagName('')
      setEditTagDescription('')
    } catch (error) {
      console.error('Failed to update tag:', error)
      toast.error('Failed to update tag. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [rep, selectedTag, editTagName, editTagDescription, tags])

  const handleDeleteTag = React.useCallback(async () => {
    if (!rep || !selectedTag) return

    setIsSubmitting(true)
    try {
      await rep.mutate.tag_remove(selectedTag.id)

      toast.success(`Tag "${selectedTag.name}" deleted`)
      setIsDeleteOpen(false)
      setSelectedTag(null)
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error('Failed to delete tag. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [rep, selectedTag])

  const openEditDialog = React.useCallback((tag: Tag) => {
    setSelectedTag(tag)
    setEditTagName(tag.name)
    setEditTagDescription(tag.description || '')
    setIsEditOpen(true)
  }, [])

  const openDeleteDialog = React.useCallback((tag: Tag) => {
    setSelectedTag(tag)
    setIsDeleteOpen(true)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-black text-foreground">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="sticky top-0 z-10 bg-black shadow-sm">
          <TagsPageHeader onCreateTag={() => setIsCreateOpen(true)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <TagsTable tags={tags} onEdit={openEditDialog} onDelete={openDeleteDialog} />
        </div>
      </div>

      {/* Create Tag Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Add a new tag to organize your prompts. Tags help you find and filter prompts easily.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Marketing, Engineering, Support"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCreateTag()
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this tag"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateTag} disabled={isSubmitting}>
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>Update the tag name or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Tag name"
                value={editTagName}
                onChange={(e) => setEditTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEditTag()
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                placeholder="Brief description of this tag"
                value={editTagDescription}
                onChange={(e) => setEditTagDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleEditTag} disabled={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-black border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTag?.name}"? This will remove the tag from
              all prompts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTag}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
