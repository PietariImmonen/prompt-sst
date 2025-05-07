import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
// Re-add necessary auth components and utilities
import { AuthLayout } from "./components/layout/auth-layout";
import { RootLayout } from "./components/layout/root-layout";
import { AuthProvider } from "./providers/auth-provider";
import { authStore } from "./providers/auth-provider/auth-context";
import { ThemeProvider } from "./providers/theme-provider";
import { CallbackPage } from "./routes/auth/callback";

import "./globals.css";

import { OnboardingLayout } from "./components/layout/onboarding-layout";
import { SingleColumnPage } from "./components/layout/pages/single-column-page";
import { Shell } from "./components/layout/shell";
import { WorkspaceLayout } from "./components/layout/workspace-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "./components/ui/breadcrumb";
import { SidebarTrigger } from "./components/ui/sidebar";
import { workspaceStore } from "./providers/workspace-provider/workspace-context";
import { LoginPage } from "./routes/auth/login";
import { RegisterPage } from "./routes/auth/register";
import { WorkspaceCreate } from "./routes/workspace/workspace-create";

// import "./i18n";

// Router with dashboard and auth routes
const router = createBrowserRouter([
  {
    path: ":workspaceSlug",
    children: [
      {
        path: "*",
        element: <WorkspaceLayout />,
        children: [
          {
            path: "dashboard",
            element: (
              <Shell
                header={
                  <header className="flex w-full shrink-0 items-center justify-between border-b px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <SidebarTrigger className="-ml-1 text-muted-foreground lg:hidden" />
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbLink>Dashboard</BreadcrumbLink>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                    </div>
                  </header>
                }
              >
                <SingleColumnPage className="p-6">
                  <div>Hello Dashboard</div>
                </SingleColumnPage>
              </Shell>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/callback",
    element: <CallbackPage />,
  },
  {
    path: "auth",
    // Loader to redirect if already logged in
    loader: () => {
      const account = authStore.get();

      if (account?.current) {
        // Redirect to dashboard or original target
        // For now, redirecting to dashboard
        const redirectPath = `/dashboard`;
        // This client-side redirect might happen after rendering starts,
        // consider a server-side redirect or loader-based redirect if possible
        window.location.href = redirectPath;
        // Alternatively, use React Router's redirect function if setup allows
        // return redirect("/dashboard");
      }
      return {}; // Return null or {} if no redirect
    },
    element: <AuthLayout />,
    children: [
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
    ],
  },
  {
    path: "workspace",
    element: (
      <OnboardingLayout>
        <WorkspaceCreate />
      </OnboardingLayout>
    ),
  },

  {
    path: "*",
    loader: () => {
      const workspace = workspaceStore.get();

      if (workspace) {
        const redirectPath = `${import.meta.env.VITE_APP_URL}/${
          workspace.slug
        }/sessions`;

        window.location.href = redirectPath;
        return {};
      } else {
        // redirect to page, which says that given workspace is not found
      }
      return {};
    },
  },
  {
    path: "*",
    loader: () => {
      const redirectPath = `${import.meta.env.VITE_APP_URL}/workspace`;
      window.location.href = redirectPath;

      return {};
    },
  },
]);

const App = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <TooltipProvider delayDuration={0}>
          <RootLayout>
            <RouterProvider router={router} />
          </RootLayout>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<></>}>
      {" "}
      {/* Keep suspense if needed */}
      <App />
    </Suspense>
  </React.StrictMode>,
);
