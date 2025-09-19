import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import { cuid, timestamps, workspaceID } from "../../util/sql";

export const prompt = pgTable(
  "prompt",
  {
    ...workspaceID,
    ...timestamps,
    userID: cuid("user_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    source: varchar("source", {
      length: 32,
      enum: ["chatgpt", "claude", "gemini", "grok", "other"],
    })
      .notNull()
      .default("other"),
    categoryPath: varchar("category_path", { length: 255 }).notNull(),
    visibility: varchar("visibility", {
      length: 32,
      enum: ["private", "workspace"],
    })
      .notNull()
      .default("private"),
    isFavorite: boolean("is_favorite").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    index("prompt_workspace_time").on(table.workspaceID, table.timeCreated),
    index("prompt_workspace_category").on(
      table.workspaceID,
      table.categoryPath,
    ),
    index("prompt_workspace_user").on(table.workspaceID, table.userID),
  ],
);
