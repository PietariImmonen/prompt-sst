import { createRoute, OpenAPIHono } from "@hono/zod-openapi";

import { assertActor } from "@sst-replicache-template/core/actor";
import { Prompt } from "@sst-replicache-template/core/domain/prompt";
import { PromptSchema } from "@sst-replicache-template/core/models/Prompt";

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
      },
    }),
    async (c) => {
      assertActor("user");
      const body = c.req.valid("json");
      const result = await Prompt.create(body);
      return c.json({ result }, 200);
    },
  );
}
