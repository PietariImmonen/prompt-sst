import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActor } from "../../actor";
import { defineEvent } from "../../event";
import { WorkspaceSchema, type PublicWorkspace } from "../../models/Workspace";
import { VisibleError } from "../../util/error";
import { removeTimestamps } from "../../util/sql";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { user } from "../user/user.sql";
import { workspace } from "./workspace.sql";

export class WorkspaceExistsError extends VisibleError {
  constructor(slug: string) {
    super(
      "input",
      "workspace.slug_exists",
      `there is already a workspace named "${slug}"`,
    );
  }
}

export namespace Workspace {
  export const Events = {
    Created: defineEvent(
      "workspace.created",
      z.object({
        workspaceID: z.string().min(1),
      }),
    ),
  };

  export const create = zod(
    WorkspaceSchema.pick({
      name: true,
      slug: true,
      id: true,
      isPilotWorkspace: true,
      type: true,
    }).partial({
      id: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id ?? createId();
        const result = await tx
          .insert(workspace)
          .values({
            ...input,
            id,
          })
          .onConflictDoNothing()
          .returning();
        if (!result.find((r) => r.id === id))
          throw new WorkspaceExistsError(input.slug);
        return result.shift()!;
      }),
  );

  export const update = zod(WorkspaceSchema, (input) =>
    useTransaction(async (tx) => {
      await tx
        .update(workspace)
        .set({
          ...removeTimestamps(input),
        })
        .where(eq(workspace.id, input.id))
        .execute();
    }),
  );

  export const list = zod(z.void(), () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(workspace)
        .execute()
        .then((rows) => rows),
    ),
  );

  export const fromID = zod(WorkspaceSchema.shape.id, async (id) =>
    useTransaction(async (tx) => {
      return tx
        .select()
        .from(workspace)
        .where(eq(workspace.id, id))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export const fromSlug = zod(WorkspaceSchema.shape.slug, async (slug) =>
    useTransaction(async (tx) => {
      return tx
        .select()
        .from(workspace)
        .where(eq(workspace.slug, slug.toLowerCase()))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export const remove = zod(WorkspaceSchema.shape.id, (input) =>
    useTransaction(async (tx) => {
      const account = assertActor("account");
      const row = await tx
        .select({
          workspaceID: user.workspaceID,
        })
        .from(user)
        .where(
          and(
            eq(user.workspaceID, input),
            eq(user.email, account.properties.email),
          ),
        )
        .execute()
        .then((rows) => rows.at(0));
      if (!row) return;
      await tx
        .update(workspace)
        .set({
          timeDeleted: sql`now()`,
        })
        .where(eq(workspace.id, row.workspaceID))
        .execute();
    }),
  );

  export function serialize(
    input: typeof workspace.$inferSelect,
  ): PublicWorkspace {
    return {
      id: input.id,
      name: input.name,
      slug: input.slug,
    };
  }
}
