import * as React from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router";

import { useLocale } from "@/hooks/use-locale";
import { usePageTitle } from "@/hooks/use-page-title";
import { RegisterForm } from "./components/register-form";

export function RegisterPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  usePageTitle({
    title: `${t("auth:login.title")} | SST Template Replicache`,
  });

  const error = searchParams.get("error");
  const timestamp = searchParams.get("timestamp");

  React.useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (error && timestamp) {
      const currentTime = new Date().getTime();
      if (currentTime - Number(timestamp) < 30000) {
        timeout = setTimeout(() => {
          switch (error) {
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
  }, [error, timestamp, t]);

  return (
    <div className="flex min-h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("auth:register.title")}
          </h1>
          <p>{t("auth:register.description")}</p>
        </div>
        <div className="space-y-6 pb-10">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
