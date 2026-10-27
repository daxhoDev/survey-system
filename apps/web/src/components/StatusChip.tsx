import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Status filter chip (REQ-BRAND-030): a toggle button. Unselected it is
// outlined; selected it is filled with ink.
export default function StatusChip({
  pressed,
  className,
  ...props
}: Omit<ComponentProps<"button">, "aria-pressed"> & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-11 cursor-pointer items-center rounded-control border px-3 text-body font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 md:h-10",
        pressed
          ? "border-ink bg-ink text-paper"
          : "border-input-border bg-transparent text-ink not-disabled:hover:bg-surface-subtle",
        className,
      )}
      {...props}
    />
  );
}
