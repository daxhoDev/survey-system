import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "@/components/Logo";

describe("Logo (REQ-BRAND-021)", () => {
  it("AC-BRAND-021-1: renders the interim wordmark Sondix in Work Sans 700, 20 px, ink", () => {
    render(<Logo />);

    const logo = screen.getByText("Sondix");
    expect(logo).toHaveAttribute("data-slot", "logo");
    expect(logo).toHaveClass("font-sans", "text-[20px]", "font-bold", "text-ink");
    expect(logo).not.toHaveAttribute("data-variant");
    expect(logo).not.toHaveClass("text-[16px]", "text-ink-muted");
  });

  it("AC-BRAND-021-1: variant=\"footer\" renders Sondix in Work Sans 700, 16 px, ink-muted", () => {
    render(<Logo variant="footer" />);

    const logo = screen.getByText("Sondix");
    expect(logo).toHaveAttribute("data-slot", "logo");
    expect(logo).toHaveAttribute("data-variant", "footer");
    expect(logo).toHaveClass("font-sans", "text-[16px]", "font-bold", "text-ink-muted");
    expect(logo).not.toHaveClass("text-[20px]", "text-ink");
  });
});
