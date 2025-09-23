import { issuer } from "@openauthjs/openauth";
import { GoogleProvider } from "@openauthjs/openauth/provider/google";
import { Account } from "@sst-replicache-template/core/domain/account";
import { User } from "@sst-replicache-template/core/domain/user";
import { Workspace } from "@sst-replicache-template/core/domain/workspace";
import { appendSearchParams } from "@sst-replicache-template/core/lib/url";
import { handle } from "hono/aws-lambda";
import { Resource } from "sst/resource";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { ActorContext } from "@sst-replicache-template/core/actor";

import { subjects } from "./subjects";

// Default language to use when we can't access the request
const DEFAULT_LANGUAGE = "en";

const app = issuer({
  subjects,
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
        // Create account
        const accountID = await Account.create({
          email: email,
          name: name,
          emailLanguage: language,
        });
        
        // Get the created account
        account = await Account.fromID(accountID);
        
        // Create workspace
        const workspaceName = `${name}'s Workspace`;
        const workspaceSlug = `${name.toLowerCase().replace(/\s+/g, "-")}-${createId().slice(0, 6)}`;
        
        const workspaceResult = await Workspace.create({
          type: "organization",
          name: workspaceName,
          slug: workspaceSlug,
        });
        
        // Create user in the workspace
        const userID = await ActorContext.with(
          {
            type: "system",
            properties: {
              workspaceID: workspaceResult.id,
            },
          },
          () => User.create({
            email: email,
            name: name,
            role: "admin",
            status: "active",
            first: true,
            workspaceID: workspaceResult.id,
          })
        );
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
