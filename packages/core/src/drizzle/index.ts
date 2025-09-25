import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

// Use Neon database URL with branch support
// The URL already includes all connection details and branch information
const connectionString = process.env.DATABASE_URL || Resource.Database.url;

const client = postgres(connectionString);

export const db = drizzle(client);
