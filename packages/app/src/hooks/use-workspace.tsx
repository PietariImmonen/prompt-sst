import * as React from "react";

import { Workspace } from "@sst-replicache-template/core/models/Workspace";

import { WorkspaceStore } from "@/data/workspace-store";
import { WorkspaceContext } from "@/providers/workspace-provider/workspace-context";
import { useAuth } from "./use-auth";
import { useSubscribe } from "./use-replicache";

function useWorkspaceContext() {
  const result = React.useContext(WorkspaceContext);
  const auth = useAuth();
  if (!result) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  const subscribedWorkspace = useSubscribe(WorkspaceStore.fromID(result.id), {
    default: auth.current.workspaces.find((w) => w.id === result.id) ?? result,
  });

  const workspace = React.useMemo(
    () => subscribedWorkspace,
    [subscribedWorkspace],
  );

  return workspace as Workspace;
}

export function useWorkspace() {
  return useWorkspaceContext();
}
