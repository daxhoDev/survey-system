import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingLine, SkeletonRules } from "@/components/DataStates";

describe("data view states (REQ-BRAND-033)", () => {
  it("AC-BRAND-033-1: loading shows static 8 px rule bars (no shimmer), or a page loading line", () => {
    const { container } = render(<SkeletonRules widths={["100%", "60%"]} />);
    expect(screen.getByRole("status", { name: "Cargando..." })).toBeInTheDocument();
    const rules = container.querySelectorAll('[data-slot="skeleton"]');
    expect(rules).toHaveLength(2);
    for (const rule of rules) {
      expect(rule).toHaveClass("h-2", "bg-rule");
      expect(rule.className).not.toMatch(/animate|pulse|shimmer/);
    }

    render(<LoadingLine>Cargando panel...</LoadingLine>);
    const line = screen.getByText("Cargando panel...");
    expect(line).toHaveClass("text-ink-muted");
    expect(line.className).not.toMatch(/animate/);
  });

  it("AC-BRAND-033-2: empty shows one ink-muted line and the next action", () => {
    render(
      <EmptyState action={<a href="/dashboard/surveys/create">Crear encuesta</a>}>
        Aún no hay encuestas.
      </EmptyState>,
    );
    expect(screen.getByText("Aún no hay encuestas.")).toHaveClass("text-ink-muted");
    expect(screen.getByRole("link", { name: "Crear encuesta" })).toBeInTheDocument();
  });

  it("AC-BRAND-033-3: error shows one rust line with an icon and Reintentar repeats the request", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry}>Error al cargar las encuestas</ErrorState>);

    const line = screen.getByText("Error al cargar las encuestas");
    expect(line).toHaveClass("text-rust");
    expect(line.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
