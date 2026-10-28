import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "@/components/ui/button";

describe("Button (REQ-BRAND-018)", () => {
  it("AC-BRAND-018-1: the five documented variants carry the colors of the table", () => {
    expect(buttonVariants({ variant: "default" })).toMatch(/bg-teal\b.*text-on-teal.*hover:bg-teal-strong/);
    expect(buttonVariants({ variant: "outline" })).toMatch(/border-input-border.*bg-transparent.*text-ink.*hover:bg-surface-subtle/);
    expect(buttonVariants({ variant: "ghost" })).toMatch(/bg-transparent.*text-ink.*hover:bg-surface-subtle/);
    expect(buttonVariants({ variant: "ghost" })).not.toMatch(/border-input-border/);
    expect(buttonVariants({ variant: "link" })).toMatch(/text-teal.*underline-offset-3.*hover:decoration-2/);
    expect(buttonVariants({ variant: "destructive" })).toMatch(/bg-rust\b.*text-on-rust.*hover:bg-rust-strong/);
  });

  it("REQ-BRAND-018: 3 px radius, text-body weight 600, 44 px below md and 40 px from md", () => {
    for (const size of ["default", "sm", "lg", "icon"] as const) {
      const classes = buttonVariants({ size });
      expect(classes).toMatch(/rounded-control/);
      expect(classes).toMatch(/text-body/);
      expect(classes).toMatch(/font-semibold/);
      expect(classes).toMatch(/(h|size)-11\b/);
      expect(classes).toMatch(/md:(h|size)-10\b/);
    }
  });

  it("AC-BRAND-018-2: disabled is 50% opacity, not-allowed and does not react to hover", () => {
    render(<Button disabled>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50", "disabled:cursor-not-allowed");
    // The not-allowed cursor needs pointer events; hover and press styles
    // apply only to enabled buttons.
    expect(button).not.toHaveClass("disabled:pointer-events-none");
    for (const variant of ["default", "outline", "ghost", "link", "destructive"] as const) {
      const hoverOrActive = buttonVariants({ variant })
        .split(" ")
        .filter((c) => /(^|:)(hover|active):/.test(c));
      expect(hoverOrActive.length, variant).toBeGreaterThan(0);
      for (const c of hoverOrActive) expect(c, variant).toMatch(/^not-disabled:/);
    }
  });

  it("AC-BRAND-018-1: offers only the five documented variants", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/components/ui/button.tsx"),
      "utf8",
    );
    const block = source.match(/variant:\s*\{([\s\S]*?)\n\s{6}\},/)?.[1] ?? "";
    const keys = [...block.matchAll(/^\s{8}"?([a-z-]+)"?:/gm)].map((m) => m[1]);
    expect(keys).toEqual(["default", "outline", "ghost", "destructive", "link"]);
  });

  it("AC-BRAND-018-3: loading shows a spinner before the label, aria-busy and disabled", () => {
    render(<Button loading>Invitar</Button>);
    const button = screen.getByRole("button", { name: "Invitar" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    const spinner = button.querySelector('[data-slot="button-spinner"]')!;
    expect(spinner).toBeInTheDocument();
    expect(button.firstChild).toBe(spinner);
    expect(button).toHaveTextContent("Invitar");
  });

  it("REQ-BRAND-018: the rendered button keeps text-body next to its text color", () => {
    render(<Button variant="outline">Cancelar</Button>);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("text-body", "text-ink");
  });

  it("is not busy when not loading", () => {
    render(<Button>Invitar</Button>);
    expect(screen.getByRole("button", { name: "Invitar" })).not.toHaveAttribute("aria-busy");
  });
});
