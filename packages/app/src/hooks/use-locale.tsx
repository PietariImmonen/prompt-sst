import i18n from "@/i18n";
import { useTranslation } from "@/i18n/client";

type TranslationArgs = typeof useTranslation extends (
  x: string,
  ...args: infer P
) => unknown
  ? P
  : never;

export const useLocale = (...args: TranslationArgs) => {
  const lang = i18n.resolvedLanguage || "en";

  return {
    lang,
    ...useTranslation(lang, ...args),
  };
};
