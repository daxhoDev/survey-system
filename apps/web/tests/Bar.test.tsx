import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Bar from "@/components/Bar";

const track = (container: HTMLElement) =>
  container.querySelector('[data-slot="bar"] > [aria-hidden="true"]') as HTMLElement;

describe("Bar (REQ-BRAND-010, REQ-BRAND-028)", () => {
  it("AC-BRAND-028-1: value 25 on a scale of 100 fills 25% of the track; label and value are text", () => {
    const { container } = render(<Bar label="Completas" value={25} scaleMax={100} />);

    const fill = track(container).firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("25%");
    expect(screen.getByText("Completas")).toBeVisible();
    expect(screen.getByText("25")).toBeVisible();
  });

  it("AC-BRAND-028-2: value 0 shows an empty track and the text 0", () => {
    const { container } = render(<Bar label="Incompletas" value={0} scaleMax={100} tone="rust" />);

    expect(track(container)).toBeInTheDocument();
    expect(track(container).childElementCount).toBe(0);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("AC-BRAND-028-4: the track is hidden from assistive technology; label and value are exposed", () => {
    const { container } = render(<Bar label="Sí" value={3} scaleMax={10} percent={30} />);

    expect(track(container)).toHaveAttribute("aria-hidden", "true");
    const bar = container.querySelector('[data-slot="bar"]') as HTMLElement;
    // Accessible text of the bar: label, value and percentage only.
    const exposed = Array.from(bar.children)
      .filter((el) => el.getAttribute("aria-hidden") !== "true")
      .map((el) => el.textContent)
      .join(" ");
    expect(exposed.replace(/\s+/g, " ")).toBe("Sí 3 (30%)");
  });

  it("AC-BRAND-010-1: teal fill (rust for incomplete answers) on a rule track, 8 px tall, square ends", () => {
    const teal = render(<Bar label="Completas" value={5} scaleMax={10} />);
    const t = track(teal.container);
    expect(t).toHaveClass("h-2", "bg-rule");
    expect(t.className).not.toMatch(/rounded/);
    expect(t.firstElementChild).toHaveClass("bg-teal");
    teal.unmount();

    const rust = render(<Bar label="Incompletas" value={5} scaleMax={10} tone="rust" />);
    expect(track(rust.container).firstElementChild).toHaveClass("bg-rust");
  });

  it("REQ-BRAND-028: label is caption ink-muted; value is caption with tabular figures, right-aligned", () => {
    render(<Bar label="Completas" value={7} scaleMax={10} />);

    expect(screen.getByText("Completas")).toHaveClass("text-caption", "text-ink-muted");
    expect(screen.getByText("7")).toHaveClass("text-caption", "figures", "text-right");
  });

  it("caps the fill at the scale and never draws a negative bar", () => {
    const over = render(<Bar label="A" value={150} scaleMax={100} />);
    expect((track(over.container).firstElementChild as HTMLElement).style.width).toBe("100%");
    over.unmount();
    const empty = render(<Bar label="B" value={5} scaleMax={0} />);
    expect(track(empty.container).childElementCount).toBe(0);
  });

  it("AC-BRAND-028-5: value 25 with percentage 40 reads \"25 (40%)\", no space before %", () => {
    const { container } = render(<Bar label="Completas" value={25} scaleMax={100} percent={40} />);

    const bar = container.querySelector('[data-slot="bar"]') as HTMLElement;
    const value = bar.lastElementChild as HTMLElement;
    expect(value.textContent).toBe("25 (40%)");
    expect(value.textContent).not.toMatch(/[ \u00a0]%/);
  });
});
