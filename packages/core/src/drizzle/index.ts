import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

// Neon database connection
// The DATABASE_URL or Resource.Database.url should point to the correct Neon endpoint
const connectionString = process.env.DATABASE_URL || Resource.Database.url;

// Configure postgres client for serverless/Lambda environments
const client = postgres(connectionString);

export const db = drizzle(client);
