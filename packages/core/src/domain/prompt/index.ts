import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActor, useWorkspaceID } from "../../actor";
import { defineEvent } from "../../event";
import { PromptSchema } from "../../models/Prompt";
import { TagSchema } from "../../models/Tag";
import { VisibleError } from "../../util/error";
import { removeTimestamps } from "../../util/sql";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { promptTag, tag } from "../tag/tag.sql";
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
    tagIDs: z.array(TagSchema.shape.id).max(20).optional(),
    skipCategorization: z.boolean().optional(),
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
    tagIDs: z.array(TagSchema.shape.id).max(20).optional(),
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

const PromptSetTagsSchema = z
  .object({
    id: PromptSchema.shape.id,
    tagIDs: z.array(TagSchema.shape.id).max(20),
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

type TransactionLike = Parameters<Parameters<typeof useTransaction>[0]>[0];

const normalizeTagIDs = (tagIDs: string[] | undefined) => {
  if (!tagIDs) return undefined;
  const unique = new Set(
    tagIDs.map((value) => value.trim()).filter((value) => value.length > 0),
  );
  return Array.from(unique);
};

const ensureTagsExist = async (
  tx: TransactionLike,
  workspaceID: string,
  tagIDs: string[],
) => {
  if (tagIDs.length === 0) return;

  const rows = await tx
    .select({ id: tag.id })
    .from(tag)
    .where(
      and(
        eq(tag.workspaceID, workspaceID),
        inArray(tag.id, tagIDs),
        isNull(tag.timeDeleted),
      ),
    )
    .execute();

  if (rows.length !== tagIDs.length)
    throw new VisibleError(
      "input",
      "prompt.tags.invalid",
      "One or more tags are unavailable in this workspace.",
    );
};

const applyPromptTags = async (
  tx: TransactionLike,
  workspaceID: string,
  promptID: string,
  tagIDs: string[],
) => {
  if (tagIDs.length === 0) {
    await tx
      .update(promptTag)
      .set({
        timeDeleted: sql`CURRENT_TIMESTAMP`,
        timeUpdated: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(promptTag.workspaceID, workspaceID),
          eq(promptTag.promptID, promptID),
          isNull(promptTag.timeDeleted),
        ),
      )
      .execute();
    return;
  }

  const existing = await tx
    .select({
      tagID: promptTag.tagID,
      timeDeleted: promptTag.timeDeleted,
    })
    .from(promptTag)
    .where(
      and(
        eq(promptTag.workspaceID, workspaceID),
        eq(promptTag.promptID, promptID),
      ),
    )
    .execute();

  const active = new Set(
    existing.filter((row) => row.timeDeleted === null).map((row) => row.tagID),
  );

  const toRemove = Array.from(active).filter((id) => !tagIDs.includes(id));

  if (toRemove.length > 0) {
    await tx
      .update(promptTag)
      .set({
        timeDeleted: sql`CURRENT_TIMESTAMP`,
        timeUpdated: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(promptTag.workspaceID, workspaceID),
          eq(promptTag.promptID, promptID),
          inArray(promptTag.tagID, toRemove),
          isNull(promptTag.timeDeleted),
        ),
      )
      .execute();
  }

  await tx
    .insert(promptTag)
    .values(
      tagIDs.map((tagID) => ({
        id: createId(),
        workspaceID,
        promptID,
        tagID,
      })),
    )
    .onConflictDoUpdate({
      target: [promptTag.workspaceID, promptTag.promptID, promptTag.tagID],
      set: {
        timeDeleted: sql`NULL`,
        timeUpdated: sql`CURRENT_TIMESTAMP`,
      },
    })
    .execute();
};

export namespace Prompt {
  export const Events = {
    PromptCreated: defineEvent(
      "prompt.created",
      z.object({
        promptID: z.string().cuid2(),
        workspaceID: z.string().cuid2(),
        skipCategorization: z.boolean().optional(),
      }),
    ),
  };

  export const create = zod(PromptCreateSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const id = input.id ?? createId();
      const source = normalizeSource(
        input.source?.toLowerCase() as PromptSource | undefined,
      );
      const categoryPath = normalizeCategoryPath(input.categoryPath, source);
      const tagIDs = normalizeTagIDs(input.tagIDs);

      if (tagIDs !== undefined) {
        await ensureTagsExist(tx, actor.properties.workspaceID, tagIDs);
      }
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

      if (!result) return result;

      if (tagIDs !== undefined) {
        await applyPromptTags(tx, actor.properties.workspaceID, id, tagIDs);
      }

      // Publish event for auto-categorization after prompt is saved
      if (!input.skipCategorization && tagIDs === undefined) {
        await Events.PromptCreated.create({
          promptID: id,
          workspaceID: actor.properties.workspaceID,
          skipCategorization: false,
        });
      }

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
      const tagIDs = normalizeTagIDs(input.tagIDs);

      if (tagIDs !== undefined) {
        await ensureTagsExist(tx, actor.properties.workspaceID, tagIDs);
      }

      const { tagIDs: _ignoredTagIDs, ...promptInput } = input;

      const updates = {
        ...removeTimestamps(promptInput),
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

      if (tagIDs !== undefined) {
        await applyPromptTags(
          tx,
          actor.properties.workspaceID,
          input.id,
          tagIDs,
        );
      }
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

  export const setTags = zod(PromptSetTagsSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const tagIDs = normalizeTagIDs(input.tagIDs) ?? [];

      await ensureTagsExist(tx, actor.properties.workspaceID, tagIDs);
      await applyPromptTags(tx, actor.properties.workspaceID, input.id, tagIDs);

      await tx
        .update(prompt)
        .set({ timeUpdated: sql`CURRENT_TIMESTAMP` })
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

      await tx
        .update(promptTag)
        .set({
          timeDeleted: sql`CURRENT_TIMESTAMP`,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(promptTag.promptID, id),
            eq(promptTag.workspaceID, actor.properties.workspaceID),
            isNull(promptTag.timeDeleted),
          ),
        )
        .execute();
    }),
  );
}
