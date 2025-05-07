import * as React from "react";
import {
  createSearchParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export function CallbackPage() {
  const { t } = useLocale();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  React.useEffect(() => {
    if (errorDescription === "no_account") {
      navigate({
        pathname: "/auth/login",
        search: createSearchParams({
          error: "no_account",
          timestamp: new Date().getTime().toString(),
        }).toString(),
      });
    }
  }, [errorDescription, navigate]);

  if (error) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4">
        <p className="max-w-lg text-center text-secondary-foreground">
          {error === "access_denied"
            ? t("auth:login.error.accessDenied")
            : t("auth:login.error.unknown")}
        </p>
        <Button asChild>
          <Link to={"/auth/login"}>{t("auth:action.backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4"></div>
  );
}
