import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionRowProps = {
  title: ReactNode | string | number;
  description?: string;
  value?: ReactNode | string | number | undefined;
  actions?: ReactNode;
};

export function SectionRow({
  title,
  description,
  value,
  actions,
}: SectionRowProps) {
  const isTitleStringOrNumber =
    typeof title === "string" || typeof title === "number" || !title;

  const isValueStringOrNumber =
    typeof value === "string" || typeof value === "number" || !value;

  return (
    <div
      className={cn(`grid w-full grid-cols-2 items-center gap-4 py-4`, {
        "grid-cols-[1fr_1fr_28px]": !!actions,
      })}
    >
      <div>
        {isTitleStringOrNumber ? (
          <p className="text-sm font-medium text-secondary-foreground">
            {title}
          </p>
        ) : (
          title
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {isValueStringOrNumber ? (
        <p className="text-sm text-secondary-foreground">{value ?? "-"}</p>
      ) : (
        <div className="flex flex-wrap gap-1">{value}</div>
      )}

      {actions && <div>{actions}</div>}
    </div>
  );
}
