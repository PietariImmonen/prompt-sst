import { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
};

export type SidebarNavItem = {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  icon?: LucideIcon;
};

export type SiteConfig = {
  name: string;
  description: string;
};

export type WorkspaceConfig = {
  sidebarNav: SidebarNavItem[];
};
