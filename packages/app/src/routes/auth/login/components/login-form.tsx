import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@openauthjs/openauth/client";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Google } from "@/components/ui/icons";
import { useLocale } from "@/hooks/use-locale";

const client = createClient({
  clientID: "web",
  issuer: import.meta.env.VITE_AUTH_URL,
});

const UserAuthSchema = z.object({
  email: z.string().email(),
});

export function LoginForm() {
  const form = useForm<z.infer<typeof UserAuthSchema>>({
    resolver: zodResolver(UserAuthSchema),
    defaultValues: {
      email: "",
    },
  });

  const { t } = useLocale();

  const [isLoading, setIsLoading] = React.useState<
    "code" | "google" | "microsoft" | false
  >(false);

  return (
    <Form {...form}>
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
          <span>{t("auth:login.helpers.noAccount")}</span>
          <a
            href={`/auth/register`}
            className="text-primary underline underline-offset-4"
          >
            {t("auth:register.action")}
          </a>
        </div>
      </div>
    </Form>
  );
}
