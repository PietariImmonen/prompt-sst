import { db } from "@prompt-saver/core/drizzle";
import { migrate } from "drizzle-orm/postgres-js/migrator";

export const handler = async () => {
  await migrate(db, {
    migrationsFolder: "./migrations",
  });
};
