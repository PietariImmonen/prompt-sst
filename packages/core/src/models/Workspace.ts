import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { workspace } from "../domain/workspace/workspace.sql";

export const WorkspaceSchema = createSelectSchema(workspace, {
  id: (schema) => schema.cuid2(),
  slug: (schema) =>
    schema
      .trim()
      .toLowerCase()
      .min(3)
      .regex(/^[a-z0-9-]+$/),
  website: (schema) => schema.trim().optional(),
  type: (schema) => schema,
  isPilotWorkspace: (schema) => schema.optional(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
});

export const PublicWorkspaceSchema = WorkspaceSchema.pick({
  id: true,
  name: true,
  slug: true,
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type PublicWorkspace = z.infer<typeof PublicWorkspaceSchema>;
