import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoginPage from "@/pages/LoginPage";
import { renderWithProviders } from "./helpers";

describe("LoginPage (BRAND-23)", () => {
  it("shows the login form beside a decorative brand panel", () => {
    const { container } = renderWithProviders(<LoginPage />);

    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    const panel = container.querySelector("aside");
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(panel).toHaveClass("hidden", "lg:flex");
    expect(panel).toHaveTextContent("Sondix");
  });
});
