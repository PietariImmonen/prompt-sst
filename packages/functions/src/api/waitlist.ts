import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createId } from "@paralleldrive/cuid2";
import { waitlist } from "@prompt-saver/core/domain/waitlist/waitlist.sql";
import { db } from "@prompt-saver/core/drizzle";
import { eq } from "drizzle-orm";

import { Result } from "./common";

const WaitlistSubmitSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  source: z.string().optional().default("website"),
  metadata: z
    .object({
      userAgent: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      referrer: z.string().optional(),
      screenResolution: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),
    })
    .optional(),
});

export namespace WaitlistApi {
  export const route = new OpenAPIHono().openapi(
    createRoute({
      method: "post",
      path: "/submit",
      request: {
        body: {
          content: {
            "application/json": {
              schema: WaitlistSubmitSchema,
            },
          },
        },
      },
      responses: {
        409: {
          content: {
            "application/json": {
              schema: z.object({
                code: z.string(),
                message: z.string(),
              }),
            },
          },
          description: "Email already exists in waitlist",
        },
        201: {
          content: {
            "application/json": {
              schema: Result(
                z.object({
                  id: z.string(),
                  email: z.string(),
                  message: z.string(),
                }),
              ),
            },
          },
          description: "Successfully added to waitlist",
        },
      },
    }),
    async (c) => {
      const body = c.req.valid("json");

      // Check if email already exists
      const existing = await db
        .select()
        .from(waitlist)
        .where(eq(waitlist.email, body.email))
        .execute();

      if (existing && existing.length > 0) {
        return c.json(
          {
            code: "already_exists",
            message: "This email is already on the waitlist",
          },
          409,
        );
      }

      // Insert new waitlist entry
      const [inserted] = await db
        .insert(waitlist)
        .values({
          id: createId(),
          email: body.email,
          source: body.source,
          metadata: body.metadata || null,
        })
        .returning();

      return c.json(
        {
          result: {
            id: inserted!.id,
            email: inserted!.email,
            message: "Successfully added to waitlist!",
          },
        },
        201,
      );
    },
  );
}
