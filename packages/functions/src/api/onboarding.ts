import { OpenAPIHono } from "@hono/zod-openapi";
import {
  createRoleTags,
  isValidRole,
} from "@prompt-saver/core/domain/onboarding";

const route = new OpenAPIHono().post("/complete", async (c) => {
  try {
    const body = await c.req.json();
    const { role } = body;

    // Validate role
    if (!role || typeof role !== "string" || !isValidRole(role)) {
      return c.json(
        {
          error: "Invalid role",
          message: "Role is required and must be a valid role type",
        },
        400,
      );
    }

    // Create tags in batch using the core onboarding helper
    const createdTags = await createRoleTags(role);

    return c.json({
      success: true,
      tags: createdTags,
      count: createdTags.length,
    });
  } catch (error) {
    console.error("Onboarding completion error:", error);
    return c.json(
      {
        error: "Failed to complete onboarding",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export const OnboardingApi = {
  route,
};
