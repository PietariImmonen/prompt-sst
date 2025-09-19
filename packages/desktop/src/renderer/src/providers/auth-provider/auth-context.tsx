import * as React from "react";
import { z } from "zod";

import { WorkspaceSchema } from "@sst-replicache-template/core/models/Workspace";

export type Account = {
  [x: string]: unknown;
  id: string;
  email: string;
  name: string;
  token: string;
  workspaces: z.infer<typeof WorkspaceSchema>[];
};

export interface AuthContextType {
  current: Account | null;
  accounts: Record<string, Account>;
  logout: () => void;
  refresh: () => Promise<void>;
  isReady: boolean;
}

interface AuthStorage {
  accounts: Record<string, Account>;
  current?: string;
}

export const authStore = {
  get() {
    const raw = localStorage.getItem("sst-replicache-template.auth");
    if (!raw) return null;
    return JSON.parse(raw) as AuthStorage;
  },
  set(input: AuthStorage) {
    return localStorage.setItem(
      "sst-replicache-template.auth",
      JSON.stringify(input),
    );
  },
  remove() {
    return localStorage.removeItem("sst-replicache-template.auth");
  },
};

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined,
);
