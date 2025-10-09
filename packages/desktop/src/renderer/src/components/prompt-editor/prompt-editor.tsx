import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { formatDistanceToNow } from 'date-fns'
import { ChevronsUpDown, Plus, X } from 'lucide-react'
import { createId } from '@paralleldrive/cuid2'

import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'

import { Editor as PromptContentEditor } from '@/components/editor/editor'
import { EditorToolbar } from '@/components/editor/toolbar/editor-toolbar'
import { useReplicache, useSubscribe } from '@/hooks/use-replicache'
import { TagStore } from '@/data/tag-store'
import type { Tag } from '@prompt-saver/core/models/Tag'
import { PromptWithTags } from '@prompt-saver/core/models/Prompt'

const promptEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  categoryPath: z.string().min(1, 'Category is required'),
  tagIDs: z.array(z.string()).default([])
})

type PromptEditFormValues = z.infer<typeof promptEditSchema>

const CATEGORY_OPTIONS = [
  { label: 'General', value: 'general' },
  { label: 'Customer Support', value: 'customer-support' },
  { label: 'Product Launch', value: 'product-launch' },
  { label: 'Engineering', value: 'engineering' },
  { label: 'Marketing Copy', value: 'marketing-copy' }
]

type PromptEditorProps = {
  prompt: PromptWithTags
  onDismiss: () => void
}

export function PromptEditor({ prompt, onDismiss }: PromptEditorProps) {
  const rep = useReplicache()
  const availableTags = useSubscribe(TagStore.list(), { default: [] })
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCreatingTag, setIsCreatingTag] = React.useState(false)

  const form = useForm<PromptEditFormValues>({
    resolver: zodResolver(promptEditSchema),
    defaultValues: {
      title: prompt.title || '',
      content: prompt.content || '',
      categoryPath: prompt.categoryPath || CATEGORY_OPTIONS[0]?.value || '',
      tagIDs: prompt.tagIDs ?? []
    }
  })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }
      }),
      Placeholder.configure({
        placeholder: 'Write the body of your prompt…'
      })
    ],
    content: prompt.content || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none min-h-[520px] px-1 py-2 text-base focus:outline-none prose-headings:font-semibold sm:px-3'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      form.setValue('content', html, { shouldDirty: true })
    }
  })

  const handleCreateTag = React.useCallback(
    async (label: string) => {
      if (!rep) return
      const name = label.trim()
      if (!name) return

      const exists = availableTags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())
      if (exists) {
        toast.error('Tag already exists')
        return
      }

      const id = createId()
      try {
        setIsCreatingTag(true)
        await rep.mutate.tag_create({ id, name })
        const next = Array.from(new Set([...(form.getValues('tagIDs') ?? []), id]))
        form.setValue('tagIDs', next, { shouldDirty: true })
      } catch (error) {
        console.error('Failed to create tag:', error)
        toast.error('Failed to create tag. Please try again.')
      } finally {
        setIsCreatingTag(false)
      }
    },
    [rep, availableTags, form]
  )

  const resetToPrompt = React.useCallback(() => {
    const nextValues: PromptEditFormValues = {
      title: prompt.title || '',
      content: prompt.content || '',
      categoryPath: prompt.categoryPath || CATEGORY_OPTIONS[0]?.value || '',
      tagIDs: prompt.tagIDs ?? []
    }
    form.reset(nextValues)
    if (editor) {
      editor.commands.setContent(nextValues.content || '', false)
    }
  }, [prompt, form, editor])

  React.useEffect(() => {
    resetToPrompt()
  }, [resetToPrompt])

  const handleSubmit = async (data: PromptEditFormValues) => {
    if (!prompt?.id || !rep) return

    setIsLoading(true)
    try {
      await rep.mutate.prompt_update({
        id: prompt.id,
        title: data.title,
        content: data.content,
        categoryPath: data.categoryPath,
        tagIDs: data.tagIDs ?? []
      })

      onDismiss()
    } catch (error) {
      console.error('Failed to update prompt:', error)
      toast.error('Failed to update prompt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault()
      form.handleSubmit(handleSubmit)()
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      handleSubmit(form.getValues())
      handleCancel()
    }
  }

  const handleCancel = () => {
    resetToPrompt()
    onDismiss()
  }

  const lastUpdated = prompt.timeUpdated
    ? formatDistanceToNow(new Date(prompt.timeUpdated), { addSuffix: true })
    : 'Not synced yet'

  return (
    <div className="flex h-full w-full flex-1 overflow-hidden bg-black">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          onKeyDown={handleKeyDown}
          className="flex h-full w-full overflow-hidden"
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border/60 bg-black/80 px-8 py-6">
              <div className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      <Input
                        {...field}
                        autoFocus
                        placeholder="Untitled prompt"
                        className="w-full border-none bg-transparent px-0 text-3xl font-semibold tracking-tight focus-visible:ring-0"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground">Last updated {lastUpdated}</p>
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagIDs"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tags
                      </FormLabel>
                      <TagPicker
                        tags={availableTags}
                        value={field.value ?? []}
                        onChange={(next) => field.onChange(next)}
                        onCreate={handleCreateTag}
                        disabled={isLoading}
                        isCreating={isCreatingTag}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
              <EditorToolbar editor={editor} disabled={isLoading} />
              <div className="mt-6 flex-1 overflow-y-auto rounded-lg bg-black/80">
                <PromptContentEditor editor={editor} />
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

type TagPickerProps = {
  tags: Tag[]
  value: string[]
  onChange: (value: string[]) => void
  onCreate: (label: string) => Promise<void>
  disabled?: boolean
  isCreating?: boolean
}

function TagPicker({ tags, value, onChange, onCreate, disabled, isCreating }: TagPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedTags = React.useMemo(
    () => tags.filter((tag) => value.includes(tag.id)),
    [tags, value]
  )

  const existingNameLookup = React.useMemo(() => {
    const map = new Map<string, Tag>()
    for (const tag of tags) {
      map.set(tag.name.toLowerCase(), tag)
    }
    return map
  }, [tags])

  const normalizedSearch = search.trim()
  const canCreate =
    normalizedSearch.length > 0 && !existingNameLookup.has(normalizedSearch.toLowerCase())

  const toggleTag = React.useCallback(
    (id: string) => {
      if (disabled) return
      if (value.includes(id)) {
        onChange(value.filter((tagID) => tagID !== id))
      } else {
        onChange([...value, id])
      }
    },
    [disabled, value, onChange]
  )

  const handleCreate = React.useCallback(async () => {
    if (!canCreate || disabled) return
    await onCreate(normalizedSearch)
    setSearch('')
  }, [canCreate, disabled, onCreate, normalizedSearch])

  return (
    <div className="space-y-2">
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
            {value.length ? (
              <span>
                {value.length} tag{value.length > 1 ? 's' : ''} selected
              </span>
            ) : (
              <span className="text-muted-foreground">Select tags</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={async () => {
                      await handleCreate()
                      setOpen(false)
                    }}
                    disabled={disabled || isCreating}
                  >
                    <Plus className="h-4 w-4" />
                    Create "{normalizedSearch}"
                  </Button>
                ) : (
                  <span className="px-3 py-2 text-sm text-muted-foreground">No tags found</span>
                )}
              </CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => {
                  const checked = value.includes(tag.id)
                  return (
                    <CommandItem key={tag.id} value={tag.name} onSelect={() => toggleTag(tag.id)}>
                      <Checkbox
                        checked={checked}
                        className="pointer-events-none mr-2 h-4 w-4"
                        aria-label={`Toggle ${tag.name}`}
                      />
                      <span>{tag.name}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="rounded p-0.5 transition hover:bg-muted"
                aria-label={`Remove ${tag.name}`}
                disabled={disabled}
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
