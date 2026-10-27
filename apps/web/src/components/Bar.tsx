import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const numberFormat = new Intl.NumberFormat("es-CU");
const percentFormat = new Intl.NumberFormat("es-CU", {
  maximumFractionDigits: 1,
});

export interface BarProps {
  /** What the bar measures; always shown as text. */
  label: string;
  value: number;
  /** The scale's maximum: the fill is `value / scaleMax` of the track. */
  scaleMax: number;
  /** `rust` is only for incomplete answers (REQ-BRAND-010). */
  tone?: "teal" | "rust";
  /** Optional percentage shown after the value, e.g. "25 (40 %)". */
  percent?: number;
  /** Width of the label column (any CSS length). */
  labelWidth?: string;
  /** Width of the value column; equal widths keep tracks equal in length. */
  valueWidth?: string;
  className?: string;
}

// One data bar (REQ-BRAND-028): label, 8 px track with its fill, and the
// value as text. HTML and CSS only; the graphic is hidden from assistive
// technology because the label and the value already carry the data.
export default function Bar({
  label,
  value,
  scaleMax,
  tone = "teal",
  percent,
  labelWidth = "7rem",
  valueWidth,
  className,
}: BarProps) {
  const labelRef = useRef<HTMLSpanElement>(null);
  // The label moves to its own line when it does not fit its column. The
  // column has a fixed width, so the check depends on the label text only.
  const [overflowing, setOverflowing] = useState(false);
  const [measured, setMeasured] = useState(label);
  if (measured !== label) {
    setMeasured(label);
    setOverflowing(false);
  }
  useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el || overflowing) return;
    const check = () => {
      if (el.scrollWidth > el.clientWidth) setOverflowing(true);
    };
    check();
    // Crossing md changes the label's box: check again then.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [label, overflowing]);

  const ratio = scaleMax > 0 ? Math.min(Math.max(value / scaleMax, 0), 1) : 0;
  const hasPercent = percent !== undefined;

  return (
    <div
      data-slot="bar"
      style={
        {
          "--bar-label": labelWidth,
          "--bar-value": valueWidth ?? (hasPercent ? "6.5rem" : "3rem"),
        } as CSSProperties
      }
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_var(--bar-value)] items-center gap-x-3 gap-y-1",
        !overflowing &&
          "md:grid-cols-[var(--bar-label)_minmax(0,1fr)_var(--bar-value)]",
        className,
      )}
    >
      <span
        ref={labelRef}
        className={cn(
          "col-span-2 text-caption text-ink-muted",
          !overflowing && "md:col-span-1 md:overflow-hidden md:whitespace-nowrap",
        )}
      >
        {label}
      </span>
      <span aria-hidden="true" className="relative block h-2 bg-rule">
        {ratio > 0 && (
          <span
            className={cn(
              "absolute inset-y-0 left-0 block",
              tone === "rust" ? "bg-rust" : "bg-teal",
            )}
            style={{ width: `${ratio * 100}%` }}
          />
        )}
      </span>
      <span className="figures text-right text-caption text-ink">
        {numberFormat.format(value)}
        {hasPercent && (
          <span className="text-ink-muted">
            {" "}
            ({percentFormat.format(percent)} %)
          </span>
        )}
      </span>
    </div>
  );
}
