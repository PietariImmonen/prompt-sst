import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst/resource";

const client = postgres({
  password: Resource.Database.password,
  user: Resource.Database.user,
  port: Resource.Database.port,
  host: Resource.Database.host,
  db: "postgres",
});

export const db = drizzle(client);
