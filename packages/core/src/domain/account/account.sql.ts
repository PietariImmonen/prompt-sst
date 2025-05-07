import { index, pgTable, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { id, timestamps } from "../../util/sql";

export const account = pgTable(
  "account",
  {
    ...id,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    emailLanguage: varchar("email_language", { length: 255 })
      .notNull()
      .default("fi"),
  },
  (table) => [
    index("account_name").on(table.name),
    uniqueIndex("account_email").on(table.email),
  ],
);
