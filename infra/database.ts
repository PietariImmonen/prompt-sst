import { secret } from "./secret";

// Neon database configuration
// Each stage uses a separate Neon database endpoint configured via secrets
// The NeonDatabaseUrl secret should point to the correct database/branch per stage
export const database = new sst.Linkable("Database", {
  properties: {
    url: secret.NeonDatabaseUrl.value,
    apiKey: secret.NeonApiKey.value,
  },
});

const migrator = new sst.aws.Function("DatabaseMigrator", {
  handler: "packages/functions/src/migrator.handler",
  link: [database],
  copyFiles: [
    {
      from: "packages/core/migrations",
      to: "./migrations",
    },
  ],
  environment: {
    DATABASE_URL: secret.NeonDatabaseUrl.value,
  },
  timeout: "2 minutes",
  memory: "512 MB",
});

if (!$dev) {
  new aws.lambda.Invocation("DatabaseMigratorInvocation", {
    input: Date.now().toString(),
    functionName: migrator.name,
  });
}
export const outputs = {
  Database: database,
};
