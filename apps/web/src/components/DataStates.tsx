import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

// Loading, empty and error states of data views (REQ-BRAND-033).

/** Whole-page loading: a single line of muted text. */
export function LoadingLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p role="status" className={cn("text-body text-ink-muted", className)}>
      {children}
    </p>
  );
}

/**
 * Data-view loading: static 8 px rule bars in the shape of the content, one
 * per entry of `widths` (any CSS width). No shimmer.
 */
export function SkeletonRules({
  widths = ["100%", "100%", "100%", "100%"],
  label = "Cargando...",
  className,
}: {
  widths?: string[];
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex flex-col gap-4 py-2", className)}
    >
      {widths.map((width, i) => (
        <Skeleton key={i} style={{ width }} />
      ))}
    </div>
  );
}

/** No data: one muted line, plus the next action when there is one. */
export function EmptyState({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      <p className="text-body text-ink-muted">{children}</p>
      {action}
    </div>
  );
}

/** Failed request: one rust line with an icon, plus "Reintentar". */
export function ErrorState({
  children,
  onRetry,
  retrying = false,
  className,
}: {
  children: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 py-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-body text-rust">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {children}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} loading={retrying}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
