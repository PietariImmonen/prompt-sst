import type { InitOptions } from "i18next";

import { en } from "./locales/en";
import { fi } from "./locales/fi";

export const fallbackLng = "fi";
export const languages = [fallbackLng, "en"];
export const defaultNS = "common";
export const namespaces = [
  defaultNS,
  "nav",
  "auth",
  "appointment",
  "settings",
  "zod",
  "validation",
  "workspace",
  "documentTemplate",
  "document",
  "session",
  "transcription",
  "analytics",
];

export const resources = {
  en,
  fi,
} as const;

export const getOptions = (): InitOptions => ({
  debug: import.meta.env.DEV,
  resources,
  supportedLngs: languages,
  fallbackLng,
  fallbackNS: defaultNS,
  defaultNS,
  ns: defaultNS,
  preload: languages,
  detection: {
    // order and from where user language should be detected
    order: [
      "localStorage",
      "sessionStorage",
      "navigator",
      "htmlTag",
      "path",
      "cookie",
    ],

    // keys or params to lookup language from
    lookupQuerystring: "lng",
    lookupCookie: "i18next",
    lookupLocalStorage: "i18nextLng",
    lookupSessionStorage: "i18nextLng",
    lookupFromPathIndex: 0,
    lookupFromSubdomainIndex: 0,
  },
});
