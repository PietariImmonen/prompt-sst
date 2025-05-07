import * as React from "react";

import { cn } from "@/lib/utils";

export function Section(props: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("divide-y border-y border-border", props.className)}>
      {props.children}
    </div>
  );
}
