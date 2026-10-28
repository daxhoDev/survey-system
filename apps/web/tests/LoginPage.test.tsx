import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "@/pages/LoginPage";
import { mockFetch, renderWithProviders } from "./helpers";

// The logo, product line and rule belong to the shared auth frame
// (AuthPage.test.tsx, REQ-FE-030); LoginPage renders only the login form.
describe("LoginPage (REQ-FE-015, REQ-FE-030, REQ-BRAND-023)", () => {
  it("AC-FE-030-1: renders only the login form, with no logo of its own", () => {
    mockFetch({});
    renderWithProviders(<LoginPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Inicia sesión" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.queryByText("Sondix")).not.toBeInTheDocument();
  });

  it("AC-FE-030-1 / REQ-BRAND-023: has no brand panel and no card", () => {
    mockFetch({});
    const { container } = renderWithProviders(<LoginPage />);

    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector('[data-slot^="card"]')).toBeNull();
  });
});
