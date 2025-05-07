import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

interface EditSheetProps {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  form: string;
  className?: string;
}

export function EditSheet({
  title,
  children,
  open,
  onOpenChange,
  form,
  className,
}: EditSheetProps) {
  const { t } = useLocale();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn("gap-0 p-0", className)}
        aria-describedby={undefined}
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4">
          <SheetTitle className="text-lg font-normal">{title}</SheetTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={"outline"}
              className="bg-secondary px-1 py-0 font-normal text-muted-foreground"
            >
              esc
            </Badge>
            <SheetClose asChild>
              <Button size={"icon"} variant={"ghost"} className="m-0">
                <X className="size-4 text-muted-foreground" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <ScrollArea className="flex h-full flex-1 flex-col overflow-y-auto">
          {children}
        </ScrollArea>
        <SheetFooter className="gap-2 border-t px-6 py-4 sm:space-x-0">
          <SheetClose asChild>
            <Button variant={"outline"} size={"sm"}>
              {t("common:action.cancel")}
            </Button>
          </SheetClose>
          <Button type="submit" form={form} size={"sm"}>
            {t("common:action.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
