import { assertActor } from "../../actor";
import { Replicache } from "../replicache";
import { Tag } from "../tag";
import { getTagsForRole, type UserRole } from "./role-tags";

export async function createRoleTags(role: UserRole) {
  const actor = assertActor("user");
  const tagNames = getTagsForRole(role);

  const createdTags = await Tag.createBatch({
    tags: tagNames.map((name) => ({ name })),
  });

  await Replicache.poke({
    actor: actor.properties.email,
    workspaceID: actor.properties.workspaceID,
  });

  return createdTags;
}
