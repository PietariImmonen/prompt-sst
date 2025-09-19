import { Dot, Undo2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { workspaceConfig } from "@/config/workspace-config";
import { useLocale } from "@/hooks/use-locale";
import { useWorkspace } from "@/hooks/use-workspace";
import { UserNav } from "../user-nav";
import { WorkspaceNav } from "../workspace-nav";

export function SidebarNav() {
  const { t } = useLocale();
  const location = useLocation();
  const workspace = useWorkspace();
  const { setOpenMobile } = useSidebar();

  const params = useParams();

  const isSettingsPage = params["*"]?.split("/")[0] === "settings";

  if (isSettingsPage) {
    return (
      <Sidebar>
        <SidebarHeader>
          <SidebarMenuButton asChild>
            <Link to={`/${workspace.slug}/dashboard`}>
              <Undo2 className="size-4" />
              <p className="flex-1 text-start font-medium text-foreground">
                {t("common:action.goBack")}
              </p>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceNav />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="">
            {t("nav:workspace")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* <CommandMenu /> */}
              {workspaceConfig.sidebarNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith(
                      `/${workspace.slug}/${item.href}`,
                    )}
                  >
                    <Link
                      className="font-medium"
                      key={item.title}
                      to={
                        item.href === "/"
                          ? `/${workspace.slug}`
                          : `/${workspace.slug}/${item.href}`
                      }
                      onClick={() => setOpenMobile(false)}
                    >
                      {item.icon ? <item.icon /> : <Dot />}
                      {t(item.title as never)}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 pb-4">
        <Separator className="border-dashed" />
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
