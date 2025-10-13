import { OpenAPIHono } from "@hono/zod-openapi";
import { VisibleError } from "@prompt-saver/core/util/error";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { ZodError } from "zod";

import { AccountApi } from "./account";
import { auth } from "./auth";
import { OnboardingApi } from "./onboarding";
import { PromptApi } from "./prompt";
import { ReplicacheApi } from "./replicache";
import { WaitlistApi } from "./waitlist";
import { WorkspaceApi } from "./workspace";

const app = new OpenAPIHono();

app
  .use(logger())
  .use(async (c, next) => {
    c.header("Cache-Control", "no-store");
    return next();
  })
  // Register public routes before auth middleware
  .route("/waitlist", WaitlistApi.route)
  .use(auth)
  .onError((error, c) => {
    if (error instanceof VisibleError) {
      return c.json(
        {
          code: error.code,
          message: error.message,
        },
        400,
      );
    }
    if (error instanceof HTTPException) {
      return c.json(
        {
          message: error.message,
        },
        error.status,
      );
    }
    console.error(error);
    if (error instanceof ZodError) {
      const e = error.errors[0];
      if (e) {
        return c.json(
          {
            code: e?.code,
            message: e?.message,
          },
          400,
        );
      }
    }
    return c.json(
      {
        code: "internal",
        message: "Internal server error",
      },
      500,
    );
  });
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
  type: "http",
  scheme: "bearer",
});

const routes = app
  .route("/account", AccountApi.route)
  .route("/sync", ReplicacheApi.route)
  .route("/prompt", PromptApi.route)
  .route("/workspace", WorkspaceApi.route)
  .route("/onboarding", OnboardingApi.route)
  .onError((error, c) => {
    if (error instanceof VisibleError) {
      return c.json(
        {
          code: error.code,
          message: error.message,
        },
        error.kind === "input" ? 400 : 401,
      );
    }
    console.error(error);
    if (error instanceof ZodError) {
      const e = error.errors[0];
      if (e) {
        return c.json(
          {
            code: e?.code,
            message: e?.message,
          },
          400,
        );
      }
    }
    return c.json(
      {
        code: "internal",
        message: "Internal server error",
      },
      500,
    );
  });

app.doc("/doc", () => ({
  openapi: "3.0.0",
  info: {
    title: "prompt-saver API",
    version: "0.0.1",
  },
}));

export type Routes = typeof routes;
export const handler = handle(app);
