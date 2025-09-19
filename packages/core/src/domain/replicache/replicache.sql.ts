import {
  bigint,
  char,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
} from "drizzle-orm/pg-core";

import { Actor } from "../../actor";
import { id, timestamps } from "../../util/sql";

export const replicache_client_group = pgTable(
  "replicache_client_group",
  {
    ...timestamps,
    id: char("id", { length: 36 }).notNull(),
    actor: json("actor").$type<Actor>(),
    cvrVersion: integer("cvr_version").notNull(),
    clientVersion: integer("client_version").notNull(),
  },
  (table) => [primaryKey({ columns: [table.id] })],
);

export const replicache_client = pgTable(
  "replicache_client",
  {
    id: char("id", { length: 36 }).notNull().primaryKey(),
    mutationID: bigint("mutation_id", {
      mode: "number",
    })
      .default(0)
      .notNull(),
    ...timestamps,
    clientGroupID: char("client_group_id", { length: 36 }).notNull(),
    clientVersion: integer("client_version").notNull(),
  },
  (table) => [index("replicache_client_group_id").on(table.clientGroupID)],
);

export const replicache_cvr = pgTable(
  "replicache_cvr",
  {
    ...id,
    ...timestamps,
    data: json("data").$type<Record<string, number>>().notNull(),
    id: integer("id").notNull(),
    clientGroupID: char("client_group_id", { length: 36 }).notNull(),
    clientVersion: integer("client_version").notNull(),
  },
  (table) => [primaryKey({ columns: [table.clientGroupID, table.id] })],
);
