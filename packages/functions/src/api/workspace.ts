import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { ActorContext, assertActor } from "@prompt-saver/core/actor";
import { User } from "@prompt-saver/core/domain/user";
import { UserSettings } from "@prompt-saver/core/domain/user-settings";
import {
  Workspace,
  WorkspaceExistsError,
} from "@prompt-saver/core/domain/workspace";
import { WorkspaceSchema } from "@prompt-saver/core/models/Workspace";

import { Result } from "./common";

export namespace WorkspaceApi {
  export const route = new OpenAPIHono().openapi(
    createRoute({
      method: "post",
      path: "/",
      request: {
        body: {
          content: {
            "application/json": {
              schema: Workspace.create.schema.pick({
                name: true,
                type: true,
              }),
            },
          },
        },
      },
      responses: {
        400: {
          content: {
            "application/json": {
              schema: z.object({ error: z.string() }),
            },
          },
          description: "Bad input",
        },
        500: {
          content: {
            "application/json": {
              schema: z.object({ error: z.string() }),
            },
          },
          description: "Unknown error",
        },
        200: {
          content: {
            "application/json": {
              schema: Result(WorkspaceSchema),
            },
          },
          description: "Returns created workspace",
        },
      },
    }),
    async (c) => {
      const actor = assertActor("account");
      const body = c.req.valid("json");

      const slug = body.name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/[-\s]+/g, "-")
        .replace(/^-+|-+$/g, "");

      try {
        // TODO: handle errors with duplicate
        const workspace = await Workspace.create({
          ...body,
          slug,
          isPilotWorkspace: false,
        });

        await ActorContext.with(
          {
            type: "system",
            properties: {
              workspaceID: workspace?.id,
            },
          },
          async () => {
            const userID = await User.create({
              email: actor.properties.email,
              name: actor.properties.name,
              first: true,
              role: "admin",
              status: "active",
            });

            await Promise.all([
              UserSettings.create({
                userID,
                inAppOnboardingCompleted: false,
              }),
            ]);
          },
        );

        return c.json(
          {
            result: workspace,
          },
          200,
        );
      } catch (error) {
        if (error instanceof WorkspaceExistsError) {
          return c.json(
            {
              error: "Workspace with given slug already exists.",
            },
            400,
          );
        }

        return c.json(
          {
            error: "Unknown error",
          },
          500,
        );
      }
    },
  );
}
