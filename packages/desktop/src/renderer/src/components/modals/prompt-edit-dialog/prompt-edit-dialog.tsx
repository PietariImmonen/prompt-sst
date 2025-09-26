import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useReplicache } from '@/hooks/use-replicache'
import { Prompt } from '@prompt-saver/core/models/Prompt'

import { EditDialog } from '../edit-dialog'

const promptEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  categoryPath: z.string().min(1, 'Category is required')
})

type PromptEditFormValues = z.infer<typeof promptEditSchema>

interface PromptEditDialogProps {
  prompt?: Prompt
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PromptEditDialog({ prompt, open, onOpenChange }: PromptEditDialogProps) {
  const rep = useReplicache()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<PromptEditFormValues>({
    resolver: zodResolver(promptEditSchema),
    defaultValues: {
      title: prompt?.title || '',
      content: prompt?.content || '',
      categoryPath: prompt?.categoryPath || ''
    }
  })

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

      toast.success('Prompt updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update prompt:', error)
      toast.error('Failed to update prompt. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Cmd+S or Ctrl+S to save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault()
      form.handleSubmit(handleSubmit)()
    }

    // Escape to close
    if (event.key === 'Escape') {
      onOpenChange(false)
    }
  }

  // Reset form when prompt changes or dialog opens
  React.useEffect(() => {
    if (open && prompt) {
      form.reset({
        title: prompt.title || '',
        content: prompt.content || '',
        categoryPath: prompt.categoryPath || ''
      })
    }
  }, [open, prompt, form])

  // Handle the case where prompt data might be loading
  const isPromptValid = prompt && prompt.id && prompt.title && prompt.content

  if (!prompt) {
    return null
  }

  // Show loading state if prompt data is not yet valid
  if (!isPromptValid) {
    return (
      <EditDialog
        title="Loading Prompt..."
        open={open}
        onOpenChange={onOpenChange}
        form="prompt-edit-form"
      >
        <div className="flex h-full items-center justify-center p-6">
          <div className="text-muted-foreground">Loading prompt data...</div>
        </div>
      </EditDialog>
    )
  }

  return (
    <EditDialog title="Edit Prompt" open={open} onOpenChange={onOpenChange} form="prompt-edit-form">
      <Form {...form}>
        <form
          id="prompt-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          onKeyDown={handleKeyDown}
          className="flex h-full flex-col bg-background"
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter prompt title" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter prompt content"
                        className="min-h-[300px] bg-background/70"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category path" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </EditDialog>
  )
}
