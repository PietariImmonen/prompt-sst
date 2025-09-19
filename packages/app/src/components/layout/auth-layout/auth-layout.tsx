import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="mx-4 flex h-dvh max-h-dvh flex-col">
      <header className="flex h-14 w-full items-end">
        <div className="flex items-center justify-start gap-1.5">
          <p>LOGO</p>
        </div>
      </header>
      <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto pb-20">
        <Outlet />
      </div>
    </div>
  );
}
