import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { assertActor, useAccountID } from "@prompt-saver/core/actor";
import { Account } from "@prompt-saver/core/domain/account";
import { userSettings } from "@prompt-saver/core/domain/user-settings/user-settings.sql";
import { user } from "@prompt-saver/core/domain/user/user.sql";
import { db } from "@prompt-saver/core/drizzle";
import { AccountSchema } from "@prompt-saver/core/models/Account";
import { UserSettingsSchema } from "@prompt-saver/core/models/UserSettings";
import { WorkspaceSchema } from "@prompt-saver/core/models/Workspace";
import { and, eq } from "drizzle-orm";

import { Result } from "./common";

export namespace AccountApi {
  export const route = new OpenAPIHono().openapi(
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
                AccountSchema.extend({
                  workspaces: z.array(
                    WorkspaceSchema.extend({
                      userSettings: UserSettingsSchema.optional(),
                    }),
                  ),
                }),
              ),
            },
          },
          description: "Returns account with workspaces and user settings",
        },
      },
    }),
    async (c) => {
      const actor = assertActor("account");
      const result = await Account.fromID(useAccountID());

      if (!result) {
        return c.json({ error: "Account not found" }, 404);
      }

      const workspaces = await Account.workspaces();

      // Fetch user settings for each workspace
      const workspacesWithSettings = await Promise.all(
        workspaces.map(async (workspace) => {
          // Get the user for this workspace directly via SQL
          const users = await db
            .select()
            .from(user)
            .where(
              and(
                eq(user.email, actor.properties.email),
                eq(user.workspaceID, workspace.id),
              ),
            )
            .execute();

          if (!users || users.length === 0) {
            return { ...workspace, userSettings: undefined };
          }

          const userRecord = users[0];

          // Get user settings
          const settings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userID, userRecord.id))
            .execute();

          return {
            ...workspace,
            userSettings:
              settings && settings.length > 0 ? settings[0] : undefined,
          };
        }),
      );

      return c.json(
        {
          result: {
            id: actor.properties.accountID,
            email: actor.properties.email,
            name: actor.properties.name,
            emailLanguage: result.emailLanguage,
            workspaces: workspacesWithSettings,
          },
        },
        200,
      );
    },
  );
}
