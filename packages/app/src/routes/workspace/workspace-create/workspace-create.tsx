import { useLocale } from "@/hooks/use-locale";
import { usePageTitle } from "@/hooks/use-page-title";
import { WorkspaceCreateForm } from "./components/workspace-create-form";

export function WorkspaceCreate() {
  const { t } = useLocale();

  usePageTitle({
    title: `${t("workspace:label.new")} | SST Template Replicache`,
  });

  return (
    <div className="flex h-full w-full max-w-none flex-1 flex-col items-center justify-center py-4">
      <div className="grid w-full max-w-sm gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("workspace:label.new")}
          </h1>
          <p className="text-center">{t("workspace:description.new")}</p>
        </div>
        <div className="space-y-6 pb-10">
          <WorkspaceCreateForm />
        </div>
      </div>
    </div>
  );
}
