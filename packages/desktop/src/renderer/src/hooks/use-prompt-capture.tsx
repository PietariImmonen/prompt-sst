import { useEffect } from "react";
import { createId } from "@paralleldrive/cuid2";

import { useReplicache } from "./use-replicache";

interface CapturePayload {
  content: string;
  title: string;
  source: "chatgpt" | "claude" | "gemini" | "grok" | "other";
  categoryPath: string;
  visibility: "private" | "workspace";
  isFavorite: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}

export function usePromptCapture() {
  const rep = useReplicache();

  useEffect(() => {
    if (!window.promptCapture) return;

    const unsubscribe = window.promptCapture.onCapture((payload: CapturePayload) => {
      ;(async () => {
        try {
          const id = createId();
          await rep.mutate.prompt_create({
            id,
            title: payload.title,
            content: payload.content,
            source: payload.source,
            categoryPath: payload.categoryPath,
            visibility: payload.visibility,
            isFavorite: payload.isFavorite,
            metadata: payload.metadata ?? {},
          });
          await rep.pull();
          await window.promptCapture.notifyCapture({
            success: true,
            message: `Saved "${payload.title}"`,
          });
        } catch (error) {
          console.error("Failed to persist prompt", error);
          await window.promptCapture.notifyCapture({
            success: false,
            message: "Unable to save the prompt. Check Replicache connection.",
          });
        }
      })();
    });

    return () => {
      unsubscribe?.();
    };
  }, [rep]);
}
