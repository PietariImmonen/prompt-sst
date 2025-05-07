import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { user } from "../domain/user/user.sql";

export const UserSchema = createSelectSchema(user, {
  id: (schema) => schema.cuid2(),
  name: (schema) => schema.min(1),
  email: (schema) => schema.trim().toLowerCase().min(1),
  workspaceID: (schema) => schema.cuid2(),
  status: (schema) => schema,
  first: (schema) => schema,
  role: (schema) => schema,
  isOnboarded: (schema) => schema,
  timeSeen: () => z.coerce.string().optional(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
