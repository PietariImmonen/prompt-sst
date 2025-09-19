import { useWorkspaceID } from "@sst-replicache-template/core/actor";
import { User } from "@sst-replicache-template/core/domain/user";
import { UserSettings } from "@sst-replicache-template/core/domain/user-settings";
import { Workspace } from "@sst-replicache-template/core/domain/workspace";
import { Prompt } from "@sst-replicache-template/core/domain/prompt";

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
