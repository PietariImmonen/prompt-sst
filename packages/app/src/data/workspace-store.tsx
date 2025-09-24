import { Workspace } from "@prompt-saver/core/models/Workspace";
import { ReadTransaction, WriteTransaction } from "replicache";

export namespace WorkspaceStore {
  export function list() {
    return async (tx: ReadTransaction) => {
      const result = await tx
        .scan<Workspace>({ prefix: `/workspace/` })
        .toArray();
      return result as Workspace[];
    };
  }

  export function fromSlug(slug: string) {
    return async (tx: ReadTransaction) => {
      const all = await list()(tx);
      return all.find((w) => w.slug === slug) as Workspace | undefined;
    };
  }

  export function fromID(id: string) {
    return async (tx: ReadTransaction) => {
      const result = await tx.get<Workspace>(`/workspace/${id}`);
      return result as Workspace | undefined;
    };
  }

  export function set(item: Workspace) {
    return async (tx: WriteTransaction) => {
      await tx.set(`/workspace/${item.id}`, item);
    };
  }
}
