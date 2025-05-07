import { createId } from "@paralleldrive/cuid2";
import prompt from "prompt-sync";

import { ActorContext } from "@sst-replicache-template/core/actor";
import { Account } from "@sst-replicache-template/core/domain/account";

const question = prompt({ sigint: true });

const email = question("Enter account email: ");
if (!email) throw new Error("Account email is required");

const name = question("Enter account name: ");
if (!name) throw new Error("Account name is required");

// Check if account already exists
const existingAccount = await Account.fromEmail(email);
if (existingAccount) {
  console.log(
    `Account with email ${email} already exists with ID: ${existingAccount.id}`,
  );
  process.exit(0);
}

ActorContext.with(
  {
    type: "account",
    properties: {
      accountID: createId(),
      name: name,
      email: email,
    },
  },
  async () => {
    const accountID = await Account.create({
      email,
      name,
      emailLanguage: "fi",
    });
    console.log(`Account created with ID: ${accountID}`);
  },
);
