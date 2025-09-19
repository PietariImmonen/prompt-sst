import * as React from "react";
import type { ReadonlyJSONValue, ReadTransaction } from "replicache";

import { useSubscribe as useSubscribeOfficial } from "@/hooks/use-subscribe";
import { ReplicacheContext } from "@/providers/replicache-provider/replicache-context";

export function useReplicache() {
  const rep = React.useContext(ReplicacheContext);
  if (!rep) {
    throw new Error("useReplicache must be used inside a ReplicacheProvider");
  }
  return rep;
}

export function useSubscribe<R extends ReadonlyJSONValue | undefined>(
  query: (tx: ReadTransaction) => Promise<R>,
  options?: {
    default?: R;
    dependencies?: Array<unknown>;
  },
): R {
  const rep = useReplicache();
  return useSubscribeOfficial(rep, query, options);
}
