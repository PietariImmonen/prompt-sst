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
import {
  PromptInsertionPalette,
  PromptInsertionPaletteTrigger
} from '@/components/prompt-insertion-palette'
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
    <Sidebar variant="inset" className="border-r border-gray-800 bg-gray-950">
      <SidebarHeader className="border-b border-gray-800">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-white">Prompt</span>
            <span className="truncate text-xs text-gray-400">Desktop App</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gray-950">
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-400">Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="hover:bg-gray-900 data-[active=true]:bg-gray-900 data-[active=true]:text-white"
                  >
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4 text-gray-400 group-hover:text-white" />
                      <span className="text-gray-300 group-hover:text-white">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 pb-4 bg-gray-950">
        <div className="flex items-center justify-between gap-2 rounded-md border border-gray-800 bg-gray-900 p-2 pr-1 hover:bg-gray-800 transition-colors">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-gray-200">Prompt palette</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
              {shortcutHint}
            </p>
          </div>
          <PromptInsertionPaletteTrigger />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-gray-800 bg-gray-900 p-2 pr-1 hover:bg-gray-800 transition-colors">
          <div className="leading-tight">
            <p className="text-xs font-semibold text-gray-200">Prompt capture</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
              {shortcutHint}
            </p>
          </div>
          <PromptCapturePaletteTrigger />
        </div>
        <SidebarMenuButton 
          onClick={() => auth.logout()}
          className="w-full justify-start hover:bg-gray-900 text-gray-300 hover:text-white"
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
      <div className="flex min-h-screen w-full bg-gray-950">
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
