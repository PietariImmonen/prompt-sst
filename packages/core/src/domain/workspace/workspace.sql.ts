import { boolean, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { id, timestamps } from "../../util/sql";

export const workspace = pgTable(
  "workspace",
  {
    ...id,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
    website: varchar("website", { length: 255 }),
    slug: varchar("slug", { length: 255 }).notNull(),
    isPilotWorkspace: boolean("is_pilot_workspace"),
    type: varchar("type", {
      length: 255,
      enum: ["individual", "organization"],
    })
      .notNull()
      .default("organization"),
  },
  (table) => [uniqueIndex("workspace_slug").on(table.slug)],
);
