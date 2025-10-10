import * as React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, MessageSquare, Tag, User } from 'lucide-react'

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
import icon from '@/assets/icon.png'

// Menu items for the desktop app
const menuItems = [
  {
    title: 'Prompts',
    url: '/sessions',
    icon: MessageSquare
  },
  {
    title: 'Tags',
    url: '/tags',
    icon: Tag
  },
  {
    title: 'Account',
    url: '/account-settings',
    icon: User
  }
]

function AppSidebar() {
  const location = useLocation()
  const shortcutHint = React.useMemo(() => getPromptPaletteShortcutDisplay(false), [])
  const shortcutHintCapture = React.useMemo(() => getPromptPaletteShortcutDisplay(true), [])
  const auth = useAuth()

  return (
    <Sidebar
      variant="inset"
      className={`border-r border-border/60 bg-sidebar text-sidebar-foreground w-[10rem]`}
    >
      <SidebarHeader className="border-b border-border/60">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-foreground text-primary-foreground">
            <img src={icon} alt="CLYO" className="h-10 w-10" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-sidebar-foreground">CLYO</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  location.pathname === item.url || location.pathname.startsWith(`${item.url}/`)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-sidebar-accent-foreground" />
                        <span className="text-sidebar-foreground group-hover:text-sidebar-accent-foreground">
                          {item.title}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 pb-4 bg-sidebar">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-black/80 p-2 pr-1 text-foreground transition-colors hover:bg-black">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">Prompt palette</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {shortcutHint}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-black/80 p-2 pr-1 text-foreground transition-colors hover:bg-black">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">Prompt capture</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {shortcutHintCapture}
            </p>
          </div>
          <PromptCapturePaletteTrigger />
        </div>
        <SidebarMenuButton
          onClick={() => auth.logout()}
          className="w-full justify-start text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
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
      <div className="flex min-h-screen w-full bg-black text-foreground">
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
