import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createId } from "@paralleldrive/cuid2";

import { assertActor, useAccountID } from "@sst-replicache-template/core/actor";
import { Account } from "@sst-replicache-template/core/domain/account";
import { User } from "@sst-replicache-template/core/domain/user";
import { UserSettings } from "@sst-replicache-template/core/domain/user-settings";
import { Workspace } from "@sst-replicache-template/core/domain/workspace";
import { AccountSchema } from "@sst-replicache-template/core/models/Account";
import { UserSchema } from "@sst-replicache-template/core/models/User";
import { WorkspaceSchema } from "@sst-replicache-template/core/models/Workspace";

import { Result } from "./common";

export namespace AccountApi {
  export const route = new OpenAPIHono()
    .openapi(
      createRoute({
        method: "get",
        path: "/me",
        responses: {
          404: {
            content: {
              "application/json": {
                schema: z.object({ error: z.string() }),
              },
            },
            description: "User not found",
          },
          200: {
            content: {
              "application/json": {
                schema: Result(
                  AccountSchema.extend({ workspaces: z.array(WorkspaceSchema) }),
                ),
              },
            },
            description: "Returns account",
          },
        },
      }),
      async (c) => {
        const actor = assertActor("account");
        const result = await Account.fromID(useAccountID());

        if (!result) {
          return c.json({ error: "Account not found" }, 404);
        }

        return c.json(
          {
            result: {
              id: actor.properties.accountID,
              email: actor.properties.email,
              name: actor.properties.name,
              emailLanguage: result.emailLanguage,
              workspaces: await Account.workspaces(),
            },
          },
          200,
        );
      },
    )
    .openapi(
      createRoute({
        method: "post",
        path: "/complete-registration",
        request: {
          body: {
            content: {
              "application/json": {
                schema: z.object({
                  autoCapture: z.boolean().optional().default(true),
                }),
              },
            },
          },
        },
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    user: UserSchema,
                    workspace: WorkspaceSchema,
                  }),
                ),
              },
            },
            description: "Returns created user and workspace",
          },
        },
      }),
      async (c) => {
        const actor = assertActor("account");
        const { autoCapture } = c.req.valid("json");
        
        // Create a new workspace for the user
        const workspaceName = `${actor.properties.name}'s Workspace`;
        const workspaceSlug = `${actor.properties.name.toLowerCase().replace(/\s+/g, "-")}-${createId().slice(0, 6)}`;
        
        const workspaceResult = await Workspace.create({
          name: workspaceName,
          slug: workspaceSlug,
        });
        
        // Create a new user in the workspace
        const userID = await User.create({
          email: actor.properties.email,
          name: actor.properties.name,
          role: "admin",
          status: "active",
          first: true,
        });
        
        // Get the created user
        const userResult = await User.fromID(userID);
        
        // Create user settings with the autoCapture preference
        await UserSettings.create({
          userID: userID,
          fullSentences: true,
          language: actor.properties.emailLanguage || "en",
          inAppOnboardingCompleted: false,
        });
        
        return c.json(
          {
            result: {
              user: userResult,
              workspace: workspaceResult,
            },
          },
          200,
        );
      },
    );
}
