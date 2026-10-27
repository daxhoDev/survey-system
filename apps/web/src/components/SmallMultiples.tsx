import type { ReactNode } from "react";
import { Link } from "react-router";
import Bar, { type BarProps } from "./Bar";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

export interface SmallMultipleCell {
  key: string;
  title: string;
  /** Optional destination: the title becomes a link to it. */
  href?: string;
  /** Optional headline figure of the cell (text-figure). */
  figure?: ReactNode;
  /** One labelled bar per measure, all on the row's common scale. */
  bars: Omit<BarProps, "scaleMax">[];
}

interface SmallMultiplesProps {
  /** Accessible name of the row. */
  label: string;
  cells: SmallMultipleCell[];
  /** The common scale's maximum, shared by every bar of every cell. */
  scaleMax: number;
  /** Caption under the row stating the scale, e.g. "Escala común: 0–100 respuestas". */
  caption: ReactNode;
  /** Cells per line from lg: 4 (dashboard) or 3 (statistics tab). */
  columns?: 3 | 4;
  /** Pending data: one line of skeleton cells instead of `cells`. */
  loading?: boolean;
  className?: string;
}

// Rules between cells and between lines, for 1 / 2 / 3-or-4 cells per line.
function cellRules(columns: 3 | 4) {
  return cn(
    "border-rule",
    // One per line below md.
    "max-md:not-first:border-t",
    // Two per line from md.
    "md:max-lg:even:border-l md:max-lg:nth-[n+3]:border-t",
    // Three or four per line from lg.
    columns === 4
      ? "lg:[&:not(:nth-child(4n+1))]:border-l lg:nth-[n+5]:border-t"
      : "lg:[&:not(:nth-child(3n+1))]:border-l lg:nth-[n+4]:border-t",
  );
}

// The signature move (REQ-BRAND-027): a ruled row of equal cells on one
// common scale. Strong rules above and below, hairline rules between cells
// and between lines; no fill, shadow or radius.
export default function SmallMultiples({
  label,
  cells,
  scaleMax,
  caption,
  columns = 4,
  loading = false,
  className,
}: SmallMultiplesProps) {
  const grid = cn(
    "grid grid-cols-1 border-y border-rule-strong md:grid-cols-2",
    columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
  );

  if (loading) {
    // Static rule bars in the shape of the cells (REQ-BRAND-033).
    return (
      <section
        aria-label={label}
        aria-busy="true"
        className={cn("flex flex-col gap-2", className)}
      >
        <ul role="status" aria-label="Cargando..." className={grid}>
          {Array.from({ length: columns }, (_, i) => (
            <li
              key={i}
              className={cn("flex min-w-0 flex-col gap-4 p-4", cellRules(columns))}
            >
              <Skeleton className="w-3/5" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="w-full" />
              <Skeleton className="w-full" />
            </li>
          ))}
        </ul>
        <Skeleton className="my-1 w-48" />
      </section>
    );
  }

  return (
    <section aria-label={label} className={cn("flex flex-col gap-2", className)}>
      <ul className={grid}>
        {cells.map((cell) => (
          <li
            key={cell.key}
            className={cn("flex min-w-0 flex-col gap-3 p-4", cellRules(columns))}
          >
            <h3
              title={cell.title}
              className="line-clamp-2 text-body font-semibold break-words text-ink"
            >
              {cell.href ? (
                <Link
                  to={cell.href}
                  className="text-ink underline decoration-rule-strong underline-offset-3 transition-colors duration-150 ease-out hover:decoration-ink"
                >
                  {cell.title}
                </Link>
              ) : (
                cell.title
              )}
            </h3>
            {cell.figure !== undefined && (
              <p className="figures text-figure text-ink">{cell.figure}</p>
            )}
            <div className="flex flex-col gap-2">
              {cell.bars.map((bar) => (
                <Bar key={bar.label} {...bar} scaleMax={scaleMax} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-caption text-ink-muted">{caption}</p>
    </section>
  );
}
