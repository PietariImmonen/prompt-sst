import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";
import i18n from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const { lang } = useLocale();

  const availableLanguages = [
    { param: "fi", icon: "🇫🇮", name: "Suomi" },
    { param: "en", icon: "🇬🇧", name: "English" },
  ];

  const onLanguageChange = (newLang: string) => {
    if (newLang !== lang) {
      i18n.changeLanguage(newLang);
    }
  };

  return (
    <Select defaultValue={lang} onValueChange={onLanguageChange}>
      <SelectTrigger
        className={cn(
          "border bg-secondary font-medium text-secondary-foreground shadow-xs hover:bg-secondary/80",
          "w-fit items-center gap-2",
        )}
      >
        <p>{lang === "fi" ? "🇫🇮" : "🇬🇧"}</p>
        <p>{lang === "fi" ? "Suomi" : "English"}</p>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.param} value={lang.param}>
              {lang.icon} {lang.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
