import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { timestamps, workspaceID } from "../../util/sql";

export const user = pgTable(
  "user",
  {
    ...workspaceID,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    first: boolean().notNull(),
    status: varchar("status", {
      length: 255,
      enum: ["active", "invited"],
    })
      .notNull()
      .default("active"),
    role: varchar("role", {
      length: 255,
      enum: ["admin", "member"],
    }).notNull(),
    timeSeen: timestamp("time_seen", {
      mode: "string",
      withTimezone: true,
    }),
    isOnboarded: boolean("is_onboarded").notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    index("user_name").on(table.name),
    uniqueIndex("user_email").on(table.workspaceID, table.email),
    index("user_email_global").on(table.email),
  ],
);
