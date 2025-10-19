import type { Config } from "drizzle-kit";
import { Resource } from "sst";

// Use Neon database URL with branch support
const databaseUrl = Resource.Database.url;

console.log("🔗 NEON DATABASE URL:", databaseUrl);

export default {
  out: "./migrations/",
  schema: "./src/**/*.sql.ts",
  verbose: true,
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
