import { secret } from "./secret";

// Neon database configuration with branch support
// Each stage gets its own branch for isolated development
const getBranchName = () => {
  const stage = $app.stage;
  // Use main branch for production, stage-specific branches for others
  return stage === "production" ? "main" : `branch-${stage}`;
};

// Create a linkable resource for the Neon database
export const database = new sst.Linkable("Database", {
  properties: {
    url: secret.NeonDatabaseUrl.value,
    apiKey: secret.NeonApiKey.value,
    branch: getBranchName(),
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
