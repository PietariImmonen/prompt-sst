import * as React from "react";

export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 flex h-dvh max-h-dvh flex-col">
      <header className="flex h-14 w-full items-end">
        <div className="flex items-center justify-start gap-1.5">
          <p>LOGO</p>
        </div>
      </header>
      <main className="h-[calc(100dvh-3.5rem)] overflow-y-auto pb-20">
        {children}
      </main>
    </div>
  );
}
