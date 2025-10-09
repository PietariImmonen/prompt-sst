import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Edit2, Tag as TagIcon } from 'lucide-react'
import { createId } from '@paralleldrive/cuid2'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
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
    <div className="flex min-h-screen flex-col gap-6 bg-background px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Organize your prompts with tags for better discoverability
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Tag
        </Button>
      </header>

      <main className="grid gap-4">
        {tags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TagIcon className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-medium">No tags yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first tag to start organizing prompts
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Tag
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <Card key={tag.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tag.name}</CardTitle>
                      {tag.description && (
                        <CardDescription className="mt-1">{tag.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      {tag.slug}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Updated{' '}
                      {tag.timeUpdated
                        ? formatDistanceToNow(new Date(tag.timeUpdated), { addSuffix: true })
                        : 'recently'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(tag)}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit {tag.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(tag)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {tag.name}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTag?.name}"? This will remove the tag from
              all prompts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTag} disabled={isSubmitting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
