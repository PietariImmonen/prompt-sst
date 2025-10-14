import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { assertActor } from "@prompt-saver/core/actor";
import { LLM } from "@prompt-saver/core/domain/llm";
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

const ImproveTextBody = z.object({
  text: z.string().min(1).max(10000),
});

export namespace PromptApi {
  export const route = new OpenAPIHono()
    .openapi(
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
    )
    .openapi(
      createRoute({
        method: "post",
        path: "/improve-from-transcription",
        request: {
          body: {
            content: {
              "application/json": {
                schema: ImproveTextBody,
              },
            },
          },
        },
        responses: {
          200: {
            description: "Improved text response",
            content: {
              "application/json": {
                schema: z.object({
                  improvedText: z.string(),
                  promptID: z.string(),
                }),
              },
            },
          },
          400: {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: z.object({ error: z.string() }),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (c: any) => {
        try {
          const actor = assertActor("user");
          const body = c.req.valid("json");

          console.log(
            `[Improve] Starting improvement for ${body.text.length} characters`,
          );

          const improvement = await LLM.improveText({ text: body.text });
          const processor = improvement.processor;

          console.log(
            `[Improve] Classified transcription intent as ${improvement.intent}`,
          );

          const improvedText = improvement.text;

          const titlePrefix =
            improvement.intent === "compose_email"
              ? "Email draft"
              : improvement.intent === "refine_prompt"
                ? "Prompt draft"
                : "Improved text";

          const promptTitle =
            `${titlePrefix}: ${improvedText.substring(0, 80).trim()}`.slice(
              0,
              100,
            );

          const metadata: Record<string, string | number> = {
            transcriptionIntent: improvement.intent,
            transcriptionIntentLabel: processor.label,
          };

          if (improvement.confidence !== undefined) {
            metadata.transcriptionConfidence = improvement.confidence;
          }

          if (
            typeof improvement.rationale === "string" &&
            improvement.rationale.length > 0
          ) {
            metadata.transcriptionRationale = improvement.rationale;
          }

          // Create prompt with improved text
          const result = await Prompt.create({
            title: promptTitle || "Improved Prompt",
            content: improvedText,
            source: "transcription_improved",
            categoryPath: "/",
            visibility: "private",
            metadata,
          });

          // Poke Replicache to sync
          await Replicache.poke({
            actor: "system",
            workspaceID: actor.properties.workspaceID,
          });

          console.log(
            `[Improve] Created prompt ${result.id} with ${improvedText.length} characters`,
          );

          return c.json({
            improvedText,
            promptID: result.id,
            intent: improvement.intent,
            confidence: improvement.confidence,
            rationale: improvement.rationale,
            intentLabel: processor.label,
            intentDescription: processor.description,
          });
        } catch (error) {
          console.error(error);
          return c.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Internal server error",
            },
            500,
          );
        }
      },
    );
}
