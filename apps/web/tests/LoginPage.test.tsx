import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "@/pages/LoginPage";
import { renderWithProviders } from "./helpers";

// The full auth frame (REQ-FE-030) is redesigned in PH-FE-5; these checks
// cover what holds since PH-BRAND-3.
describe("LoginPage (REQ-BRAND-021, REQ-BRAND-023)", () => {
  it("AC-BRAND-021-1 / AC-FE-029-2: shows the Logo component once and no other Sondix text", () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    const sondix = screen.getAllByText("Sondix");
    expect(sondix).toHaveLength(1);
    expect(sondix[0]).toHaveAttribute("data-slot", "logo");
    expect(screen.queryByRole("img", { name: "Sondix" })).not.toBeInTheDocument();
  });

  it("REQ-BRAND-023: has no decorative brand panel", () => {
    const { container } = renderWithProviders(<LoginPage />);

    expect(container.querySelector("aside")).toBeNull();
  });
});
