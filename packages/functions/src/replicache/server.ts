import { useWorkspaceID } from "@prompt-saver/core/actor";
import { Prompt } from "@prompt-saver/core/domain/prompt";
import { User } from "@prompt-saver/core/domain/user";
import { UserSettings } from "@prompt-saver/core/domain/user-settings";
import { Workspace } from "@prompt-saver/core/domain/workspace";

import { Server } from "./framework";

export const server = new Server()
  .mutation("user_create", User.create.schema, async (input) => {
    const workspace = await Workspace.fromID(useWorkspaceID());

    if (!workspace) {
      console.error("Workspace not found");
      return;
    }

    if (workspace.type === "individual") {
      console.error("Individual workspaces cannot invite users");
      return;
    }

    await User.create(input);
  })
  .expose("user_update", User.update)
  .mutation("user_remove", User.remove.schema, async (input) => {
    await User.remove(input);
  })
  .expose("workspace_update", Workspace.update)
  .expose("user_settings_update", UserSettings.update)
  .expose("prompt_create", Prompt.create)
  .expose("prompt_update", Prompt.update)
  .expose("prompt_toggle_favorite", Prompt.setFavorite)
  .expose("prompt_set_visibility", Prompt.setVisibility);

export type ServerType = typeof server;
