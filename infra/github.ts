import { isPermanentStage } from "./config";

if (isPermanentStage) {
  const github = new aws.iam.OpenIdConnectProvider("GithubProvider", {
    url: "https://token.actions.githubusercontent.com",
    clientIdLists: ["sts.amazonaws.com"],
  });
  const githubRole = new aws.iam.Role("GithubRole", {
    name: [$app.name, $app.stage, "github"].join("-"),
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Federated: github.arn,
          },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringLike: github.url.apply((url) => ({
              [`${url}:sub`]: "repo:PietariImmonen/prompt-sst:*",
            })),
          },
        },
      ],
    },
  });
  new aws.iam.RolePolicyAttachment("GithubRolePolicy", {
    policyArn: "arn:aws:iam::aws:policy/AdministratorAccess",
    role: githubRole.name,
  });
}
