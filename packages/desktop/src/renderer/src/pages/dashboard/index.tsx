import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useReplicache } from "@/hooks/use-replicache";
import { useSubscribe } from "@/hooks/use-replicache";
import { useWorkspace } from "@/hooks/use-workspace";
import { UserStore } from "@/data/user-store";
import { WorkspaceStore } from "@/data/workspace-store";

import type { Workspace } from "@sst-replicache-template/core/models/Workspace";

type DashboardPageProps = {
  workspaces: Workspace[];
  activeWorkspaceID: string;
  onWorkspaceChange: (workspaceID: string) => void;
};

export default function DashboardPage(props: DashboardPageProps) {
  const { workspaces, activeWorkspaceID, onWorkspaceChange } = props;
  const workspace = useWorkspace();
  const replicache = useReplicache();

  const members = useSubscribe(UserStore.list(), { default: [] });
  const allWorkspaces = useSubscribe(WorkspaceStore.list(), { default: workspaces });

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-[#0E111A] px-6 py-8 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{workspace.name}</h1>
          <p className="text-sm text-white/60">
            Workspace slug: <span className="font-mono text-white/80">{workspace.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={activeWorkspaceID} onValueChange={onWorkspaceChange}>
            <SelectTrigger className="w-[220px] border-white/20 bg-white/5 text-left text-white">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#111827] text-white">
              {allWorkspaces.map((item) => (
                <SelectItem key={item.id} value={item.id} className="focus:bg-white/10">
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => replicache.pull()}
          >
            Sync now
          </Button>
        </div>
      </header>

      <main className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Workspace Activity</CardTitle>
            <CardDescription className="text-white/60">
              Replicache keeps this view in sync with the Prompt SST backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <span>Workspace ID</span>
              <code className="font-mono text-xs text-white/60">{workspace.id}</code>
            </div>
            <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <span>Last updated</span>
              <span>
                {workspace.timeUpdated
                  ? formatDistanceToNow(new Date(workspace.timeUpdated), {
                      addSuffix: true,
                    })
                  : "n/a"}
              </span>
            </div>
            <Separator className="bg-white/10" />
            <p className="text-xs text-white/60">
              Mutations authored here are replicated through the same push/pull endpoints as the web client. Use the
              buttons below to test optimistic updates and conflict resolution.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription className="text-white/60">Live list backed by Replicache.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-white/60">No members synced yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {members.map((member) => (
                  <li
                    key={member.id}
                    className="rounded-md border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-xs text-white/60">{member.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
