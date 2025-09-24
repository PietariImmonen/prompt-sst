import { createClient } from "@openauthjs/openauth/client";
import { ActorContext } from "@prompt-saver/core/actor";
import { User } from "@prompt-saver/core/domain/user";
import dayjs from "@prompt-saver/core/lib/dayjs";
import { VisibleError } from "@prompt-saver/core/util/error";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { Resource } from "sst/resource";

import { subjects } from "../auth/subjects";

const client = createClient({
  clientID: "api",
  issuer: Resource.Auth.url,
});

export const notPublic: MiddlewareHandler = async (_c, next) => {
  const actor = ActorContext.use();
  if (actor.type === "public")
    throw new HTTPException(401, { message: "Unauthorized" });
  return next();
};

export const auth: MiddlewareHandler = async (c, next) => {
  const authHeader =
    c.req.query("authorization") ?? c.req.header("authorization");
  if (authHeader) {
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      throw new VisibleError(
        "input",
        "auth.token",
        "Bearer token not found or improperly formatted",
      );
    }
    const bearerToken = match[1];
    const result = await client.verify(subjects, bearerToken!);
    if (result.err)
      throw new VisibleError("input", "auth.invalid", "Invalid bearer token");
    if (result.subject.type === "account") {
      const workspaceID = c.req.header("x-prompt-saver-workspace");

      if (!workspaceID) {
        return ActorContext.with(
          {
            type: "account",
            properties: {
              accountID: result.subject.properties.accountID,
              name: result.subject.properties.name,
              email: result.subject.properties.email,
            },
          },
          next,
        );
      }

      const email = result.subject.properties.email;
      return ActorContext.with(
        {
          type: "system",
          properties: {
            workspaceID,
          },
        },
        async () => {
          const user = await User.fromEmail(email);
          if (!user || user.timeDeleted) {
            c.status(401);
            return c.text("Unauthorized");
          }
          if (!user.timeSeen) {
            await User.update({ ...user, timeSeen: dayjs().utc().format() });
          }

          if (user.status === "invited") {
            await User.update({ ...user, status: "active" });
          }

          return ActorContext.with(
            {
              type: "user",
              properties: {
                userID: user.id,
                name: user.name,
                email: user.email,
                workspaceID: user.workspaceID,
              },
            },
            next,
          );
        },
      );
    }
  }

  return ActorContext.with({ type: "public", properties: {} }, next);
};
