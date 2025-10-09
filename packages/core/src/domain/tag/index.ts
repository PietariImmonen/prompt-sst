import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { assertActor } from "../../actor";
import { TagSchema } from "../../models/Tag";
import { useTransaction } from "../../util/transaction";
import { zod } from "../../util/zod";
import { promptTag, tag } from "./tag.sql";

type TagInsert = typeof tag.$inferInsert;

type TagUpdate = Partial<Pick<TagInsert, "name" | "slug" | "description">>;

const normalizeWhitespace = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const sanitizeDescription = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const TagCreateSchema = z
  .object({
    id: TagSchema.shape.id.optional(),
    name: TagSchema.shape.name,
    slug: TagSchema.shape.slug.optional(),
    description: TagSchema.shape.description.optional(),
  })
  .strict();

const TagUpdateSchema = z
  .object({
    id: TagSchema.shape.id,
    name: TagSchema.shape.name.optional(),
    slug: TagSchema.shape.slug.optional(),
    description: TagSchema.shape.description.optional(),
  })
  .strict();

export namespace Tag {
  export const create = zod(TagCreateSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const name = normalizeWhitespace(input.name);
      const slugSource = input.slug ?? name;
      const slug = slugify(slugSource);
      if (!slug) {
        throw new Error("Tag slug cannot be empty");
      }

      const record: TagInsert = {
        id: input.id ?? createId(),
        workspaceID: actor.properties.workspaceID,
        name,
        slug,
        description: sanitizeDescription(input.description ?? null),
      };

      const [result] = await tx
        .insert(tag)
        .values(record)
        .onConflictDoUpdate({
          target: [tag.workspaceID, tag.slug],
          set: {
            name: record.name,
            description: record.description,
            timeDeleted: sql`NULL`,
            timeUpdated: sql`CURRENT_TIMESTAMP`,
          },
        })
        .returning();

      return result;
    }),
  );

  export const update = zod(TagUpdateSchema, (input) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");
      const updates: TagUpdate = {};

      if (input.name !== undefined) {
        updates.name = normalizeWhitespace(input.name);
      }

      const slugSource =
        input.slug ??
        (input.name !== undefined ? (updates.name ?? input.name) : undefined);

      if (slugSource !== undefined) {
        const slug = slugify(slugSource);
        if (!slug) throw new Error("Tag slug cannot be empty");
        updates.slug = slug;
      }

      if (input.description !== undefined) {
        updates.description = sanitizeDescription(input.description);
      }

      if (Object.keys(updates).length === 0) return;

      await tx
        .update(tag)
        .set({
          ...updates,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(tag.id, input.id),
            eq(tag.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );

  export const remove = zod(TagSchema.shape.id, (id) =>
    useTransaction(async (tx) => {
      const actor = assertActor("user");

      await tx
        .update(tag)
        .set({
          timeDeleted: sql`CURRENT_TIMESTAMP`,
          timeUpdated: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(tag.id, id),
            eq(tag.workspaceID, actor.properties.workspaceID),
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
            eq(promptTag.tagID, id),
            eq(promptTag.workspaceID, actor.properties.workspaceID),
          ),
        )
        .execute();
    }),
  );

  export const createBatch = zod(
    z.object({
      tags: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        }),
      ),
    }),
    (input) =>
      useTransaction(async (tx) => {
        const actor = assertActor("user");
        const workspaceID = actor.properties.workspaceID;
        const createdTags: Array<{ id: string; name: string; slug: string }> =
          [];

        for (const tagInput of input.tags) {
          const name = normalizeWhitespace(tagInput.name);
          const slug = slugify(name);

          if (!slug) {
            console.warn(`Skipping tag with empty slug: ${name}`);
            continue;
          }

          const record: TagInsert = {
            id: createId(),
            workspaceID,
            name,
            slug,
            description: sanitizeDescription(tagInput.description ?? null),
          };

          try {
            const [result] = await tx
              .insert(tag)
              .values(record)
              .onConflictDoUpdate({
                target: [tag.workspaceID, tag.slug],
                set: {
                  name: record.name,
                  description: record.description,
                  timeDeleted: sql`NULL`,
                  timeUpdated: sql`CURRENT_TIMESTAMP`,
                },
              })
              .returning();

            if (result) {
              createdTags.push({
                id: result.id,
                name: result.name,
                slug: result.slug,
              });
            }
          } catch (error) {
            console.error(`Failed to create tag: ${name}`, error);
          }
        }

        return createdTags;
      }),
  );

  export const listByWorkspace = zod(z.void(), () =>
    useTransaction((tx) => {
      const actor = assertActor("user");
      return tx
        .select()
        .from(tag)
        .where(
          and(
            eq(tag.workspaceID, actor.properties.workspaceID),
            isNull(tag.timeDeleted),
          ),
        )
        .execute();
    }),
  );
}
