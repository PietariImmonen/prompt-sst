import { ReadTransaction, WriteTransaction } from "replicache";

import { Prompt } from "@sst-replicache-template/core/models/Prompt";

export namespace PromptStore {
  function sortPrompts(list: Prompt[]) {
    return [...list].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      const createdA = a.timeCreated ? new Date(a.timeCreated).getTime() : 0;
      const createdB = b.timeCreated ? new Date(b.timeCreated).getTime() : 0;
      return createdB - createdA;
    });
  }

  export function list() {
    return async (tx: ReadTransaction) => {
      const prompts = await tx.scan<Prompt>({ prefix: "/prompt/" }).toArray();
      return sortPrompts(prompts.filter((prompt) => !prompt.timeDeleted));
    };
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const prompt = await tx.get<Prompt>(`/prompt/${id}`);
      return prompt && !prompt.timeDeleted ? prompt : undefined;
    };
  }

  export function set(prompt: Prompt) {
    return async (tx: WriteTransaction) => {
      await tx.set(`/prompt/${prompt.id}`, prompt);
    };
  }

  export function remove(id: string) {
    return async (tx: WriteTransaction) => {
      await tx.del(`/prompt/${id}`);
    };
  }
}
