import { cn } from "@/lib/utils";

// Interim wordmark (REQ-BRAND-021): every place that shows the logo renders
// this component, so the final logo (PH-BRAND-4) only changes this file.
export default function Logo({ className }: { className?: string }) {
  return (
    <span
      data-slot="logo"
      className={cn(
        "font-sans text-[20px] leading-none font-bold text-ink",
        className,
      )}
    >
      Sondix
    </span>
  );
}
