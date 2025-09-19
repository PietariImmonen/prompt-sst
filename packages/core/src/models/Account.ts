import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { account } from "../domain/account/account.sql";

export const AccountSchema = createSelectSchema(account, {
  id: (schema) => schema.cuid2(),
  name: (schema) => schema.min(1),
  email: (schema) => schema.trim().toLowerCase().min(1),
  emailLanguage: (schema) => schema.default("fi"),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
});

export type Account = z.infer<typeof AccountSchema>;
