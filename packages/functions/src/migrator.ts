import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const handler = async () => {
  // Get database URL from environment (set by SST at build time, not runtime)
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Starting database migration...");
  console.log("Stage:", process.env.SST_STAGE);

  // Create migration-specific connection
  const migrationClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 30,
  });

  try {
    const db = drizzle(migrationClient);

    await migrate(db, {
      migrationsFolder: "./migrations",
    });

    console.log("Database migration completed successfully");
    return { success: true };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await migrationClient.end();
    console.log("Database connection closed");
  }
};
