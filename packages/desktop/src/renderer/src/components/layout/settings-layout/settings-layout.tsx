import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocale } from "@/hooks/use-locale";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";
import { Shell } from "../shell";

interface SettingsLayoutProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsLayout({
  title,
  children,
  className,
}: SettingsLayoutProps) {
  const { t } = useLocale();

  usePageTitle({
    title: `${t("nav:settings.title")} | SST Template Replicache`,
  });

  return (
    <Shell
      header={
        <header className="flex shrink-0 items-center gap-1.5 border-b px-6 py-3.5">
          <SidebarTrigger className="-ml-1 text-muted-foreground" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{t("nav:settings.title")}</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
      }
    >
      <Shell.Main>
        <div
          className={cn(
            "mt-6 flex flex-col items-center px-6 py-3 sm:mx-12",
            className,
          )}
        >
          <div className="flex w-full max-w-3xl flex-col space-y-8">
            <h1 className="text-2xl font-medium">{title}</h1>
            {children}
          </div>
        </div>
      </Shell.Main>
    </Shell>
  );
}
