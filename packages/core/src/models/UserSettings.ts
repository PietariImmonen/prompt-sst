import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { userSettings } from "../domain/user-settings/user-settings.sql";

export const UserSettingsSchema = createSelectSchema(userSettings, {
  id: (schema) => schema.cuid2(),
  workspaceID: (schema) => schema.cuid2(),
  fullSentences: (schema) => schema,
  language: (schema) => schema,
  userID: (schema) => schema.cuid2(),
  defaultTemplateID: (schema) => schema.cuid2().optional(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
  inAppOnboardingCompleted: (schema) => schema,
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
