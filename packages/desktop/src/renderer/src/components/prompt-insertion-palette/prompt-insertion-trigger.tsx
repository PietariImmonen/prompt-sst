import * as React from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getPromptPaletteShortcutDisplay,
  PROMPT_INSERTION_PALETTE_OPEN_EVENT,
} from "./shortcut";

export function PromptInsertionPaletteTrigger() {
  const shortcutHint = React.useMemo(getPromptPaletteShortcutDisplay, []);

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      // Prevent losing focus on the active input before the palette opens.
      event.preventDefault();
    },
    [],
  );

  const handleClick = React.useCallback(() => {
    document.dispatchEvent(
      new CustomEvent(PROMPT_INSERTION_PALETTE_OPEN_EVENT, {
        detail: {},
      }),
    );
  }, []);

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          aria-label={`Insert prompt (${shortcutHint})`}
        >
          <Sparkles className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" align="end" className="max-w-[260px] text-xs">
        <p className="font-medium text-foreground">Insert stored prompt</p>
        <p className="text-muted-foreground">
          Focus a text field, then click to browse your saved prompts.
        </p>
        <p className="mt-2 font-semibold uppercase tracking-widest text-muted-foreground">
          {shortcutHint}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
