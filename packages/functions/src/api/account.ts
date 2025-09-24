import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { assertActor, useAccountID } from "@prompt-saver/core/actor";
import { Account } from "@prompt-saver/core/domain/account";
import { AccountSchema } from "@prompt-saver/core/models/Account";
import { WorkspaceSchema } from "@prompt-saver/core/models/Workspace";

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
                  workspaces: z.array(WorkspaceSchema),
                }),
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
  );
}
