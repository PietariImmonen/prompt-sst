import { isPermanentStage } from "./config";
import { secret } from "./secret";

sst.Linkable.wrap(supabase.Project, function (_item) {
  return {
    properties: {
      user: "postgres",
      password: secret.SupabaseDatabasePassword.value,
      host: $interpolate`aws-0-eu-central-1.pooler.supabase.com`,
      port: 5432,
      database: "postgres",
    },
  };
});

export const database = isPermanentStage
  ? new supabase.Project("Database", {
      name: $interpolate`${$app.name}-${$app.stage}`,
      region: "eu-central-1",
      organizationId: process.env.SUPABASE_ORG_ID!,
      databasePassword: secret.SupabaseDatabasePassword.value,
    })
  : supabase.Project.get("Database", "jdwwiziehyecpbfgourc");

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
