import * as React from 'react'
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
          'flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 bg-black p-0',
          className
        )}
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
          <div className="flex items-center gap-2 mr-4 mt-[-0.75rem]">
            <Badge
              variant={'outline'}
              className="border-border/60 bg-muted/40 px-1 py-0 font-normal text-muted-foreground"
            >
              esc
            </Badge>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <DialogFooter className="gap-2 border-t border-border/60 px-6 py-4 sm:space-x-0">
          <DialogClose asChild>
            <Button variant={'outline'} size={'sm'}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form={form} size={'sm'} variant={'default'}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
