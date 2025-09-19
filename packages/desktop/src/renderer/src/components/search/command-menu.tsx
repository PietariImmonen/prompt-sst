import * as React from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { workspaceConfig } from "@/config/workspace-config";
import { useLocale } from "@/hooks/use-locale";
import { useWorkspace } from "@/hooks/use-workspace";

export function CommandMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const { t } = useLocale();

  const workspace = useWorkspace();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="font-medium"
          onClick={() => setOpen(true)}
        >
          <Search className="size-4" />
          {t("common:placeholder.search")}
          <kbd className="pointer-events-none absolute top-2.25 right-8 hidden h-5 items-center gap-1 rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
            <span className="text-xs">⌘</span>
          </kbd>
          <kbd className="pointer-events-none absolute top-2.25 right-2 hidden h-5 items-center gap-1 rounded border border-border/50 bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
            K
          </kbd>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle></DialogTitle>
        <DialogDescription></DialogDescription>
        <CommandInput placeholder={t("nav:commandMenu.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("nav:commandMenu.noResults")}</CommandEmpty>
          {workspaceConfig.sidebarNav.map((group) => (
            <CommandGroup
              key={group.title}
              heading={t(group.title as never)}
              className="[&_[cmdk-group-heading]]:text-xs"
            >
              <CommandItem
                key={group.href}
                className="text-sm"
                onSelect={() => {
                  runCommand(() =>
                    navigate(`/${workspace.slug}/${group.href}`),
                  );
                }}
              >
                {t(group.title as never)}
              </CommandItem>
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
