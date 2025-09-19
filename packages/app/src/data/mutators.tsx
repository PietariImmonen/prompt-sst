import { createId } from "@paralleldrive/cuid2";

import { Client } from "@sst-replicache-template/functions/replicache/framework";
import { ServerType } from "@sst-replicache-template/functions/replicache/server";

import { workspaceStore } from "@/providers/workspace-provider/workspace-context";
import { UserSettingsStore } from "./user-settings";
import { UserStore } from "./user-store";
import { WorkspaceStore } from "./workspace-store";

export const mutators = new Client<ServerType>()
  .mutation("user_create", async (tx, input) => {
    await UserStore.set({
      ...input,
      id: input.id ?? createId(),
      timeSeen: null,
      first: input.first ?? false,
      workspaceID: (workspaceStore.get()?.id as string) ?? "",
      role: input.role ?? "member",
      isOnboarded: false,
    })(tx);
  })
  .mutation("user_remove", async (tx, input) => {
    await UserStore.remove(input)(tx);
  })
  .mutation("user_update", async (tx, input) => {
    await UserStore.set(input)(tx);
  })
  .mutation("workspace_update", async (tx, input) => {
    await WorkspaceStore.set(input)(tx);
  })

  .mutation("user_settings_update", async (tx, input) => {
    await UserSettingsStore.set(input)(tx);
  })

  .build();
