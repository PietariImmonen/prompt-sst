import * as React from "react";
import { WorkspaceSchema } from "@prompt-saver/core/models/Workspace";
import { z } from "zod";

export type Account = {
  [x: string]: unknown;
  id: string;
  email: string;
  name: string;
  token: string;
  workspaces: z.infer<typeof WorkspaceSchema>[];
};

export interface AuthContextType {
  current: Account;
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
    const raw = localStorage.getItem("prompt-saver.auth");
    if (!raw) return null;
    return JSON.parse(raw) as AuthStorage;
  },
  set(input: AuthStorage) {
    return localStorage.setItem("prompt-saver.auth", JSON.stringify(input));
  },
  remove() {
    return localStorage.removeItem("prompt-saver.auth");
  },
};

export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined,
);
