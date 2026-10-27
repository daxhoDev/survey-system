import {
  type ColumnDef,
  type RowData,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "ascending" | "descending" | "none";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Plain-text column name: the label of the value lines below md. */
    label?: string;
    /** Counts and dates: right-aligned, tabular figures. */
    numeric?: boolean;
    /** Sort state of a sortable column, exposed as `aria-sort`. */
    sort?: SortDirection;
    /** The row's actions menu: top right of the stacked row below md. */
    actions?: boolean;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
}

// Data table on @tanstack/react-table, styled as REQ-BRAND-029.
export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "Sin resultados.",
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta;
              return (
                <TableHead
                  key={header.id}
                  aria-sort={meta?.sort}
                  className={cn(meta?.numeric && "text-right max-md:text-left")}
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
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
            >
              {row.getVisibleCells().map((cell) => {
                const def = cell.column.columnDef;
                const label =
                  def.meta?.label ??
                  (typeof def.header === "string" ? def.header : undefined);
                return (
                  <TableCell
                    key={cell.id}
                    data-label={label}
                    data-actions={def.meta?.actions || undefined}
                    className={cn(
                      def.meta?.numeric && "figures text-right",
                      def.meta?.actions && "md:w-px",
                    )}
                  >
                    {flexRender(def.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        ) : (
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              className="py-6 whitespace-normal text-ink-muted max-md:before:hidden"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

interface SortableHeaderProps {
  label: string;
  sort: SortDirection;
  onSort: () => void;
}

// Sortable column header: a button whose icon shows the sort direction; the
// header cell carries the matching `aria-sort` (column `meta.sort`).
export function SortableHeader({ label, sort, onSort }: SortableHeaderProps) {
  const Icon =
    sort === "ascending"
      ? ArrowUp
      : sort === "descending"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-mx-3 text-small font-semibold text-ink-muted hover:text-ink max-md:-mx-0 max-md:px-2"
      onClick={onSort}
    >
      {label}
      <Icon aria-hidden="true" />
    </Button>
  );
}
