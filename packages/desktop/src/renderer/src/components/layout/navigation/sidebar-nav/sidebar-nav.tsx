import { Dot, Undo2 } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router'

import { Separator } from '@/components/ui/separator'
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
  useSidebar
} from '@/components/ui/sidebar'

import { useWorkspace } from '@/hooks/use-workspace'
import { UserNav } from '../user-nav'
import { WorkspaceNav } from '../workspace-nav'

export function SidebarNav() {
  const location = useLocation()
  const workspace = useWorkspace()
  const { setOpenMobile } = useSidebar()

  const params = useParams()

  const isSettingsPage = params['*']?.split('/')[0] === 'settings'

  if (isSettingsPage) {
    return (
      <Sidebar>
        <SidebarHeader>
          <SidebarMenuButton asChild>
            <Link to={`/${workspace.slug}/dashboard`}>
              <Undo2 className="size-4" />
              <p className="flex-1 text-start font-medium text-foreground">{'GoBack'}</p>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceNav />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="">{'Workspace'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* <CommandMenu /> */}

              <SidebarMenuItem key="dashboard">
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith(`/${workspace.slug}/dashboard`)}
                >
                  <Link
                    className="font-medium"
                    key={1}
                    to={`/${workspace.slug}/dashboard`}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Dot />
                    {'Dashboard'}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 pb-4">
        <Separator className="border-dashed" />
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}
