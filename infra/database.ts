import { isPermanentStage } from "./config";
import { secret } from "./secret";

sst.Linkable.wrap(supabase.Project, function (item) {
  return {
    properties: {
      user: $interpolate`postgres.${item.id}`,
      password: secret.SupabaseDBPassword.value,
      host: $interpolate`aws-0-${item.region}.pooler.supabase.com`,
      port: 5432,
      database: "postgres",
    },
  };
});

export const database = isPermanentStage
  ? new supabase.Project("Database", {
      name: $interpolate`${$app.name}-${$app.stage}`,
      region: "eu-north-1",
      organizationId: process.env.SUPABASE_ORG_ID!,
      databasePassword: secret.SupabaseDBPassword.value,
    })
  : supabase.Project.get("Database", process.env.SUPABASE_PROJECT_ID!); // REMEMBER: this is gotten from Supabase

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
