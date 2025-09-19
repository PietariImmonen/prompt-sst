import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { bus } from "sst/aws/bus";
import { Resource } from "sst/resource";
import { z } from "zod";

import { ActorContext, useWorkspaceID } from "../../actor";
import { db } from "../../drizzle";
import { defineEvent } from "../../event";
import { UserSchema } from "../../models/User";
import { removeTimestamps } from "../../util/sql";
import {
  createTransactionEffect,
  useTransaction,
} from "../../util/transaction";
import { zod } from "../../util/zod";
import { user } from "./user.sql";

export namespace User {
  export const Events = {
    UserCreated: defineEvent(
      "user.created",
      z.object({
        userID: z.string().cuid2(),
      }),
    ),
  };

  export function list() {
    return useTransaction((tx) =>
      tx
        .select()
        .from(user)
        .where(eq(user.workspaceID, useWorkspaceID()))
        .execute(),
    );
  }

  export function listAll() {
    return useTransaction((tx) => tx.select().from(user).execute());
  }

  export const create = zod(
    UserSchema.pick({
      email: true,
      id: true,
      name: true,
      role: true,
      status: true,
    })
      .partial({
        id: true,
        role: true,
      })
      .extend({
        first: z.boolean().optional(),
      }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id ?? createId();
        await tx
          .insert(user)
          .values({
            id,
            email: input.email,
            name: input.name,
            role: input.role ?? "member",
            workspaceID: useWorkspaceID(),
            first: input.first ?? false,
            timeSeen: null,
            isOnboarded: false,
          })
          .onConflictDoUpdate({
            target: [user.workspaceID, user.email],
            set: {
              timeDeleted: null,
              status: input.status,
            },
          })
          .execute();

        const actor = ActorContext.use();

        // system actor is used, when user is created together with a workspace
        if (actor.type !== "system") {
          await createTransactionEffect(() =>
            bus.publish(Resource.Bus, Events.UserCreated, { userID: id }),
          );
        }

        return id;
      }),
  );

  export const remove = zod(UserSchema.shape.id, (input) =>
    useTransaction(async (tx) => {
      await tx
        .update(user)
        .set({
          timeDeleted: sql`CURRENT_TIMESTAMP`,
        })
        .where(and(eq(user.id, input), eq(user.workspaceID, useWorkspaceID())))
        .execute();
      return input;
    }),
  );

  export const removeCompletely = zod(UserSchema.shape.id, (input) =>
    useTransaction(async (tx) => {
      await tx.delete(user).where(eq(user.id, input)).execute();
      return input;
    }),
  );

  export const update = zod(UserSchema, (input) =>
    useTransaction(async (tx) => {
      await tx
        .update(user)
        .set({
          ...removeTimestamps(input),
        })
        .where(eq(user.id, input.id))
        .execute();
    }),
  );

  export const fromID = zod(UserSchema.shape.id, async (id) =>
    db.transaction(async (tx) => {
      return tx
        .select()
        .from(user)
        .where(and(eq(user.id, id), eq(user.workspaceID, useWorkspaceID())))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export const fromEmail = zod(UserSchema.shape.email, async (email) =>
    db.transaction(async (tx) => {
      return tx
        .select()
        .from(user)
        .where(
          and(eq(user.email, email), eq(user.workspaceID, useWorkspaceID())),
        )
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export const fromPublicEmail = zod(UserSchema.shape.email, async (email) =>
    db.transaction(async (tx) => {
      return tx
        .select()
        .from(user)
        .where(eq(user.email, email))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );
}
