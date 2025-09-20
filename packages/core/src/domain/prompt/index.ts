import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActor, useWorkspaceID } from "../../actor";
import { PromptSchema } from "../../models/Prompt";
import { removeTimestamps } from "../../util/sql";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { prompt } from "./prompt.sql";

const PromptCreateSchema = z
  .object({
    id: PromptSchema.shape.id.optional(),
    title: PromptSchema.shape.title,
    content: PromptSchema.shape.content,
    source: PromptSchema.shape.source.optional(),
    categoryPath: PromptSchema.shape.categoryPath.optional(),
    visibility: PromptSchema.shape.visibility.optional(),
    isFavorite: PromptSchema.shape.isFavorite.optional(),
    metadata: PromptSchema.shape.metadata.optional(),
  })
  .strict();

const PromptUpdateSchema = z
  .object({
    id: PromptSchema.shape.id,
    title: PromptSchema.shape.title.optional(),
    content: PromptSchema.shape.content.optional(),
    source: PromptSchema.shape.source.optional(),
    categoryPath: PromptSchema.shape.categoryPath.optional(),
    visibility: PromptSchema.shape.visibility.optional(),
    isFavorite: PromptSchema.shape.isFavorite.optional(),
    metadata: PromptSchema.shape.metadata.optional(),
  })
  .strict();

const PromptFavoriteSchema = z
  .object({
    id: PromptSchema.shape.id,
    isFavorite: PromptSchema.shape.isFavorite,
  })
  .strict();

const PromptVisibilitySchema = z
  .object({
    id: PromptSchema.shape.id,
    visibility: PromptSchema.shape.visibility,
  })
  .strict();

type PromptSource = z.infer<typeof PromptSchema.shape.source>;

type PromptVisibility = z.infer<typeof PromptSchema.shape.visibility>;

const normalizeSource = (source?: PromptSource): PromptSource =>
  (source ?? "other") as PromptSource;

const baseCategoryPath = (source: PromptSource) => `inbox/${source}`;

const normalizeCategoryPath = (
  categoryPath: string | undefined,
  source: PromptSource,
) => {
  const value = categoryPath?.trim();
  if (!value || value.length === 0) return baseCategoryPath(source);
  return value.replace(/\s+/g, "-").toLowerCase();
};

type PromptInsert = typeof prompt.$inferInsert;

export namespace Prompt {
  export const create = zod(PromptCreateSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const id = input.id ?? createId();
      const source = normalizeSource(
        input.source?.toLowerCase() as PromptSource | undefined,
      );
      const categoryPath = normalizeCategoryPath(input.categoryPath, source);
      const record: PromptInsert = {
        id,
        workspaceID: actor.properties.workspaceID,
        userID: actor.properties.userID,
        title: input.title.trim(),
        content: input.content.trim(),
        source,
        categoryPath,
        visibility: (input.visibility ?? "private") as PromptVisibility,
        isFavorite: input.isFavorite ?? false,
        metadata: input.metadata ?? {},
      };

      const [result] = await tx
        .insert(prompt)
        .values(record)
        .onConflictDoUpdate({
          target: [prompt.workspaceID, prompt.id],
          set: {
            title: record.title,
            content: record.content,
            source: record.source,
            categoryPath: record.categoryPath,
            isFavorite: record.isFavorite,
            visibility: record.visibility,
            metadata: record.metadata,
            timeUpdated: sql`CURRENT_TIMESTAMP`,
          },
        })
        .returning();

      return result;
    }),
  );

  export const update = zod(PromptUpdateSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const source = input.source
        ? normalizeSource(input.source.toLowerCase() as PromptSource)
        : undefined;
      const categoryPath = normalizeCategoryPath(
        input.categoryPath,
        source ?? "other",
      );

      const updates = {
        ...removeTimestamps(input),
        ...(source ? { source } : {}),
        ...(input.categoryPath ? { categoryPath } : {}),
      } satisfies Partial<typeof prompt.$inferSelect>;

      await tx
        .update(prompt)
        .set({
          ...updates,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(prompt.id, input.id),
            eq(prompt.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );

  export const setFavorite = zod(PromptFavoriteSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      await tx
        .update(prompt)
        .set({
          isFavorite: input.isFavorite,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(prompt.id, input.id),
            eq(prompt.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );

  export const setVisibility = zod(PromptVisibilitySchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      await tx
        .update(prompt)
        .set({
          visibility: input.visibility,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(prompt.id, input.id),
            eq(prompt.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );

  export const listByWorkspace = zod(z.void(), () =>
    useTransaction((tx) =>
      tx
        .select()
        .from(prompt)
        .where(eq(prompt.workspaceID, useWorkspaceID()))
        .execute(),
    ),
  );

  export const fromID = zod(PromptSchema.shape.id, (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(prompt)
        .where(and(eq(prompt.id, id), eq(prompt.workspaceID, useWorkspaceID())))
        .execute()
        .then((rows) => rows.at(0)),
    ),
  );

  export const remove = zod(PromptSchema.shape.id, (id) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      await tx
        .update(prompt)
        .set({ timeDeleted: sql`CURRENT_TIMESTAMP` })
        .where(
          and(
            eq(prompt.id, id),
            eq(prompt.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );
}
