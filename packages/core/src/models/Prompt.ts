import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { prompt } from "../domain/prompt/prompt.sql";

export const PromptSchema = createSelectSchema(prompt, {
  id: (schema) => schema.cuid2(),
  workspaceID: (schema) => schema.cuid2(),
  userID: (schema) => schema.cuid2(),
  title: (schema) => schema.trim().min(1),
  content: (schema) => schema.min(1),
  source: () =>
    z.enum(["chatgpt", "claude", "gemini", "grok", "other"]).default("other"),
  categoryPath: (schema) => schema.trim().min(1),
  visibility: () => z.enum(["private", "workspace"]).default("private"),
  isFavorite: (schema) => schema.default(false),
  metadata: () =>
    z
      .record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()]),
      )
      .default({}),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().nullable().optional(),
});

export type Prompt = z.infer<typeof PromptSchema>;
