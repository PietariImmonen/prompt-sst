import { Navigate } from "react-router";

import { useWorkspace } from "@/hooks/use-workspace";

export function PilotWorkspaceGate({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const workspace = useWorkspace();

  if (workspace.isPilotWorkspace === true) {
    return <Navigate to={to} replace />;
  }

  return children;
}
