import * as React from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

import { cn } from '@/lib/utils'

interface EditDialogProps {
  title: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (value: boolean) => void
  form: string
  className?: string
}

export function EditDialog({
  title,
  children,
  open,
  onOpenChange,
  form,
  className
}: EditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 border-gray-800 bg-gray-900',
          className
        )}
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-gray-800 px-6 py-4">
          <DialogTitle className="text-lg font-medium text-gray-200">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={'outline'}
              className="bg-gray-800 px-1 py-0 font-normal text-gray-500 border-gray-700"
            >
              esc
            </Badge>
            <DialogClose asChild>
              <Button size={'icon'} variant={'ghost'} className="m-0 hover:bg-gray-800">
                <X className="size-4 text-gray-500 hover:text-gray-300" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <DialogFooter className="gap-2 border-t border-gray-800 px-6 py-4 sm:space-x-0">
          <DialogClose asChild>
            <Button variant={'outline'} size={'sm'} className="border-gray-700 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={form} size={'sm'} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-purple-500/20">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
