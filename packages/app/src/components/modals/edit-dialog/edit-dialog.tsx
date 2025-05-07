import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLocale } from "@/hooks/use-locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface EditDialogProps {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  form: string;
  className?: string;
}

export function EditDialog({
  title,
  children,
  open,
  onOpenChange,
  form,
  className,
}: EditDialogProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("h-[calc(100dvh-1rem)] px-0", className)}>
          <DrawerHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4">
            <DrawerTitle className="text-lg font-medium">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto">{children}</div>
          <DrawerFooter className="gap-2 border-t px-6 py-4">
            <DrawerClose asChild>
              <Button variant={"outline"} size={"sm"}>
                {t("common:action.cancel")}
              </Button>
            </DrawerClose>
            <Button type="submit" form={form} size={"sm"}>
              {t("common:action.save")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={cn(
          "flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0",
          className,
        )}
        aria-describedby={undefined}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b px-6 py-4">
          <DialogTitle className="text-lg font-medium">{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={"outline"}
              className="bg-secondary px-1 py-0 font-normal text-muted-foreground"
            >
              esc
            </Badge>
            <DialogClose asChild>
              <Button size={"icon"} variant={"ghost"} className="m-0">
                <X className="size-4 text-muted-foreground" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <DialogFooter className="gap-2 border-t px-6 py-4 sm:space-x-0">
          <DialogClose asChild>
            <Button variant={"outline"} size={"sm"}>
              {t("common:action.cancel")}
            </Button>
          </DialogClose>
          <Button type="submit" form={form} size={"sm"}>
            {t("common:action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
