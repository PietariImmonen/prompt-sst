import type { KeyPrefix, Namespace } from "i18next";
import type { UseTranslationOptions } from "react-i18next";
import { useTranslation as useTranslationOrg } from "react-i18next";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";

const zodNamespaces = ["zod", "validation"];

export const useTranslation = <N extends Namespace, K extends KeyPrefix<N>>(
  _lng?: string,
  ns?: N,
  includeValidation = false,
  options?: UseTranslationOptions<K>,
) => {
  if (includeValidation) {
    if (!ns) ns = zodNamespaces as unknown as N;
    else if (Array.isArray(ns)) ns = ns.concat(zodNamespaces) as unknown as N;
    else ns = [ns, ...zodNamespaces] as unknown as N;
  }

  const hook = useTranslationOrg(ns, options as never);
  // Set Zod translations
  z.setErrorMap(makeZodI18nMap({ t: hook.t as never, ns: zodNamespaces }));

  return hook;
};
