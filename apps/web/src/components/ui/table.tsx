import * as React from "react"

import { cn } from "@/lib/utils"

// Dense ruled tables (REQ-BRAND-029): no outer border, fill or radius; a
// strong rule under the header and hairline rules between rows. Below md
// every row becomes a stacked block: the first cell is the row title, the
// other cells are label–value lines (label from `data-label`), and a cell
// marked `data-actions` sits at the top right of the block.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full md:overflow-x-auto">
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-collapse text-body max-md:block",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "max-md:block [&_tr]:border-b [&_tr]:border-rule-strong [&_tr]:hover:bg-transparent max-md:[&_tr]:flex max-md:[&_tr]:flex-wrap max-md:[&_tr]:gap-x-2 max-md:[&_tr]:py-1",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("max-md:block", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-rule-strong font-semibold max-md:block",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-rule transition-colors duration-150 ease-out hover:bg-surface-subtle has-aria-expanded:bg-surface-subtle data-[state=selected]:bg-teal-tint max-md:relative max-md:flex max-md:flex-col max-md:gap-1 max-md:py-3",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-3.5 py-2.5 text-left align-bottom text-small font-semibold whitespace-nowrap text-ink-muted max-md:block max-md:px-0 max-md:py-1 max-md:[&:not([aria-sort])]:hidden [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3.5 py-[11px] align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        // Stacked rows below md.
        "max-md:flex max-md:items-baseline max-md:gap-3 max-md:p-0 max-md:text-left max-md:whitespace-normal max-md:before:w-2/5 max-md:before:shrink-0 max-md:before:text-small max-md:before:text-ink-muted max-md:before:content-[attr(data-label)]",
        "max-md:first:pr-12 max-md:first:font-semibold max-md:first:before:hidden",
        "max-md:data-actions:absolute max-md:data-actions:top-1 max-md:data-actions:right-0 max-md:data-actions:before:hidden",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 text-left text-caption text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
