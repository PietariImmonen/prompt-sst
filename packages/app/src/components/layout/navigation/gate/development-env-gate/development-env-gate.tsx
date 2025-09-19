import { Navigate } from "react-router";

export function DevelopmentEnvGate({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  if (import.meta.env.VITE_STAGE === "production") {
    return <Navigate to={to} replace />;
  }

  return children;
}
