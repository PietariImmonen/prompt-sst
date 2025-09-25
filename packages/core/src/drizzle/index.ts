import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

// In SST shell context, DATABASE_URL will be available as an env var
// In Lambda context, we'll use Resource.Database
const connectionString = process.env.DATABASE_URL || 
  `postgres://${Resource.Database.user}:${encodeURIComponent(Resource.Database.password)}@${Resource.Database.host}:${Resource.Database.port}/${Resource.Database.database}`;

const client = postgres(connectionString);

export const db = drizzle(client);
