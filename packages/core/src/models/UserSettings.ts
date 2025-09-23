import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { userSettings } from "../domain/user-settings/user-settings.sql";

export const UserSettingsSchema = createSelectSchema(userSettings, {
  id: (schema) => schema.cuid2(),
  workspaceID: (schema) => schema.cuid2(),
  userID: (schema) => schema.cuid2(),
  timeCreated: () => z.coerce.string().optional(),
  timeUpdated: () => z.coerce.string().optional(),
  timeDeleted: () => z.coerce.string().optional(),
  inAppOnboardingCompleted: (schema) => schema,
  shortcutCapture: (schema) => schema,
  shortcutPalette: (schema) => schema,
  enableAutoCapture: (schema) => schema,
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
