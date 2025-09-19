import { createId } from "@paralleldrive/cuid2";

import { Client } from "@sst-replicache-template/functions/replicache/framework";
import { ServerType } from "@sst-replicache-template/functions/replicache/server";

import { workspaceStore } from "@/providers/workspace-provider/workspace-context";
import { UserSettingsStore } from "./user-settings";
import { UserStore } from "./user-store";
import { WorkspaceStore } from "./workspace-store";
import { PromptStore } from "./prompt-store";

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

  .mutation("prompt_create", async (tx, input) => {
    const workspace = workspaceStore.get();
    if (!workspace?.id) return;
    const now = new Date().toISOString();
    const content = (input.content ?? "").trim();
    if (!content) return;
    const title = (input.title ?? "").trim() || content.slice(0, 120) || "Untitled prompt";
    const prompt = {
      id: input.id ?? createId(),
      workspaceID: workspace.id,
      userID: "",
      title,
      content,
      source: input.source ?? "other",
      categoryPath: input.categoryPath ?? `inbox/${input.source ?? "other"}`,
      visibility: input.visibility ?? "private",
      isFavorite: input.isFavorite ?? false,
      metadata: input.metadata ?? {},
      timeCreated: now,
      timeUpdated: now,
      timeDeleted: null,
    } satisfies Parameters<typeof PromptStore.set>[0];

    await PromptStore.set(prompt)(tx);
  })
  .mutation("prompt_update", async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx);
    if (!existing) return;
    const updated = {
      ...existing,
      ...input,
      source: input.source ?? existing.source,
      categoryPath: input.categoryPath ?? existing.categoryPath,
      visibility: input.visibility ?? existing.visibility,
      isFavorite: input.isFavorite ?? existing.isFavorite,
      metadata: input.metadata ?? existing.metadata,
      timeUpdated: new Date().toISOString(),
    };
    await PromptStore.set(updated)(tx);
  })
  .mutation("prompt_toggle_favorite", async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx);
    if (!existing) return;
    await PromptStore.set({
      ...existing,
      isFavorite: input.isFavorite,
      timeUpdated: new Date().toISOString(),
    })(tx);
  })
  .mutation("prompt_set_visibility", async (tx, input) => {
    const existing = await PromptStore.fromID(input.id)(tx);
    if (!existing) return;
    await PromptStore.set({
      ...existing,
      visibility: input.visibility,
      timeUpdated: new Date().toISOString(),
    })(tx);
  })

  .build();
