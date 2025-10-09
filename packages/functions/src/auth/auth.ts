import { issuer } from "@openauthjs/openauth";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";
import { createId } from "@paralleldrive/cuid2";
import { ActorContext } from "@prompt-saver/core/actor";
import { Account } from "@prompt-saver/core/domain/account";
import { User } from "@prompt-saver/core/domain/user";
import { UserSettings } from "@prompt-saver/core/domain/user-settings";
import { Workspace } from "@prompt-saver/core/domain/workspace";
import { appendSearchParams } from "@prompt-saver/core/lib/url";
import { handle } from "hono/aws-lambda";
import { Resource } from "sst/resource";
import { z } from "zod";

import { subjects } from "./subjects";

// Default language to use when we can't access the request
const DEFAULT_LANGUAGE = "en";

const app = issuer({
  subjects,
  allow: async (input) => {
    // Allow web, desktop, and chrome extension clients
    const allowedClients = ["web", "desktop", "chrome-extension"];
    if (!allowedClients.includes(input.clientID)) {
      return false;
    }
    return true;
  },
  providers: {
    google: GoogleProvider({
      clientID: Resource.GoogleClientID.value,
      clientSecret: Resource.GoogleClientSecret.value,
      scopes: ["openid", "email", "profile"],
    }),
  },
  success: async (ctx, value) => {
    const redirectNoAccount = () =>
      new Response("", {
        status: 302,
        headers: {
          Location: appendSearchParams({
            url: process.env.AUTH_APP_URL! + "/auth/login",
            searchParams: new URLSearchParams({
              error: "no_account",
              timestamp: new Date().getTime().toString(),
            }),
          }),
        },
      });

    if (value.provider === "google") {
      const access = value.tokenset.access;
      const response = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${access}`,
            Accept: "application/json",
          },
        },
      );

      const body = await response.json();
      const data = z
        .object({
          name: z.string(),
          email: z.string(),
          locale: z.string().optional(),
        })
        .safeParse(body);

      if (!data.success) {
        throw new Error("no_email_or_name");
      }

      const { email, name, locale } = data.data;
      const language = locale ? locale.split("-")[0] : DEFAULT_LANGUAGE;

      // Check if account already exists
      let account = await Account.fromEmail(email);

      // If no account exists, create account, workspace, and user
      if (!account) {
        try {
          console.log("Creating new account for email:", email);

          // Create account
          const accountID = await Account.create({
            email: email,
            name: name,
            emailLanguage: language,
          });

          // Get the created account
          account = await Account.fromID(accountID);
          console.log("Account created with ID:", accountID);

          // Create workspace
          const workspaceName = `${name}'s Workspace`;
          const workspaceSlug = `${name.toLowerCase().replace(/\s+/g, "-")}-${createId().slice(0, 6)}`;

          const workspaceResult = await Workspace.create({
            type: "organization",
            name: workspaceName,
            slug: workspaceSlug,
          });
          console.log("Workspace created with ID:", workspaceResult.id);

          // Create user in the workspace
          const userID = await ActorContext.with(
            {
              type: "system",
              properties: {
                workspaceID: workspaceResult.id,
              },
            },
            () =>
              User.create({
                email: email,
                name: name,
                role: "admin",
                status: "active",
                first: true,
                workspaceID: workspaceResult.id,
              }),
          );
          console.log("User created with ID:", userID);

          // Create user settings
          await UserSettings.create({
            userID: userID,
            workspaceID: workspaceResult.id,
            inAppOnboardingCompleted: false,
            shortcutCapture: "CmdOrCtrl+Shift+P",
            shortcutPalette: "CmdOrCtrl+Shift+O",
            enableAutoCapture: true,
          });
          console.log("User settings created for user:", userID);
        } catch (error: any) {
          // If we get a duplicate key error, it means another request created the account
          // Just fetch the existing account and continue
          if (
            error?.code === "23505" ||
            error?.constraint_name === "account_email"
          ) {
            console.log(
              "Account already exists (race condition), fetching existing account for:",
              email,
            );
            account = await Account.fromEmail(email);

            // Verify account was successfully fetched
            if (!account) {
              console.error("Failed to fetch account after race condition");
              throw new Error(
                "Account creation race condition - failed to fetch account",
              );
            }
            console.log("Successfully fetched existing account:", account.id);
          } else {
            // Log and re-throw other errors
            console.error("Error creating account/workspace/user:", error);
            throw error;
          }
        }
      } else {
        console.log("Account already exists for email:", email);
      }

      // Final verification that we have a valid account
      if (!account) {
        console.error("Account is null after creation/fetch logic");
        throw new Error("Failed to create or fetch account");
      }

      return ctx.subject("account", {
        accountID: account!.id,
        email: account!.email,
        name: account!.name,
      });
    }

    throw new Error("invalid_provider");
  },
});

export const handler = handle(app);
