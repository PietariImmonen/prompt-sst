import {
  index,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { cuid, timestamps, workspaceID } from "../../util/sql";

export const tag = pgTable(
  "tag",
  {
    ...workspaceID,
    ...timestamps,
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    uniqueIndex("tag_workspace_slug").on(table.workspaceID, table.slug),
    index("tag_workspace_name").on(table.workspaceID, table.name),
  ],
);

export const promptTag = pgTable(
  "prompt_tag",
  {
    ...workspaceID,
    ...timestamps,
    promptID: cuid("prompt_id").notNull(),
    tagID: cuid("tag_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceID, table.id] }),
    uniqueIndex("prompt_tag_unique").on(
      table.workspaceID,
      table.promptID,
      table.tagID,
    ),
    index("prompt_tag_workspace_prompt").on(table.workspaceID, table.promptID),
    index("prompt_tag_workspace_tag").on(table.workspaceID, table.tagID),
  ],
);
