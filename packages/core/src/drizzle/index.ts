import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

const client = postgres({
  user: Resource.Database.user,
  password: Resource.Database.password,
  host: Resource.Database.host,
  port: Resource.Database.port,
  db: Resource.Database.database, // 👈 no hardcoding
});

export const db = drizzle(client);
