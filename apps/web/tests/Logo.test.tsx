import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Logo from "@/components/Logo";

// Logo «Celda de anuario» (BRAND.md v4.0, REQ-BRAND-021).
const source = readFileSync(
  resolve(import.meta.dirname, "../src/components/Logo.tsx"),
  "utf8",
);
const css = readFileSync(
  resolve(import.meta.dirname, "../src/styles/global.css"),
  "utf8",
);

function renderLogo(variant?: "footer") {
  const { container } = render(<Logo variant={variant} />);
  const logos = container.querySelectorAll<HTMLElement>('[data-slot="logo"]');
  expect(logos).toHaveLength(1);
  const logo = logos[0]!;
  const [svg, wordmark, ...rest] = Array.from(logo.children) as HTMLElement[];
  expect(rest).toEqual([]);
  return { logo, svg: svg!, wordmark: wordmark! };
}

// The four rectangles of the isotype as [x, y, width, height, classes].
function shapes(svg: Element) {
  return Array.from(svg.children).map((el) => ({
    tag: el.tagName.toLowerCase(),
    rect: ["x", "y", "width", "height"].map((a) => el.getAttribute(a)),
    rx: el.getAttribute("rx"),
    ry: el.getAttribute("ry"),
    classes: (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
  }));
}

describe("Logo (REQ-BRAND-021)", () => {
  it("AC-BRAND-021-1: the default lockup is one data-slot=logo element with the 20 px isotype then the 20 px ink wordmark, 8 px apart", () => {
    const { logo, svg, wordmark } = renderLogo();

    expect(logo).not.toHaveAttribute("data-variant");
    expect(logo).toHaveClass("inline-flex", "items-center", "gap-[8px]");

    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 48 48");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveClass("size-[20px]");

    expect(wordmark).toHaveTextContent(/^Sondix$/);
    expect(wordmark).toHaveClass(
      "font-sans",
      "font-bold",
      "text-[20px]",
      "tracking-[-0.02em]",
      "leading-none",
      "text-ink",
    );
    expect(wordmark).not.toHaveClass("text-[16px]", "text-ink-muted");
  });

  it("AC-BRAND-021-2: the default isotype is exactly outline, ink bar, track and value fill over the track, with no radius", () => {
    const { svg } = renderLogo();
    const s = shapes(svg);

    expect(s.map((x) => x.tag)).toEqual(["rect", "rect", "rect", "rect"]);
    expect(s.every((x) => x.rx === null && x.ry === null)).toBe(true);

    const [outline, inkBar, track, value] = s;
    expect(outline!.rect).toEqual(["3", "3", "42", "42"]);
    expect(outline!.classes).toEqual(expect.arrayContaining(["fill-none", "stroke-4", "stroke-ink"]));
    expect(inkBar!.rect).toEqual(["10", "12", "14", "5"]);
    expect(inkBar!.classes).toContain("fill-ink");
    expect(track!.rect).toEqual(["10", "28", "28", "8"]);
    expect(track!.classes).toContain("fill-rule");
    // Drawn after the track, so it lies over it.
    expect(value!.rect).toEqual(["10", "28", "19", "8"]);
    expect(value!.classes).toContain("fill-teal");
  });

  it("AC-BRAND-021-3: variant=\"footer\" has data-variant=footer, the same isotype at 16 px all in ink-muted on a rule track and no teal, and the 16 px ink-muted wordmark, 6 px apart", () => {
    const { logo, svg, wordmark } = renderLogo("footer");

    expect(logo).toHaveAttribute("data-variant", "footer");
    expect(logo).toHaveClass("inline-flex", "items-center", "gap-[6px]");
    expect(logo.outerHTML).not.toMatch(/teal/);

    expect(svg).toHaveAttribute("viewBox", "0 0 48 48");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveClass("size-[16px]");

    const [outline, inkBar, track, value, ...rest] = shapes(svg);
    expect(rest).toEqual([]);
    expect(outline!.rect).toEqual(["3", "3", "42", "42"]);
    expect(outline!.classes).toEqual(
      expect.arrayContaining(["fill-none", "stroke-4", "stroke-ink-muted"]),
    );
    expect(inkBar!.rect).toEqual(["10", "12", "14", "5"]);
    expect(inkBar!.classes).toContain("fill-ink-muted");
    expect(track!.rect).toEqual(["10", "28", "28", "8"]);
    expect(track!.classes).toContain("fill-rule");
    expect(value!.rect).toEqual(["10", "28", "19", "8"]);
    expect(value!.classes).toContain("fill-ink-muted");

    expect(wordmark).toHaveTextContent(/^Sondix$/);
    expect(wordmark).toHaveClass(
      "font-sans",
      "font-bold",
      "text-[16px]",
      "tracking-[-0.02em]",
      "leading-none",
      "text-ink-muted",
    );
    expect(wordmark).not.toHaveClass("text-[20px]", "text-ink");
  });

  it("AC-BRAND-021-6: the isotype adds nothing to the accessible name, which comes from the text Sondix, and Logo.tsx holds no raw color value", () => {
    for (const variant of [undefined, "footer"] as const) {
      const { unmount } = render(<Logo variant={variant} />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      const svg = document.querySelector('[data-slot="logo"] svg')!;
      expect(svg.querySelector("title")).toBeNull();
      expect(svg).not.toHaveAttribute("role");
      expect(screen.getByText("Sondix")).toBeInTheDocument();
      unmount();
    }
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
  });

  it("AC-BRAND-021-7: the default logo's token classes resolve to the dark values under the dark theme", () => {
    const { svg, wordmark } = renderLogo();
    const used = new Set(shapes(svg).flatMap((x) => x.classes));
    expect([...used]).toEqual(expect.arrayContaining(["stroke-ink", "fill-ink", "fill-rule", "fill-teal"]));
    expect(wordmark).toHaveClass("text-ink");

    // The utilities read the theme colors, which .dark maps to the dark values.
    expect(css).toMatch(/--color-ink:\s*var\(--ink\)/);
    expect(css).toMatch(/--color-rule:\s*var\(--rule\)/);
    expect(css).toMatch(/--color-teal:\s*var\(--teal\)/);
    const dark = css.match(/\n\.dark\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(dark).toMatch(/--ink:\s*#EDEFF1/i);
    expect(dark).toMatch(/--rule:\s*#2E3236/i);
    expect(dark).toMatch(/--teal:\s*#5CBDBD/i);
  });
});
