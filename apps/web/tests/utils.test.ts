import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Every component merges its classes with cn (tailwind-merge). The theme's
// text sizes (REQ-BRAND-013) must survive next to a text color.
describe("cn (REQ-BRAND-013)", () => {
  it.each(["h1", "h2", "h3", "figure", "body-lg", "body", "small", "caption"])(
    "AC-BRAND-013-1: keeps text-%s next to a text color",
    (size) => {
      expect(cn(`text-${size} text-ink-muted`).split(" ")).toEqual([
        `text-${size}`,
        "text-ink-muted",
      ]);
    },
  );

  it("still resolves conflicting sizes and colors", () => {
    expect(cn("text-body text-ink", "text-caption text-rust")).toBe("text-caption text-rust");
  });
});
