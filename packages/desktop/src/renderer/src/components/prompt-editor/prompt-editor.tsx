import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { formatDistanceToNow } from 'date-fns'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Editor as PromptContentEditor } from '@/components/editor/editor'
import { EditorToolbar } from '@/components/editor/toolbar/editor-toolbar'
import { useReplicache } from '@/hooks/use-replicache'
import { Prompt } from '@prompt-saver/core/models/Prompt'

const promptEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  categoryPath: z.string().min(1, 'Category is required')
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
  prompt: Prompt
  onDismiss: () => void
}

export function PromptEditor({ prompt, onDismiss }: PromptEditorProps) {
  const rep = useReplicache()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<PromptEditFormValues>({
    resolver: zodResolver(promptEditSchema),
    defaultValues: {
      title: prompt.title || '',
      content: prompt.content || '',
      categoryPath: prompt.categoryPath || CATEGORY_OPTIONS[0]?.value || ''
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

  const resetToPrompt = React.useCallback(() => {
    const nextValues: PromptEditFormValues = {
      title: prompt.title || '',
      content: prompt.content || '',
      categoryPath: prompt.categoryPath || CATEGORY_OPTIONS[0]?.value || ''
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
        categoryPath: data.categoryPath
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
    <div className="flex h-full w-full flex-1 overflow-hidden bg-background">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          onKeyDown={handleKeyDown}
          className="flex h-full w-full overflow-hidden"
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-border/60 bg-background/80 px-8 py-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <div className="flex-1">
                      <Input
                        {...field}
                        autoFocus
                        placeholder="Untitled prompt"
                        className="w-full border-none bg-transparent px-0 text-3xl font-semibold tracking-tight focus-visible:ring-0"
                        disabled={isLoading}
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last updated {lastUpdated}
                      </p>
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
              <EditorToolbar editor={editor} disabled={isLoading} />
              <div className="mt-6 flex-1 overflow-y-auto rounded-lg bg-background/80">
                <PromptContentEditor editor={editor} />
              </div>
            </div>
          </div>

          {/* <aside className="hidden w-64 max-w-md flex-shrink-0 border-l border-border/60 bg-muted/10 px-6 py-8 sm:block">
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="categoryPath"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Categorization
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || CATEGORY_OPTIONS[0]?.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-medium uppercase tracking-wide text-muted-foreground/80">
                  Quick notes
                </p>
                <p>
                  These options are mock data today. Wire this dropdown to your taxonomy service
                  when it is ready.
                </p>
              </div>
            </div>
          </aside> */}
        </form>
      </Form>
    </div>
  )
}
