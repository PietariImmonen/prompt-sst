import * as React from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  const handleRegister = () => {
    // TODO: Implement actual registration logic
    console.log("Register clicked");
  };

  return (
    <div className="flex min-h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Account
          </h1>
          <p>Create your account to get started</p>
        </div>
        <div className="space-y-6 pb-10">
          {error && (
            <div className="text-red-500 text-sm text-center">
              An error occurred during registration
            </div>
          )}
          <Button onClick={handleRegister} className="w-full">
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
}
