import { ReadTransaction, WriteTransaction } from "replicache";

import { Prompt } from "@sst-replicache-template/core/models/Prompt";

const PROMPT_PREFIX = "/prompt/";

export namespace PromptStore {
  export function list() {
    return async (tx: ReadTransaction) => {
      const result = await tx.scan<Prompt>({ prefix: PROMPT_PREFIX }).toArray();
      return (result as Prompt[]).sort((a, b) => {
        const aTime = a.timeCreated ? new Date(a.timeCreated).getTime() : 0;
        const bTime = b.timeCreated ? new Date(b.timeCreated).getTime() : 0;
        return bTime - aTime;
      });
    };
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const result = await tx.get<Prompt>(`${PROMPT_PREFIX}${id}`);
      return result as Prompt | undefined;
    };
  }

  export function set(item: Prompt) {
    return async (tx: WriteTransaction) => {
      await tx.set(`${PROMPT_PREFIX}${item.id}`, item);
    };
  }

  export function remove(id: string) {
    return async (tx: WriteTransaction) => {
      await tx.del(`${PROMPT_PREFIX}${id}`);
    };
  }
}
