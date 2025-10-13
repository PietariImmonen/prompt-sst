import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { waitlist } from "../domain/waitlist/waitlist.sql";

export const WaitlistSchema = createSelectSchema(waitlist, {
  id: (schema) => schema.cuid2(),
  email: (schema) => schema.email().trim().toLowerCase(),
  source: (schema) => schema,
  metadata: (schema) => schema.optional(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
});

export type Waitlist = z.infer<typeof WaitlistSchema>;
