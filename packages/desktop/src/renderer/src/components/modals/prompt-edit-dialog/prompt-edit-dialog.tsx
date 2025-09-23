import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

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
import { Prompt } from '@sst-replicache-template/core/models/Prompt'

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

    try {
      await rep.mutate.prompt_update({
        id: prompt.id,
        title: data.title,
        content: data.content,
        categoryPath: data.categoryPath
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update prompt:', error)
      // TODO: Add error handling/toast notification
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

  if (!prompt) {
    return null
  }

  return (
    <EditDialog
      title="Edit Prompt"
      open={open}
      onOpenChange={onOpenChange}
      form="prompt-edit-form"
    >
      <Form {...form}>
        <form
          id="prompt-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          onKeyDown={handleKeyDown}
          className="flex h-full flex-col bg-gray-900"
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter prompt title" 
                        {...field} 
                        className="border-gray-800 bg-gray-800/50 text-gray-200 placeholder:text-gray-500 focus:border-gray-700"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter prompt content"
                        className="min-h-[300px] border-gray-800 bg-gray-800/50 text-gray-200 placeholder:text-gray-500 focus:border-gray-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Category</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter category path" 
                        {...field} 
                        className="border-gray-800 bg-gray-800/50 text-gray-200 placeholder:text-gray-500 focus:border-gray-700"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
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
