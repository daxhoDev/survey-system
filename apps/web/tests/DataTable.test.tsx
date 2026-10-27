import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable, SortableHeader, type SortDirection } from "@/components/ui/data-table";

type Row = { name: string; count: number };
const data: Row[] = [
  { name: "Clima laboral", count: 12 },
  { name: "Comedor", count: 3 },
];

function Harness() {
  const [sort, setSort] = useState<SortDirection>("ascending");
  const columns: ColumnDef<Row>[] = [
    {
      accessorKey: "name",
      header: () => (
        <SortableHeader
          label="Nombre"
          sort={sort}
          onSort={() => setSort(sort === "ascending" ? "descending" : "ascending")}
        />
      ),
      meta: { label: "Nombre", sort },
    },
    { accessorKey: "count", header: "Respuestas", meta: { numeric: true } },
    { id: "actions", header: "Acciones", meta: { actions: true }, cell: () => <button>Acciones</button> },
  ];
  return <DataTable columns={columns} data={data} />;
}

describe("DataTable (REQ-BRAND-029)", () => {
  it("AC-BRAND-029-1: strong rule under the header, hairline rules between rows, no outer border, fill or radius; numeric columns right-aligned with tabular figures", () => {
    const { container } = render(<Harness />);

    const table = container.querySelector("table")!;
    expect(table.className).not.toMatch(/(^|\s)(border|border-(?!collapse)\S+|bg-\S+|rounded\S*)(\s|$)/);
    expect(container.querySelector("thead")).toHaveClass("[&_tr]:border-b", "[&_tr]:border-rule-strong");
    const bodyRow = container.querySelector("tbody tr")!;
    expect(bodyRow).toHaveClass("border-b", "border-rule", "hover:bg-surface-subtle");
    const header = screen.getByRole("columnheader", { name: "Respuestas" });
    expect(header).toHaveClass("text-small", "font-semibold", "text-ink-muted", "text-right");
    const cell = within(bodyRow as HTMLElement).getByText("12");
    expect(cell).toHaveClass("figures", "text-right", "py-[11px]", "px-3.5");
  });

  it("AC-BRAND-029-2: pressing a sortable header toggles aria-sort and the icon shows the direction", async () => {
    const { container } = render(<Harness />);
    const user = userEvent.setup();
    const header = () => container.querySelector("th[aria-sort]")!;

    expect(header()).toHaveAttribute("aria-sort", "ascending");
    expect(header().querySelector("svg")).toHaveClass("lucide-arrow-up");
    await user.click(screen.getByRole("button", { name: "Nombre" }));
    expect(header()).toHaveAttribute("aria-sort", "descending");
    expect(header().querySelector("svg")).toHaveClass("lucide-arrow-down");
    await user.click(screen.getByRole("button", { name: "Nombre" }));
    expect(header()).toHaveAttribute("aria-sort", "ascending");
  });

  it("AC-BRAND-029-3: below md each row is a stacked block: first column as title, the others as label–value lines, actions top right", () => {
    const { container } = render(<Harness />);

    const row = container.querySelector("tbody tr")!;
    expect(row).toHaveClass("max-md:flex", "max-md:flex-col", "max-md:relative");
    const [first, count, actions] = Array.from(row.querySelectorAll("td"));
    expect(first).toHaveClass("max-md:first:font-semibold", "max-md:first:before:hidden");
    expect(count).toHaveAttribute("data-label", "Respuestas");
    expect(count!.className).toContain("max-md:before:content-[attr(data-label)]");
    expect(actions).toHaveAttribute("data-actions", "true");
    expect(actions!.className).toMatch(/max-md:data-actions:absolute.*max-md:data-actions:top-1.*max-md:data-actions:right-0/);
    // No horizontal scroll container below md.
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass("md:overflow-x-auto");
    expect(container.querySelector('[data-slot="table-container"]')!.className).not.toMatch(/(^|\s)overflow-x-auto/);
  });

  it("shows the empty message when there is no data", () => {
    render(<DataTable columns={[{ accessorKey: "name", header: "Nombre" }]} data={[]} />);
    expect(screen.getByText("Sin resultados.")).toHaveClass("text-ink-muted");
  });
});
