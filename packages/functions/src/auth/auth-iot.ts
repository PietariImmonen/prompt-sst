import { createClient } from "@openauthjs/openauth/client";
import { eq } from "drizzle-orm";
import { Resource } from "sst";
import { realtime } from "sst/aws/realtime";

import { ActorContext, assertActor } from "@sst-replicache-template/core/actor";
import { user } from "@sst-replicache-template/core/domain/user/user.sql";
import { db } from "@sst-replicache-template/core/drizzle";
import dayjs from "@sst-replicache-template/core/lib/dayjs";
import { VisibleError } from "@sst-replicache-template/core/util/error";

import { subjects } from "./subjects";

const client = createClient({
  clientID: "auth-iot",
  issuer: Resource.Auth.url,
});

export const handler = realtime.authorizer(async (token) => {
  const prefix = `${Resource.App.name}/${Resource.App.stage}`;
  const result = await client.verify(subjects, token!);

  if (result.err)
    throw new VisibleError("input", "auth.invalid", "Invalid bearer token");

  const workspaces = [] as string[];

  await ActorContext.with(result.subject, async () => {
    const account = assertActor("account");

    const rows = await db
      .select({
        workspaceID: user.workspaceID,
      })
      .from(user)
      .where(eq(user.email, account.properties.email))
      .execute();

    await db
      .update(user)
      .set({
        timeSeen: dayjs().utc().format(),
      })
      .where(eq(user.email, account.properties.email))
      .execute();
    workspaces.push(...rows.map((r) => r.workspaceID));
  });

  return {
    publish: workspaces.map((workspaceID) => `${prefix}/${workspaceID}/*`),
    subscribe: workspaces.map((workspaceID) => `${prefix}/${workspaceID}/*`),
  };
});
