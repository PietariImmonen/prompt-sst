import * as React from "react";

import { cn } from "@/lib/utils";

interface SingleColumnPageProps {
  children: React.ReactNode;
  className?: string;
}

export function SingleColumnPage({
  children,
  className,
}: SingleColumnPageProps) {
  return (
    <div className={cn("flex h-full flex-col gap-y-3", className)}>
      {children}
    </div>
  );
}
