import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "@/components/Logo";

describe("Logo (REQ-BRAND-021)", () => {
  it("AC-BRAND-021-1: renders the interim wordmark Sondix in Work Sans 700, 20 px, ink", () => {
    render(<Logo />);

    const logo = screen.getByText("Sondix");
    expect(logo).toHaveAttribute("data-slot", "logo");
    expect(logo).toHaveClass("font-sans", "text-[20px]", "font-bold", "text-ink");
  });
});
