import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

// Buttons (REQ-BRAND-018): 3 px radius, text-body weight 600, 44 px tall
// below md and 40 px from md. Disabled buttons show the not-allowed cursor
// and do not react to hover or press (hover/active styles need an enabled
// button).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent text-body font-semibold whitespace-nowrap transition-colors duration-150 ease-out select-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-teal text-on-teal not-disabled:hover:bg-teal-strong not-disabled:active:bg-teal-strong",
        outline:
          "border-input-border bg-transparent text-ink not-disabled:hover:bg-surface-subtle not-disabled:active:bg-surface-subtle aria-expanded:bg-surface-subtle",
        ghost:
          "bg-transparent text-ink not-disabled:hover:bg-surface-subtle not-disabled:active:bg-surface-subtle aria-expanded:bg-surface-subtle",
        destructive:
          "bg-rust text-on-rust not-disabled:hover:bg-rust-strong not-disabled:active:bg-rust-strong",
        link: "h-auto! border-0 px-0! text-teal underline underline-offset-3 decoration-1 not-disabled:hover:decoration-2 not-disabled:active:decoration-2",
      },
      size: {
        default: "h-11 px-4 md:h-10",
        // The documented height applies to every size; the smaller ones
        // only tighten the horizontal padding.
        xs: "h-11 px-2 md:h-10",
        sm: "h-11 px-3 md:h-10",
        lg: "h-11 px-5 md:h-10",
        icon: "size-11 md:size-10",
        "icon-xs": "size-11 md:size-10",
        "icon-sm": "size-11 md:size-10",
        "icon-lg": "size-11 md:size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Request in flight: spinner before the label, busy and disabled. */
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? (
        <>
          <LoaderCircle aria-hidden="true" data-slot="button-spinner" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
