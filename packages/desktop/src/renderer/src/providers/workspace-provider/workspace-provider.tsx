import * as React from "react";

import { Workspace } from "@sst-replicache-template/core/models/Workspace";

import { WorkspaceContext } from "./workspace-context";

interface WorkspaceProviderProps {
  workspace: Workspace;
  children: React.ReactNode;
}

export function WorkspaceProvider({
  workspace,
  children,
}: WorkspaceProviderProps) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
