import * as React from "react";
import { createClient } from "@openauthjs/openauth/client";

import { Button } from "@/components/ui/button";
import { Google } from "@/components/ui/icons";
import { useLocale } from "@/hooks/use-locale";

const client = createClient({
  clientID: "web",
  issuer: import.meta.env.VITE_AUTH_URL,
});

export function RegisterForm() {
  const { t } = useLocale();

  const [isLoading, setIsLoading] = React.useState<"google" | false>(false);

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Button
          size={"lg"}
          type="button"
          variant={"outline"}
          onClick={async () => {
            setIsLoading("google");
            const { url } = await client.authorize(
              location.origin + "/auth/callback",
              "token",
              { provider: "google" },
            );

            location.href = url;
          }}
          disabled={isLoading === "google"}
        >
          <Google className="size-4" />
          Google
        </Button>
      </div>

      <div className="flex justify-center gap-1 text-sm">
        <span>{t("auth:register.helpers.alreadyRegistered")}</span>
        <a
          href={`/auth/login`}
          className="text-primary underline underline-offset-4"
        >
          {t("auth:code.action")}
        </a>
      </div>
    </div>
  );
}
