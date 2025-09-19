import * as React from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  const handleLogin = () => {
    // TODO: Implement actual login logic
    console.log("Login clicked");
  };

  return (
    <div className="flex min-h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign In
          </h1>
          <p>Enter your credentials to access your account</p>
        </div>
        <div className="space-y-6 pb-10">
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error === "no_account" 
                ? "No account found with these credentials"
                : "An error occurred during login"}
            </div>
          )}
          <Button onClick={handleLogin} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
