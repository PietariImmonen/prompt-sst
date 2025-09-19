import { ScryptHasher } from "@openauthjs/openauth/provider/password";
import { DynamoStorage } from "@openauthjs/openauth/storage/dynamo";
import prompt from "prompt-sync";
import { Resource } from "sst/resource";

import { Account } from "@sst-replicache-template/core/domain/account";

const question = prompt({ sigint: true });

const email = question("Enter account email: ");
if (!email) throw new Error("Account email is required");

const name = question("Enter account name: ");
if (!name) throw new Error("Account name is required");

const password = question("Enter account password: ");
if (!password) throw new Error("Account password is required");

const storage = DynamoStorage({ table: Resource.AuthTable.name });

const hasher = ScryptHasher();

const hash = await hasher.hash(password);

await storage.set(["email", email, "password"], hash);

const account = await Account.fromEmail(email);
if (!account) {
  await Account.create({ email, name, emailLanguage: "fi" });
}

console.log("Account created");
