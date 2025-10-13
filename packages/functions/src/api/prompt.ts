import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { assertActor } from "@prompt-saver/core/actor";
import { Prompt } from "@prompt-saver/core/domain/prompt";
import { Replicache } from "@prompt-saver/core/domain/replicache";
import { PromptSchema } from "@prompt-saver/core/models/Prompt";

import { Result } from "./common";

const PromptCreateBody = PromptSchema.pick({
  id: true,
  title: true,
  content: true,
  source: true,
  categoryPath: true,
  visibility: true,
  isFavorite: true,
  metadata: true,
}).partial({
  id: true,
  source: true,
  categoryPath: true,
  visibility: true,
  isFavorite: true,
  metadata: true,
});

export namespace PromptApi {
  export const route = new OpenAPIHono().openapi(
    createRoute({
      method: "post",
      path: "/",
      request: {
        body: {
          content: {
            "application/json": {
              schema: PromptCreateBody.extend({
                title: PromptSchema.shape.title,
                content: PromptSchema.shape.content,
              }),
            },
          },
        },
      },
      responses: {
        200: {
          description: "Created prompt",
          content: {
            "application/json": {
              schema: Result(PromptSchema),
            },
          },
        },
        500: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: z.object({ error: z.string() }),
            },
          },
        },
      },
    }),
    async (c) => {
      try {
        const actor = assertActor("user");
        const body = c.req.valid("json");
        const result = await Prompt.create(body);
        console.log(actor.properties);
        await Replicache.poke({
          actor: "system",
          workspaceID: actor.properties.workspaceID,
        });
        // Parse result to ensure it matches the expected schema
        const validated = PromptSchema.parse(result);
        return c.json({ result: validated }, 200);
      } catch (error) {
        console.error(error);
        return c.json({ error: "Internal server error" }, 500);
      }
    },
  );
}
