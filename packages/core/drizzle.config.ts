import type { Config } from "drizzle-kit";
import { Resource } from "sst";

export default {
  out: "./migrations/",
  schema: "./src/**/*.sql.ts",
  verbose: true,
  dialect: "postgresql",
  dbCredentials: {
    url: `postgres://${Resource.Database.user}:${encodeURIComponent(
      Resource.Database.password,
    )}@${Resource.Database.host}:${Resource.Database.port}/${Resource.Database.database}`,
  },
} satisfies Config;
