import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SmallMultiples from "@/components/SmallMultiples";

const cells = [
  { key: "a", title: "Clima laboral", figure: 40, bars: [{ label: "Respuestas", value: 40 }] },
  { key: "b", title: "Comedor", figure: 80, bars: [{ label: "Respuestas", value: 80 }] },
];

function renderRow(columns?: 3 | 4) {
  return render(
    <SmallMultiples
      label="Encuestas activas"
      cells={cells}
      scaleMax={100}
      caption="Escala común: 0–100 respuestas"
      columns={columns}
    />,
  );
}

describe("SmallMultiples (REQ-BRAND-027)", () => {
  it("AC-BRAND-027-2: on a common 0–100 scale, 80 draws twice the bar of 40, with equal tracks", () => {
    const { container } = renderRow();

    const fills = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="bar"] > [aria-hidden="true"] > span'),
    ).map((el) => parseFloat(el.style.width));
    expect(fills).toEqual([40, 80]);
    expect(fills[1]! / fills[0]!).toBe(2);
    // Equal track length: every bar has the same label and value columns.
    const bars = Array.from(container.querySelectorAll<HTMLElement>('[data-slot="bar"]'));
    const columns = new Set(
      bars.map((b) => `${b.style.getPropertyValue("--bar-label")}|${b.style.getPropertyValue("--bar-value")}`),
    );
    expect(columns.size).toBe(1);
  });

  it("AC-BRAND-027-3: a named <section> holding a <ul> with one <li> per cell, and a caption with the scale", () => {
    renderRow();

    const section = screen.getByRole("region", { name: "Encuestas activas" });
    expect(section.tagName).toBe("SECTION");
    const list = within(section).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    const caption = within(section).getByText("Escala común: 0–100 respuestas");
    expect(caption).toHaveClass("text-caption", "text-ink-muted");
    expect(list.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("AC-BRAND-027-1: 4 / 2 / 1 cells per line (3 / 2 / 1 for statistics), strong rules above and below, hairline rules between, no fill, shadow or radius", () => {
    const { container, unmount } = renderRow();
    const list = container.querySelector("ul")!;
    expect(list).toHaveClass("grid-cols-1", "md:grid-cols-2", "lg:grid-cols-4", "border-y", "border-rule-strong");
    expect(list.className).not.toMatch(/\bbg-|shadow|rounded/);
    const cell = container.querySelector("li")!;
    expect(cell).toHaveClass("border-rule", "p-4");
    expect(cell.className).toMatch(/max-md:not-first:border-t/);
    expect(cell.className).toMatch(/md:max-lg:even:border-l/);
    expect(cell.className).toMatch(/lg:\[&:not\(:nth-child\(4n\+1\)\)\]:border-l/);
    expect(cell.className).not.toMatch(/\bbg-|shadow|rounded/);
    unmount();

    const stats = renderRow(3);
    expect(stats.container.querySelector("ul")).toHaveClass("lg:grid-cols-3");
  });

  it("REQ-BRAND-027: cell title is body semibold, clamped to two lines with the full text as title; figure uses text-figure", () => {
    renderRow();

    const title = screen.getByText("Clima laboral");
    expect(title).toHaveClass("text-body", "font-semibold", "line-clamp-2");
    expect(title).toHaveAttribute("title", "Clima laboral");
    expect(screen.getByText("40", { selector: "p" })).toHaveClass("text-figure", "figures");
  });
});
