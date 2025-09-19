import * as React from "react";

export type Theme = "dark" | "light" | "system";

type ThemeContextState = {
  theme: Theme;
  systemTheme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeContextState = {
  theme: "system",
  systemTheme: "light",
  setTheme: () => null,
};

export const ThemeProviderContext =
  React.createContext<ThemeContextState>(initialState);
