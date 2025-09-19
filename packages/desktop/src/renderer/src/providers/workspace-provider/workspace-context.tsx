import * as React from "react";
import { z } from "zod";

import { Workspace, WorkspaceSchema } from "@sst-replicache-template/core/models/Workspace";

const CurrentWorkspaceSchema = WorkspaceSchema;

export const workspaceStore = {
  get() {
    const raw = localStorage.getItem("sst-replicache-template.workspace");
    if (!raw) return undefined;
    // Parse with the base schema
    return JSON.parse(raw) as z.infer<typeof CurrentWorkspaceSchema>;
  },
  set(input: z.infer<typeof CurrentWorkspaceSchema>) {
    // Set using the base schema
    return localStorage.setItem("sst-replicache-template.workspace", JSON.stringify(input));
  },
  remove() {
    return localStorage.removeItem("sst-replicache-template.workspace");
  },
};

export const WorkspaceContext = React.createContext<
  // Use the base schema type
  z.infer<typeof CurrentWorkspaceSchema> | undefined
>(undefined);

// Simplify WorkspaceContextType for now
export type WorkspaceContextType = Workspace;

// Original definition with AccountSchema pick:
// export type WorkspaceContextType = Workspace & {
//   account: AccountSchema.pick({
//     id: true,
//     role: true,
//   });
// };
