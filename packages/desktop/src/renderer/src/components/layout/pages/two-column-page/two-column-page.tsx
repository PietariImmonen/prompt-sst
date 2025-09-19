import * as React from "react";

import { cn } from "@/lib/utils";

interface TwoColumnPageProps {
  children: React.ReactNode;
}

function Root({ children }: TwoColumnPageProps) {
  const childrenArray = React.Children.toArray(children);

  if (childrenArray.length !== 2) {
    throw new Error("TwoColumnPage expects exactly two children");
  }

  const [main, sidebar] = childrenArray;

  return (
    <div className="flex w-full flex-col gap-y-3">
      <div className="flex w-full flex-col items-start gap-x-4 gap-y-3 xl:grid xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex w-full min-w-0 flex-col gap-y-3">{main}</div>
        <div className="flex w-full flex-col gap-y-3 xl:mt-0">{sidebar}</div>
      </div>
    </div>
  );
}

function Main({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex w-full flex-col gap-y-3", className)} {...props}>
      {children}
    </div>
  );
}

function Sidebar({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[440px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const TwoColumnPage = Object.assign(Root, { Main, Sidebar });
