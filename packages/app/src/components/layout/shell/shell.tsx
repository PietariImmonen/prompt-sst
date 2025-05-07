import * as React from "react";

import { cn } from "@/lib/utils";

function Main({ children, className }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("min-h-0 overflow-y-auto", className)}>{children}</div>
  );
}

function Sidebar({
  children,
  className,
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "hidden h-dvh flex-1 overflow-y-auto border-l border-border px-6 py-4 xl:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Root(props: {
  children: React.ReactNode;
  header?: React.ReactNode;
}) {
  const childrenArray = React.Children.toArray(props.children);

  const [main, sidebar] = childrenArray;

  return (
    <div className="flex h-dvh max-h-dvh flex-1 flex-col">
      <div
        className={cn(
          "grid min-h-0 flex-auto",
          sidebar && "xl:grid-cols-[1fr_380px]",
        )}
      >
        <div className="grid min-h-0 flex-1 grow basis-[640px] grid-rows-[auto_1fr]">
          {props.header}
          {main}
        </div>
        {sidebar}
      </div>
    </div>
  );
}

export const Shell = Object.assign(Root, { Main, Sidebar });
