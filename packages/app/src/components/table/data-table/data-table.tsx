import {
  ColumnDef,
  flexRender,
  Table as TableType,
} from "@tanstack/react-table";
import { Link, useNavigate } from "react-router";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  href: string;
  link?: boolean;
  table: TableType<TData>;
  columns: ColumnDef<TData, TValue>[];
  hideHeader?: boolean;
  cellStyle?: string;
  renderLinkCondition?: (row: TData) => boolean;
}

export function DataTable<TData extends { id: string }, TValue>({
  table,
  columns,
  href,
  link = true,
  hideHeader = false,
  cellStyle,
  renderLinkCondition,
}: DataTableProps<TData, TValue>) {
  const navigate = useNavigate();
  const { t } = useLocale();

  return (
    <div>
      <Table>
        {!hideHeader && (
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="group hover:bg-transparent focus-visible:bg-transparent data-[state=selected]:bg-transparent [&_th:first-child]:pl-6 [&_th:last-child]:pr-6"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="group px-3 py-4 transition-colors group-focus-visible:outline-hidden data-[state=selected]:bg-muted"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
        )}
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                tabIndex={0}
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(
                  "group focus-visible:bg-muted/50 focus-visible:ring-0 focus-visible:outline-none",
                  {
                    "cursor-pointer":
                      link &&
                      (!renderLinkCondition ||
                        renderLinkCondition(row.original)),
                  },
                )}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !(
                      e.target instanceof HTMLElement &&
                      e.target.closest("button")
                    )
                  ) {
                    navigate(href + row.original.id);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className="group h-1 p-0 transition-colors group-focus-visible:outline-hidden data-[state=selected]:bg-muted"
                    key={cell.id}
                  >
                    {link &&
                    (!renderLinkCondition ||
                      renderLinkCondition(row.original)) ? (
                      <Link
                        className={cn(
                          "flex size-full min-h-10 items-center px-3 py-2 break-words focus-visible:ring-0 focus-visible:outline-none",
                          cellStyle,
                        )}
                        to={href + row.original.id}
                        tabIndex={-1}
                      >
                        <div className="w-full break-words">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div
                        className={cn(
                          "flex size-full min-h-10 items-center px-3 py-2 break-words",
                          cellStyle,
                        )}
                      >
                        <div className="w-full break-words">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <p className="text-sm">{t("common:noSearchResults")}</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
