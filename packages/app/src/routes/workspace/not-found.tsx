import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { usePageTitle } from "@/hooks/use-page-title";

export function NotFoundPage() {
  const { t } = useLocale();
  const navigate = useNavigate();

  const handleNavigateBack = () => {
    navigate("/");
  };

  usePageTitle({
    title: `${t("workspace:label.notFoundShort")} | SST Template Replicache`,
  });

  return (
    <div className="relative flex min-h-dvh flex-col">
      <main className="container flex h-full min-h-dvh flex-col gap-4 py-6">
        <header className="flex items-center justify-between">
          <Button variant={"ghost"} onClick={handleNavigateBack}>
            <ChevronLeft className="-ml-1 size-4" />
            {t("common:action.goBack")}
          </Button>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <h1 className="mb-10 text-lg">{t("workspace:label.notFound")}</h1>
        </div>
      </main>
    </div>
  );
}
