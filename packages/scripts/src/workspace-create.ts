/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ScryptHasher } from "@openauthjs/openauth/provider/password";
import { DynamoStorage } from "@openauthjs/openauth/storage/dynamo";
import { init } from "@paralleldrive/cuid2";
import { ActorContext } from "@prompt-saver/core/actor";
import { Account } from "@prompt-saver/core/domain/account";
import { User } from "@prompt-saver/core/domain/user";
import { UserSettings } from "@prompt-saver/core/domain/user-settings";
import { Workspace } from "@prompt-saver/core/domain/workspace";
import prompt from "prompt-sync";
import { Resource } from "sst/resource";

const question = prompt({ sigint: true });

export const createPassword = init({
  length: 16,
});

const workspaceName = question("Enter workspace name: ");
if (!workspaceName) throw new Error("Workspace name is required");

const slug = question("Enter workspace slug: ");
if (!slug) throw new Error("Workspace slug is required");

const email = question("Enter workspace admin email: ");
if (!email) throw new Error("Admin email is required");

const name = question("Enter workspace admin name: ");
if (!name) throw new Error("Admin name is required");

let account = await Account.fromEmail(email);
if (!account) {
  const accountID = await Account.create({
    email,
    name,
    emailLanguage: "fi",
  });
  account = await Account.fromID(accountID);
}

ActorContext.with(
  {
    type: "account",
    properties: {
      accountID: account!.id,
      name: account!.name,
      email: account!.email,
    },
  },
  async () => {
    const workspace = await Workspace.create({
      name: workspaceName,
      slug: slug,
      type: "organization",
      isPilotWorkspace: true,
    });

    ActorContext.with(
      {
        type: "system",
        properties: {
          workspaceID: workspace.id,
        },
      },
      async () => {
        const userID = await User.create({
          email: account!.email,
          name: account!.name,
          first: true,
          role: "admin",
          status: "active",
        });

        await Promise.all([
          UserSettings.create({
            fullSentences: false,
            language: "fi",
            userID,
            inAppOnboardingCompleted: false,
          }),
        ]);

        console.log(`Workspace named ${workspaceName} created`);
      },
    );
  },
);
