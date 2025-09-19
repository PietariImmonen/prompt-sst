import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkspaceCreate() {
  const [name, setName] = React.useState("");

  const handleCreate = () => {
    // TODO: Implement actual workspace creation logic
    console.log("Create workspace:", name);
  };

  return (
    <div className="flex h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Workspace
          </h1>
          <p className="text-center">Create a new workspace to get started</p>
        </div>
        <div className="space-y-6 pb-10">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="Enter workspace name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={!name.trim()}>
            Create Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
