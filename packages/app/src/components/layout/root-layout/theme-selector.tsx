import { Monitor, Moon, Sun } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();

  return (
    <Select defaultValue={theme} onValueChange={setTheme}>
      <SelectTrigger
        className={cn(
          "border bg-secondary font-medium text-secondary-foreground shadow-xs hover:bg-secondary/80",
          "w-fit items-center gap-2",
        )}
      >
        {theme === "dark" ? (
          <Moon className="h-4" />
        ) : theme === "system" ? (
          <Monitor className="h-4" />
        ) : (
          <Sun className="h-4" />
        )}
        {theme === "dark"
          ? t("common:theme.dark")
          : theme === "system"
            ? t("common:theme.system")
            : t("common:theme.light")}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="system">{t("common:theme.system")}</SelectItem>
          <SelectItem value="dark">{t("common:theme.dark")}</SelectItem>
          <SelectItem value="light">{t("common:theme.light")}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
