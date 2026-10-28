import { cn } from "@/lib/utils";

// Logo «Celda de anuario» (REQ-BRAND-021): a ruled cell holding a value bar
// on its track, under a short ink bar, next to the live-text wordmark.
// Every place that shows the logo renders this component. The "footer"
// variant (16 px, all muted, no teal) is used only by the public answering
// page footer (REQ-FE-034).
export default function Logo({
  variant,
  className,
}: {
  variant?: "footer";
  className?: string;
}) {
  const footer = variant === "footer";
  const ink = footer ? "fill-ink-muted" : "fill-ink";

  return (
    <span
      data-slot="logo"
      data-variant={variant}
      className={cn(
        "inline-flex items-center",
        footer ? "gap-[6px]" : "gap-[8px]",
        className,
      )}
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        focusable="false"
        className={cn(
          "shrink-0",
          footer ? "size-[16px]" : "size-[20px]",
        )}
      >
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          className={cn(
            "fill-none stroke-4",
            footer ? "stroke-ink-muted" : "stroke-ink",
          )}
        />
        <rect x="10" y="12" width="14" height="5" className={ink} />
        <rect x="10" y="28" width="28" height="8" className="fill-rule" />
        <rect
          x="10"
          y="28"
          width="19"
          height="8"
          className={footer ? "fill-ink-muted" : "fill-teal"}
        />
      </svg>
      <span
        className={cn(
          "font-sans font-bold tracking-[-0.02em]",
          footer ? "text-[16px] text-ink-muted" : "text-[20px] text-ink",
          "leading-none",
        )}
      >
        Sondix
      </span>
    </span>
  );
}
