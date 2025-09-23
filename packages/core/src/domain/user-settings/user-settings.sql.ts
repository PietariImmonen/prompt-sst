import { boolean, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";

import { cuid, timestamps, workspaceID } from "../../util/sql";

export const userSettings = pgTable(
  "user_settings",
  {
    ...workspaceID,
    ...timestamps,
    userID: cuid("user_id").notNull(),

    inAppOnboardingCompleted: boolean("in_app_onboarding_completed")
      .notNull()
      .default(true),
    shortcutCapture: varchar("shortcut_capture", { length: 255 })
      .notNull()
      .default("CmdOrCtrl+Shift+P"),
    shortcutPalette: varchar("shortcut_palette", { length: 255 })
      .notNull()
      .default("CmdOrCtrl+Shift+O"),
    enableAutoCapture: boolean("enable_auto_capture").notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.workspaceID, table.id] })],
);
