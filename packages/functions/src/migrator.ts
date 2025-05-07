import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "@sst-replicache-template/core/drizzle";

export const handler = async () => {
  await migrate(db, {
    migrationsFolder: "./migrations",
  });
};
