import { gzipSync } from "zlib";
import { ActorContext, useWorkspaceID } from "@prompt-saver/core/actor";
import { prompt } from "@prompt-saver/core/domain/prompt/prompt.sql";
import { Replicache } from "@prompt-saver/core/domain/replicache";
import {
  replicache_client,
  replicache_client_group,
  replicache_cvr,
} from "@prompt-saver/core/domain/replicache/replicache.sql";
import { userSettings } from "@prompt-saver/core/domain/user-settings/user-settings.sql";
import { user } from "@prompt-saver/core/domain/user/user.sql";
import { workspace } from "@prompt-saver/core/domain/workspace/workspace.sql";
import { db } from "@prompt-saver/core/drizzle";
import { VisibleError } from "@prompt-saver/core/util/error";
import { createTransaction } from "@prompt-saver/core/util/transaction";
import { and, eq, gt, inArray, isNull, lt, SQL, sql } from "drizzle-orm";
import { Hono } from "hono";
import { chunk, isDeepEqual, mapValues, omit } from "remeda";
import type {
  PatchOperation,
  PullRequest,
  PullResponseV1,
  PushRequest,
} from "replicache";

import { server } from "../replicache/server";
import { notPublic } from "./auth";

export namespace ReplicacheApi {
  export const TABLES = {
    workspace,
    user,
    userSettings,
    prompt,
  };

  export const JOIN_TABLES = {};

  // const TABLE_PROJECTION = {
  //   stripe: (input: typeof stripeTable.$inferSelect) => Stripe.serialize(input),
  // } as {
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   [key in TableName]?: (input: (typeof TABLES)[key]["$inferSelect"]) => any;
  // };

  export const route = new Hono()
    .use(notPublic)
    .post("/pull", async (c) => {
      const actor = ActorContext.use();
      function log(...args: unknown[]) {
        if (process.env.SST_DEV) return;
        console.log(...args);
      }
      log("actor", actor);

      const req: PullRequest = await c.req.json();
      log("request", req);

      if (req.pullVersion !== 1) {
        return c.json({}, 307, { location: "/sync/pull" });
      }

      await db
        .insert(replicache_client_group)
        .values({
          id: req.clientGroupID,
          cvrVersion: 0,
          actor,
          clientVersion: 0,
        })
        .onConflictDoNothing();

      const resp = await createTransaction(
        async (tx): Promise<PullResponseV1 | undefined> => {
          const patch: PatchOperation[] = [];

          const group = await tx
            .select({
              id: replicache_client_group.id,
              cvrVersion: replicache_client_group.cvrVersion,
              clientVersion: replicache_client_group.clientVersion,
              actor: replicache_client_group.actor,
            })
            .from(replicache_client_group)
            .for("update")
            .where(and(eq(replicache_client_group.id, req.clientGroupID)))
            .execute()
            .then((rows) => rows.at(0)!);

          // omit name such that we are able to update the user without causing error state
          if (
            !isDeepEqual(
              group.actor?.properties
                ? omit(group.actor?.properties, ["name" as never])
                : undefined,
              omit(actor.properties, ["name" as never]),
            )
          ) {
            console.log("compare failed", group.actor, actor);
            return;
          }

          const oldCvr = await tx
            .select({
              data: replicache_cvr.data,
              clientVersion: replicache_cvr.clientVersion,
            })
            .from(replicache_cvr)
            .where(
              and(
                eq(replicache_cvr.clientGroupID, req.clientGroupID),
                eq(replicache_cvr.id, req.cookie as number),
              ),
            )
            .execute()
            .then((rows) => rows.at(0));
          const cvr = oldCvr ?? {
            data: {},
            clientVersion: 0,
          };

          const toPut: Record<string, { id: string; key: string }[]> = {};
          const nextCvr = {
            data: {} as Record<string, number>,
            version: Math.max(req.cookie as number, group.cvrVersion) + 1,
          };

          if (!oldCvr) {
            patch.push({
              op: "clear",
            });
            patch.push({
              op: "put",
              key: "/init",
              value: true,
            });
          }

          const results: [
            string,
            { id: string; version: string; key: string }[],
          ][] = [];

          if (actor.type === "user") {
            log("syncing user");

            const workspaceID = useWorkspaceID();

            for (const [name, table] of Object.entries(TABLES)) {
              const query = tx
                .select({
                  name: sql`${name}`,
                  id: table.id,
                  version: table.timeUpdated,
                  key: sql`'/' || COALESCE(${name}, '') || '/' || COALESCE(${table.id}::text, '') AS concatenated_result` as SQL<string>,
                })
                .from(table)
                .where(
                  and(
                    eq(
                      "workspaceID" in table ? table.workspaceID : table.id,
                      workspaceID,
                    ),
                    isNull(table.timeDeleted),
                  ),
                );
              log("getting updated from", name);
              const rows = await query.execute();
              results.push([name, rows]);
            }

            // for (const [name, { table, join }] of Object.entries(JOIN_TABLES)) {
            //   const query = tx
            //     .select({
            //       name: sql`${name}`,
            //       id: table.id,
            //       version: table.timeUpdated,
            //       key: sql`'/' || COALESCE(${name}, '') || '/' || COALESCE(${table.id}::text, '') AS concatenated_result` as SQL<string>,
            //     })
            //     .from(table)
            //     .innerJoin(
            //       join,
            //       "customerID" in join
            //         ? eq(table.id, join.customerID)
            //         : eq(table.id, join.petID),
            //     )
            //     .where(
            //       and(
            //         eq(join.workspaceID, workspaceID),
            //         isNull(table.timeDeleted),
            //       ),
            //     );
            //   log("getting updated from", name);
            //   const rows = await query.execute();
            //   results.push([name, rows]);
            // }
          }

          for (const [name, rows] of results) {
            const arr = [];
            for (const row of rows) {
              const version = new Date(row.version).getTime();
              if (cvr.data[row.key] !== version) {
                arr.push(row);
              }
              delete cvr.data[row.key];
              nextCvr.data[row.key] = version;
            }
            toPut[name] = arr;
          }

          log(
            "toPut",
            mapValues(toPut, (value) => value.length),
          );

          log("toDel", cvr.data);

          // new data
          for (const [name, items] of Object.entries(toPut)) {
            log(name);
            const ids = items.map((item) => item.id);
            const keys = Object.fromEntries(
              items.map((item) => [item.id, item.key]),
            );

            if (!ids.length) continue;
            const table =
              TABLES[name as keyof typeof TABLES] ??
              JOIN_TABLES[name as keyof typeof JOIN_TABLES]["table"];

            for (const group of chunk(ids, 1000)) {
              log(name, "fetching", group.length);
              const rows = await tx
                .select()
                .from(table)
                .where(
                  and(
                    "workspaceID" in table && actor.type === "user"
                      ? eq(table.workspaceID, useWorkspaceID())
                      : undefined,
                    inArray(table.id, group),
                  ),
                )
                .execute();
              console.log(name, "got", rows.length);

              // const projection =
              //   TABLE_PROJECTION[name as keyof typeof TABLE_PROJECTION];
              for (const row of rows) {
                const key = keys[row.id]!;
                patch.push({
                  op: "put",
                  key,
                  // value: projection ? projection(row as any) : row,
                  value: row,
                });
              }
            }
          }

          // remove deleted data
          for (const [key] of Object.entries(cvr.data)) {
            patch.push({
              op: "del",
              key,
            });
          }

          const clients = await tx
            .select({
              id: replicache_client.id,
              mutationID: replicache_client.mutationID,
              clientVersion: replicache_client.clientVersion,
            })
            .from(replicache_client)
            .where(
              and(
                eq(replicache_client.clientGroupID, req.clientGroupID),
                gt(replicache_client.clientVersion, cvr.clientVersion),
              ),
            )
            .execute();

          const lastMutationIDChanges = Object.fromEntries(
            clients.map((c) => [c.id, c.mutationID] as const),
          );
          if (
            patch.length > 0 ||
            Object.keys(lastMutationIDChanges).length > 0
          ) {
            log("inserting", req.clientGroupID);
            await tx
              .update(replicache_client_group)
              .set({
                cvrVersion: nextCvr.version,
              })
              .where(eq(replicache_client_group.id, req.clientGroupID))
              .execute();

            await tx
              .insert(replicache_cvr)
              .values({
                id: nextCvr.version,
                data: nextCvr.data,
                clientGroupID: req.clientGroupID,
                clientVersion: group.clientVersion,
              })
              .onConflictDoUpdate({
                target: [replicache_cvr.id, replicache_cvr.clientGroupID],
                set: {
                  data: nextCvr.data,
                },
              })
              .execute();

            await tx
              .delete(replicache_cvr)
              .where(
                and(
                  eq(replicache_cvr.clientGroupID, req.clientGroupID),
                  lt(replicache_cvr.id, nextCvr.version - 10),
                ),
              );

            return {
              patch,
              cookie: nextCvr.version,
              lastMutationIDChanges,
            };
          }

          return {
            patch: [],
            cookie: req.cookie,
            lastMutationIDChanges,
          };
        },
      );

      const isGzip = c.req.header("accept-encoding")?.includes("gzip");

      if (isGzip && resp) {
        const gzippedBody = gzipSync(JSON.stringify(resp));

        const gzippedBodyArrayBuffer = gzippedBody.buffer.slice(
          gzippedBody.byteOffset,
          gzippedBody.byteOffset + gzippedBody.byteLength,
        ) as ArrayBuffer;

        c.header("content-type", "application/json");
        c.header("content-encoding", "gzip");

        return c.body(gzippedBodyArrayBuffer, 200);
      }

      return c.json(resp, 200);
    })
    .post("/push", async (c) => {
      const actor = ActorContext.use();

      const body: PushRequest = await c.req.json();
      if (body.pushVersion !== 1)
        return c.json({}, 307, { location: "/sync/push" });

      for (const mutation of body.mutations) {
        await createTransaction(async (tx) => {
          const group = await tx
            .select({
              id: replicache_client_group.id,
              cvrVersion: replicache_client_group.cvrVersion,
              clientVersion: replicache_client_group.clientVersion,
              actor: replicache_client_group.actor,
            })
            .from(replicache_client_group)
            .for("update")
            .where(and(eq(replicache_client_group.id, body.clientGroupID)))
            .execute()
            .then(
              (rows) =>
                rows.at(0) ?? {
                  id: body.clientGroupID,
                  actor: actor,
                  cvrVersion: 0,
                  clientVersion: 0,
                },
            );

          const client = await tx
            .select({
              id: replicache_client.id,
              clientGroupID: replicache_client.clientGroupID,
              mutationID: replicache_client.mutationID,
              clientVersion: replicache_client.clientVersion,
            })
            .from(replicache_client)
            .for("update")
            .where(and(eq(replicache_client.id, mutation.clientID)))
            .execute()
            .then(
              (rows) =>
                rows.at(0) || {
                  id: body.clientGroupID,
                  clientGroupID: body.clientGroupID,
                  mutationID: 0,
                  clientVersion: 0,
                },
            );

          const nextClientVersion = group.clientVersion + 1;
          const nextMutationID = client.mutationID + 1;

          if (mutation.id < nextMutationID) {
            console.log(
              `Mutation ${mutation.id} has already been processed - skipping`,
            );
            return c.json(200);
          }

          if (mutation.id > nextMutationID) {
            throw new Error(
              `Mutation ${mutation.id} is from the future - aborting`,
            );
          }

          const { args, name } = mutation;
          console.log("processing", mutation.id, name);
          try {
            await server.execute(name, args);
          } catch (ex) {
            if (!(ex instanceof VisibleError)) console.error(ex);
          }
          console.log("done processing", mutation.id, name);

          await tx
            .insert(replicache_client_group)
            .values({
              id: body.clientGroupID,
              clientVersion: nextClientVersion,
              cvrVersion: group.cvrVersion,
              actor,
            })
            .onConflictDoUpdate({
              target: [replicache_client_group.id],
              set: {
                cvrVersion: group.cvrVersion,
                clientVersion: nextClientVersion,
              },
            })
            .execute();

          await tx
            .insert(replicache_client)
            .values({
              id: mutation.clientID,
              clientGroupID: group.id,
              mutationID: nextMutationID,
              clientVersion: nextClientVersion,
            })
            .onConflictDoUpdate({
              target: [replicache_client.id],
              set: {
                clientGroupID: group.id,
                mutationID: nextMutationID,
                clientVersion: nextClientVersion,
              },
            })
            .execute();
        });
      }

      if (actor.type === "user")
        await Replicache.poke({
          actor: actor.properties.email,
          workspaceID: actor.properties.workspaceID,
        });

      return c.json({}, 200);
    });
}
