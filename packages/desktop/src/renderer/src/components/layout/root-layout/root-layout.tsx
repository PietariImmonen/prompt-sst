import * as React from "react";
import { Toaster as HotToaster } from "react-hot-toast";

import { TailwindIndicator } from "./tailwind-indicator";

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh font-sans antialiased">
      {children}
      <TailwindIndicator />
      {/* <ThemeSelector /> */}
      <HotToaster
        toastOptions={{
          className: "",
          style: {
            fontSize: "0.875rem",
            lineHeight: "1.25rem",
            fontWeight: "500",
          },
        }}
      />
    </div>
  );
}
