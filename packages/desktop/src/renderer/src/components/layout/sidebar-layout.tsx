import * as React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, MessageSquare, Settings } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@/components/ui/sidebar'
import { PromptInsertionPalette } from '@/components/prompt-insertion-palette'
import { getPromptPaletteShortcutDisplay } from '@/components/prompt-insertion-palette/shortcut'
import { PromptCapturePaletteTrigger } from '@/components/prompt-capture-palette/prompt-capture-trigger'
import { useAuth } from '@/hooks/use-auth'

// Menu items for the desktop app
const menuItems = [
  {
    title: 'Prompts',
    url: '/sessions',
    icon: MessageSquare
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings
  }
]

function AppSidebar() {
  const location = useLocation()
  const shortcutHint = React.useMemo(getPromptPaletteShortcutDisplay, [])
  const auth = useAuth()

  return (
    <Sidebar variant="inset" className="border-r border-border/60 bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-border/60">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-sidebar-foreground">Prompt</span>
            <span className="truncate text-xs text-muted-foreground">Desktop App</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-sidebar-accent-foreground" />
                      <span className="text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
                        {item.title}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 pb-4 bg-sidebar">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 p-2 pr-1 text-foreground transition-colors hover:bg-background">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">Prompt palette</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {shortcutHint}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 p-2 pr-1 text-foreground transition-colors hover:bg-background">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">Prompt capture</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {shortcutHint}
            </p>
          </div>
          <PromptCapturePaletteTrigger />
        </div>
        <SidebarMenuButton
          onClick={() => auth.logout()}
          className="w-full justify-start text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  )
}

const SidebarLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <PromptInsertionPalette />
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export default SidebarLayout
