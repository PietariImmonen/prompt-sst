import * as React from "react";

import { bus } from "../realtime-provider/bus";
import { createReplicache, ReplicacheContext } from "./replicache-context";

export function ReplicacheProvider(props: {
  children: React.ReactNode;
  token: string;
  workspaceID: string;
  email: string;
}) {
  const [replicache, setReplicache] = React.useState<ReturnType<
    typeof createReplicache
  > | null>(null);
  const pullTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const _replicache = createReplicache({
      token: props.token,
      workspaceId: props.workspaceID,
    });
    setReplicache(_replicache);

    // Expose replicache instance globally for overlay access
    (window as any).__replicacheInstance = _replicache;

    return () => {
      _replicache.close();
      // Clean up global reference
      (window as any).__replicacheInstance = null;
    };
  }, [props.token, props.workspaceID]);

  React.useEffect(() => {
    if (!replicache) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pokeHandler = (params: any) => {
      if (params.workspaceID !== props.workspaceID) {
        console.debug("poke handler ignored for different workspace");
        return;
      }

      // Allow self-originated pokes so background captures from other surfaces (e.g. browser extension)
      // still fan out to the desktop app. A tiny debounce keeps repeated pokes from stacking pulls.
      console.debug("poke handler pulling", { actor: params.actor });
      if (pullTimerRef.current) {
        window.clearTimeout(pullTimerRef.current);
      }
      pullTimerRef.current = window.setTimeout(() => {
        pullTimerRef.current = null;
        void replicache.pull();
      }, 100);
    };

    bus.on("poke", pokeHandler);

    return () => {
      bus.off("poke", pokeHandler);
      if (pullTimerRef.current) {
        window.clearTimeout(pullTimerRef.current);
        pullTimerRef.current = null;
      }
    };
  }, [props.email, props.workspaceID, replicache]);

  return (
    <ReplicacheContext.Provider value={replicache ?? undefined}>
      {replicache && props.children}
    </ReplicacheContext.Provider>
  );
}
