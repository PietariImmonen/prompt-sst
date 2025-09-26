import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useReplicache } from '@/hooks/use-replicache'
import { useSubscribe } from '@/hooks/use-replicache'
import { useWorkspace } from '@/hooks/use-workspace'
import { UserStore } from '@/data/user-store'
import { WorkspaceStore } from '@/data/workspace-store'
import { PromptStore } from '@/data/prompt-store'

import type { Workspace } from '@prompt-saver/core/models/Workspace'
import type { Prompt } from '@prompt-saver/core/models/Prompt'

type DashboardPageProps = {
  workspaces: Workspace[]
  activeWorkspaceID: string
  onWorkspaceChange: (workspaceID: string) => void
}

export default function DashboardPage(props: DashboardPageProps) {
  const { workspaces, activeWorkspaceID, onWorkspaceChange } = props
  const workspace = useWorkspace()
  const replicache = useReplicache()

  const members = useSubscribe(UserStore.list(), { default: [] })
  const allWorkspaces = useSubscribe(WorkspaceStore.list(), { default: workspaces })
  const prompts = (useSubscribe(PromptStore.list(), {
    default: [] as Prompt[]
  }) ?? []) as Prompt[]

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-black px-6 py-8 text-foreground">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">
            Workspace slug: <span className="font-mono text-foreground/80">{workspace.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={activeWorkspaceID} onValueChange={onWorkspaceChange}>
            <SelectTrigger className="w-[220px] text-left">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {allWorkspaces.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => replicache.pull()}>
            Sync now
          </Button>
        </div>
      </header>

      <main className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Activity</CardTitle>
              <CardDescription>
                Replicache keeps this view in sync with the Prompt SST backend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span>Workspace ID</span>
                <code className="font-mono text-xs text-muted-foreground">{workspace.id}</code>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span>Last updated</span>
                <span>
                  {workspace.timeUpdated
                    ? formatDistanceToNow(new Date(workspace.timeUpdated), {
                        addSuffix: true
                      })
                    : 'n/a'}
                </span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Mutations authored here replicate through the same push/pull endpoints as the web
                client. Use the shortcut Cmd/Ctrl + Shift + P to capture prompts from anywhere.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Captured Prompts</CardTitle>
              <CardDescription>
                Auto-saved snippets appear here a moment after the shortcut fires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {prompts.length === 0 ? (
                <p className="text-muted-foreground">
                  No prompts captured yet. Highlight text and press Cmd/Ctrl + Shift + P.
                </p>
              ) : (
                <ul className="space-y-3">
                  {prompts.slice(0, 5).map((prompt) => (
                    <li
                      key={prompt.id}
                      className="rounded-md border border-border/60 bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{prompt.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {prompt.content.length > 120
                              ? `${prompt.content.slice(0, 120)}…`
                              : prompt.content}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p className="uppercase tracking-wide">{prompt.source}</p>
                          <p>
                            {prompt.timeCreated
                              ? formatDistanceToNow(new Date(prompt.timeCreated), {
                                  addSuffix: true
                                })
                              : 'syncing…'}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                  {prompts.length > 5 ? (
                    <li className="text-xs text-muted-foreground">
                      Showing latest 5 of {prompts.length} prompts.
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Live list backed by Replicache.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {members.length === 0 ? (
              <p className="text-muted-foreground">No members synced yet.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
