import { cn } from "@/lib/utils";

// Interim wordmark (REQ-BRAND-021): every place that shows the logo renders
// this component, so the final logo (PH-BRAND-4) only changes this file.
// The "footer" variant (16 px, muted) is used only by the public answering
// page footer (REQ-FE-034).
export default function Logo({
  variant,
  className,
}: {
  variant?: "footer";
  className?: string;
}) {
  return (
    <span
      data-slot="logo"
      data-variant={variant}
      className={cn(
        "font-sans leading-none font-bold",
        variant === "footer"
          ? "text-[16px] text-ink-muted"
          : "text-[20px] text-ink",
        className,
      )}
    >
      Sondix
    </span>
  );
}
