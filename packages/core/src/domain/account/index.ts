import { createId } from "@paralleldrive/cuid2";
import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import { z } from "zod";

import { assertActor } from "../../actor";
import { db } from "../../drizzle";
import { AccountSchema } from "../../models/Account";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { user } from "../user/user.sql";
import { workspace } from "../workspace/workspace.sql";
import { account } from "./account.sql";

export namespace Account {
  export const create = zod(
    AccountSchema.pick({
      email: true,
      id: true,
      name: true,
      emailLanguage: true,
    })
      .partial({
        id: true,
      })
      .extend({
        noSubscribe: z.boolean().optional(),
      }),
    (input) =>
      useTransaction(async (tx) => {
        const id = input.id ?? createId();
        await tx
          .insert(account)
          .values({
            id,
            email: input.email,
            name: input.name,
            emailLanguage: input.emailLanguage,
          })
          .onConflictDoUpdate({
            target: account.id,
            set: {
              timeDeleted: null,
            },
          })
          .execute();
        return id;
      }),
  );

  export const fromID = zod(AccountSchema.shape.id, async (id) =>
    db.transaction(async (tx) => {
      return tx
        .select()
        .from(account)
        .where(eq(account.id, id))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export const fromEmail = zod(AccountSchema.shape.email, async (email) =>
    db.transaction(async (tx) => {
      return tx
        .select()
        .from(account)
        .where(eq(account.email, email))
        .execute()
        .then((rows) => rows.at(0));
    }),
  );

  export function workspaces() {
    const actor = assertActor("account");
    return useTransaction((tx) =>
      tx
        .select({
          ...getTableColumns(workspace),
        })
        .from(workspace)
        .innerJoin(user, eq(user.workspaceID, workspace.id))

        .where(
          and(
            eq(user.email, actor.properties.email),
            isNull(user.timeDeleted),
            isNull(workspace.timeDeleted),
          ),
        )
        .execute(),
    );
  }
}
