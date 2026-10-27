import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-input-border bg-paper px-3 py-1 text-body text-ink transition-colors duration-150 ease-out file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-caption file:font-medium file:text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rust md:h-10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
