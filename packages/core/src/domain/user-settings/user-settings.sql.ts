import { boolean, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";

import { cuid, timestamps, workspaceID } from "../../util/sql";

export const userSettings = pgTable(
  "user_settings",
  {
    ...workspaceID,
    ...timestamps,
    userID: cuid("user_id").notNull(),
    fullSentences: boolean("full_sentences").notNull().default(true),
    defaultTemplateID: cuid("default_template_id"),
    language: varchar("language", { length: 255 }).notNull(),
    inAppOnboardingCompleted: boolean("in_app_onboarding_completed")
      .notNull()
      .default(true),
  },
  (table) => [primaryKey({ columns: [table.workspaceID, table.id] })],
);
