import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { useWorkspaceID } from "../../actor";
import { UserSettingsSchema } from "../../models/UserSettings";
import { removeTimestamps } from "../../util/sql";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { userSettings } from "./user-settings.sql";

export namespace UserSettings {
  export const create = zod(
    UserSettingsSchema.pick({
      userID: true,
      inAppOnboardingCompleted: true,
      workspaceID: true,
      shortcutCapture: true,
      shortcutPalette: true,
      enableAutoCapture: true,
    }).partial({
      workspaceID: true,
      shortcutCapture: true,
      shortcutPalette: true,
      enableAutoCapture: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        const id = createId();
        const workspaceID = input.workspaceID ?? useWorkspaceID();
        await tx
          .insert(userSettings)
          .values({
            ...input,
            workspaceID: workspaceID,
            id,
          })
          .onConflictDoNothing()
          .execute();
        return id;
      }),
  );

  export const listAll = zod(z.void(), () =>
    useTransaction((tx) => tx.select().from(userSettings).execute()),
  );

  export const fromWorkspaceID = zod(
    z.object({ workspaceID: z.string() }),
    (input) =>
      useTransaction((tx) =>
        tx
          .select()
          .from(userSettings)
          .where(eq(userSettings.workspaceID, input.workspaceID))
          .execute()
          .then((rows) => rows.at(0)),
      ),
  );

  export const fromUserID = zod(z.object({ userID: z.string() }), (input) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userSettings)
        .where(eq(userSettings.userID, input.userID))
        .execute(),
    ),
  );

  export const update = zod(UserSettingsSchema, (input) =>
    useTransaction(async (tx) => {
      await tx
        .update(userSettings)
        .set({ ...removeTimestamps(input) })
        .where(eq(userSettings.id, input.id))
        .execute();
    }),
  );

  export const updateSettings = zod(
    UserSettingsSchema.pick({
      id: true,
      shortcutCapture: true,
      shortcutPalette: true,
      enableAutoCapture: true,
    }).partial({
      shortcutCapture: true,
      shortcutPalette: true,
      enableAutoCapture: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        await tx
          .update(userSettings)
          .set({ ...removeTimestamps(input) })
          .where(eq(userSettings.id, input.id))
          .execute();
      }),
  );

  export const remove = zod(z.string(), (input) =>
    useTransaction((tx) =>
      tx.delete(userSettings).where(eq(userSettings.id, input)).execute(),
    ),
  );
}
