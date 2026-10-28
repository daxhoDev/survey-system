import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusLabel, { type Status } from "@/components/StatusLabel";
import StatusChip from "@/components/StatusChip";

describe("StatusLabel (REQ-BRAND-007, REQ-BRAND-030)", () => {
  it.each<[Status, string]>([
    ["Activa", "text-teal"],
    ["Aceptada", "text-teal"],
  ])("AC-BRAND-007-1 / AC-BRAND-030-2: %s is teal weight 600 text", (status, color) => {
    render(<StatusLabel status={status} />);
    const label = screen.getByText(status);
    expect(label).toHaveClass(color, "font-semibold");
    expect(label.className).not.toMatch(/\bbg-|rounded|border/);
  });

  it.each<Status>(["Inactiva", "Pendiente", "Revocada", "Caducada", "Bloqueada"])(
    "AC-BRAND-007-1 / AC-BRAND-030-2: %s is neutral text with no badge background",
    (status) => {
      render(<StatusLabel status={status} />);
      const label = screen.getByText(status);
      expect(label.className).toMatch(/\btext-ink(-muted)?\b/);
      expect(label.className).not.toMatch(/text-teal|text-rust|\bbg-|rounded|border/);
    },
  );

  it("AC-BRAND-030-2: Bloqueada is ink-muted text with a 16 px lock icon", () => {
    const { container } = render(<StatusLabel status="Bloqueada" />);
    expect(screen.getByText("Bloqueada")).toHaveClass("text-ink-muted");
    const icon = container.querySelector("svg")!;
    expect(icon).toHaveClass("lucide-lock", "size-4");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

describe("StatusChip (REQ-BRAND-030)", () => {
  it("AC-BRAND-030-1: selected is ink fill with paper text and aria-pressed=true; unselected is outlined", () => {
    const { rerender } = render(<StatusChip pressed>Activas</StatusChip>);
    const chip = screen.getByRole("button", { name: "Activas" });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveClass("bg-ink", "text-paper", "rounded-control");

    rerender(<StatusChip pressed={false}>Activas</StatusChip>);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip).toHaveClass("bg-transparent", "border-input-border", "text-ink", "rounded-control");
    expect(chip).not.toHaveClass("bg-ink");
  });
});

describe("StatusChip disabled (REQ-BRAND-018)", () => {
  it("a disabled chip shows not-allowed and has no hover change", () => {
    render(<StatusChip pressed={false} disabled>Todas</StatusChip>);
    const chip = screen.getByRole("button", { name: "Todas" });
    expect(chip).toHaveClass("disabled:cursor-not-allowed", "not-disabled:hover:bg-surface-subtle");
    expect(chip).not.toHaveClass("hover:bg-surface-subtle", "disabled:pointer-events-none");
  });
});
