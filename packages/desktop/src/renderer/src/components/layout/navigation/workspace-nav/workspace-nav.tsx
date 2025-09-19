import * as React from 'react'
import { Check, LogOut, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router'
import { dropAllDatabases } from 'replicache'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

import { useWorkspace } from '@/hooks/use-workspace'
import { cn } from '@/lib/utils'

export function WorkspaceNav() {
  const [isOpen, setIsOpen] = React.useState<boolean>(false)

  const auth = useAuth()
  const workspace = useWorkspace()

  const navigate = useNavigate()

  const { setOpenMobile } = useSidebar()

  const { t } = useLocale()

  const accountWorkspaces = Object.keys(auth.accounts).map((key) => {
    const account = auth.accounts[key]
    const email = account.email

    return { email, workspaces: account.workspaces }
  })

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="pl-0 hover:cursor-pointer data-[state=open]:bg-sidebar data-[state=open]:text-foreground">
          <Avatar
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'h-7 w-7 p-[2px] hover:bg-background hover:text-foreground'
            )}
          >
            <AvatarFallback className="rounded-sm p-0">
              <p className="text-sm font-semibold text-secondary-foreground">
                {workspace.name[0].toUpperCase()}
              </p>
            </AvatarFallback>
          </Avatar>
          <p className="flex-1 truncate text-start font-semibold text-foreground">
            {workspace.name}
          </p>
          <MoreHorizontal className="size-4 opacity-50" />
          <span className="sr-only">{t('nav:description.toggleAccountMenu')}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dropdown-content-width-same-as-its-trigger font-[450]">
        <DropdownMenuGroup>
          {accountWorkspaces.map((accountWorkspace) => (
            <DropdownMenuGroup key={accountWorkspace.email}>
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                {accountWorkspace.email}
              </DropdownMenuLabel>
              {accountWorkspace.workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  className="flex w-full items-center justify-between gap-2"
                  onSelect={() => {
                    setOpenMobile(false)
                    navigate(`/${w.slug}/dashboard`)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="flex size-4 items-center justify-center">
                      <AvatarFallback>
                        <p className="text-[10px] leading-none font-medium text-secondary-foreground">
                          {w.name[0].toUpperCase()}
                        </p>
                      </AvatarFallback>
                    </Avatar>
                    {w.name}
                  </div>
                  {w.id === workspace.id && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          ))}
          <DropdownMenuItem
            onSelect={async (event) => {
              event.preventDefault()
              await dropAllDatabases()
              auth.logout()
            }}
          >
            <LogOut className="size-4" />
            {t('nav:signOut')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
