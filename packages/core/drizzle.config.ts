import type { Config } from "drizzle-kit";
import { Resource } from "sst";

const connection = {
  user: Resource.Database.user,
  password: Resource.Database.password,
  host: Resource.Database.host,
};

export default {
  out: "./migrations/",
  schema: "./src/**/*.sql.ts",
  verbose: true,
  dialect: "postgresql",
  dbCredentials: {
    url: `postgres://${connection.user}:${encodeURIComponent(connection.password)}@${connection.host}:5432/postgres`,
  },
} satisfies Config;
