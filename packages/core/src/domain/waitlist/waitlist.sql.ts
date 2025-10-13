import {
  index,
  jsonb,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "../../util/sql";

export const waitlist = pgTable(
  "waitlist",
  {
    ...id,
    ...timestamps,
    email: varchar("email", { length: 255 }).notNull(),
    source: varchar("source", { length: 50 }).notNull().default("website"),
    metadata: jsonb("metadata"),
  },
  (table) => [
    uniqueIndex("waitlist_email").on(table.email),
    index("waitlist_time_created").on(table.timeCreated),
  ],
);
