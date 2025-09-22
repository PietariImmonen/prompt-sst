import * as React from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function PromptCapturePaletteTrigger() {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild></TooltipTrigger>
      <TooltipContent side="top" align="end" className="max-w-[260px] text-xs">
        <p className="font-medium text-foreground">Capture prompt</p>
        <p className="text-muted-foreground">
          Focus a text field, then click to browse your saved prompts.
        </p>
        <p className="mt-2 font-semibold uppercase tracking-widest text-muted-foreground">
          {'Cmd/Ctrl + Shift + P'}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
