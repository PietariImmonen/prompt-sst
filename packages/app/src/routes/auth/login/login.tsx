import * as React from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router";

import { useLocale } from "@/hooks/use-locale";
import { usePageTitle } from "@/hooks/use-page-title";
import { LoginForm } from "./components/login-form";

export function LoginPage() {
  const { t } = useLocale();

  usePageTitle({
    title: `${t("auth:login.title")} | SST Template Replicache`,
  });

  const [searchParams] = useSearchParams();

  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect");
  const timestamp = searchParams.get("timestamp");

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (error && timestamp) {
      const currentTime = new Date().getTime();
      if (currentTime - Number(timestamp) < 30000) {
        timeout = setTimeout(() => {
          switch (error) {
            case "no_account":
              return toast.error(t("auth:login.error.noAccount"), {
                position: "bottom-right",
                duration: 8000,
              });
            case "invalid_claims":
              return toast.error(t("auth:login.error.invalidClaims"), {
                position: "bottom-right",
                duration: 8000,
              });
            default:
              return toast.error(t("auth:login.error.unknown"), {
                position: "bottom-right",
                duration: 8000,
              });
          }
        }, 100);
      }
    }

    return () => clearTimeout(timeout);
  }, [error, timestamp, t, redirect]);

  return (
    <div className="flex min-h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth:login.title")}
          </h1>
          <p>{t("auth:login.description")}</p>
        </div>
        <div className="space-y-6 pb-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
