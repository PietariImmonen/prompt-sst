import { sql } from "drizzle-orm";
import { char, timestamp } from "drizzle-orm/pg-core";

export const cuid = (name: string) => char(name, { length: 24 });
export const id = {
  get id() {
    return cuid("id").primaryKey().notNull();
  },
};

export const workspaceID = {
  get id() {
    return cuid("id").notNull();
  },
  get workspaceID() {
    return cuid("workspace_id").notNull();
  },
};

export const timestamps = {
  timeCreated: timestamp("time_created", {
    mode: "string",
    withTimezone: true,
  })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  timeUpdated: timestamp("time_updated", {
    mode: "string",
    withTimezone: true,
  })
    .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`)
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  timeDeleted: timestamp("time_deleted", {
    mode: "string",
    withTimezone: true,
  }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function removeTimestamps<T extends { [key: string]: any }>(
  input: T,
): Omit<T, "timeCreated" | "timeDeleted" | "timeUpdated"> {
  const {
    timeCreated: _timeCreated,
    timeDeleted: _timeDeleted,
    timeUpdated: _timeUpdated,
    ...data
  } = input;

  return data as Omit<T, "timeCreated" | "timeDeleted" | "timeUpdated">;
}
