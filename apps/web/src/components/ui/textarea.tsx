import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-control border border-input-border bg-paper px-3 py-2 text-body text-ink transition-colors duration-150 ease-out placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rust",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
