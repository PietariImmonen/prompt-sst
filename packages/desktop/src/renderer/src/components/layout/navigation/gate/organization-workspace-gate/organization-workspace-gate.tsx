import { Navigate } from "react-router";

import { useWorkspace } from "@/hooks/use-workspace";

export function OrganizationWorkspaceGate({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const workspace = useWorkspace();

  if (workspace.type !== "organization") {
    return <Navigate to={to} replace />;
  }

  return children;
}
