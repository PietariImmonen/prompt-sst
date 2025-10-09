import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { promptTag, tag } from "../domain/tag/tag.sql";

export const TagSchema = createSelectSchema(tag, {
  id: (schema) => schema.cuid2(),
  workspaceID: (schema) => schema.cuid2(),
  name: (schema) => schema.trim().min(1),
  slug: (schema) => schema.trim().min(1),
  description: (schema) => schema.trim().min(1).nullable(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().nullable().optional(),
});

export type Tag = z.infer<typeof TagSchema>;

export const PromptTagSchema = createSelectSchema(promptTag, {
  workspaceID: (schema) => schema.cuid2(),
  promptID: (schema) => schema.cuid2(),
  tagID: (schema) => schema.cuid2(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().nullable().optional(),
});

export type PromptTag = z.infer<typeof PromptTagSchema>;
