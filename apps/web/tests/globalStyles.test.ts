import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Static checks of the visual system's stylesheet (BRAND.md v2.0).
const css = readFileSync(
  resolve(import.meta.dirname, "../src/styles/global.css"),
  "utf8",
);

// Declarations of every top-level block whose selector is exactly `selector`.
function declarations(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blocks = css.matchAll(
    new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, "g"),
  );
  for (const [, body] of blocks) {
    for (const decl of body!.split(";")) {
      const clean = decl.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const i = clean.indexOf(":");
      if (i > 0) out[clean.slice(0, i).trim()] = clean.slice(i + 1).trim();
    }
  }
  return out;
}

const light = declarations(":root");
const dark = declarations(".dark");

// REQ-BRAND-006 table: token → [light, dark].
const worldTokens: Record<string, [string, string]> = {
  "--paper": ["#FFFFFF", "#141414"],
  "--ink": ["#141414", "#EDEFF1"],
  "--ink-muted": ["#565C63", "#A3A9B0"],
  "--rule": ["#E4E7EA", "#2E3236"],
  "--rule-strong": ["#141414", "#EDEFF1"],
  "--input-border": ["#767C83", "#7D838A"],
  "--surface-subtle": ["#F5F6F7", "#1D2023"],
  "--surface-raised": ["#FFFFFF", "#1D2023"],
  "--teal": ["#0E6E6E", "#5CBDBD"],
  "--teal-strong": ["#0A5656", "#7ACCCC"],
  "--teal-tint": ["#D5ECEC", "#1F3B3B"],
  "--on-teal": ["#FFFFFF", "#141414"],
  "--rust": ["#9A3412", "#F0916A"],
  "--rust-strong": ["#7C2A0E", "#F4A887"],
  "--on-rust": ["#FFFFFF", "#141414"],
};

describe("world color tokens (REQ-BRAND-006)", () => {
  it("AC-BRAND-006-1: defines every token with its light and dark value", () => {
    for (const [token, [l, d]] of Object.entries(worldTokens)) {
      expect(light[token]?.toUpperCase(), `${token} light`).toBe(l);
      expect(dark[token]?.toUpperCase(), `${token} dark`).toBe(d);
    }
  });

  it("AC-BRAND-006-2: the v1.0 palettes are gone", () => {
    for (const prefix of [
      "--color-midnight-",
      "--color-turquoise-",
      "--color-slate-",
      "--color-neutral-",
    ]) {
      expect(css).not.toContain(prefix);
    }
  });

  it("AC-BRAND-006-3: no token is pure black", () => {
    expect(css).not.toMatch(/#000000\b|#000\b/i);
  });
});

describe("theme token mapping (REQ-BRAND-009)", () => {
  const mapping: Record<string, string> = {
    "--background": "--paper",
    "--foreground": "--ink",
    "--popover": "--surface-raised",
    "--card": "--surface-raised",
    "--popover-foreground": "--ink",
    "--card-foreground": "--ink",
    "--primary": "--teal",
    "--primary-foreground": "--on-teal",
    "--secondary": "--surface-subtle",
    "--muted": "--surface-subtle",
    "--accent": "--surface-subtle",
    "--secondary-foreground": "--ink",
    "--accent-foreground": "--ink",
    "--muted-foreground": "--ink-muted",
    "--destructive": "--rust",
    "--destructive-foreground": "--on-rust",
    "--border": "--rule",
    "--input": "--input-border",
    "--ring": "--teal",
  };

  it("AC-BRAND-009-1: every shadcn variable resolves to its world token in both themes", () => {
    for (const [shadcn, world] of Object.entries(mapping)) {
      expect(light[shadcn], `${shadcn} light`).toBe(`var(${world})`);
      expect(dark[shadcn], `${shadcn} dark`).toBe(`var(${world})`);
    }
  });

  it("AC-BRAND-009-2 (stylesheet): the removed variables are not defined", () => {
    for (const name of [
      "--sidebar-",
      "--chart-",
      "--brand",
      "--success",
      "--warning",
      "--info",
      "--destructive-text",
    ]) {
      expect(css).not.toContain(name);
    }
  });
});

describe("typography (REQ-BRAND-012, REQ-BRAND-013)", () => {
  it("AC-BRAND-012-1 (stylesheet): Work Sans is the only family, self-hosted", () => {
    expect(css).toContain('@import "@fontsource-variable/work-sans"');
    expect(css).toMatch(/--font-sans:\s*"Work Sans Variable"/);
    expect(css).not.toMatch(/@import\s+url\(|fonts\.googleapis|--font-heading/);
    expect(css).not.toMatch(/inter|manrope/i);
  });

  it("AC-BRAND-012: the `figures` utility sets tabular lining figures", () => {
    expect(css).toMatch(
      /@utility figures\s*\{\s*font-variant-numeric:\s*tabular-nums lining-nums;/,
    );
  });

  it("AC-BRAND-013-1: the eight text sizes match the scale; text-display and text-h4 are gone", () => {
    const theme = declarations("@theme");
    const scale: Record<string, [string, string, string, string]> = {
      h1: ["1.875rem", "1.2", "700", "-0.01em"],
      h2: ["1.375rem", "1.25", "600", "-0.01em"],
      h3: ["1.125rem", "1.3", "600", "0em"],
      figure: ["1.625rem", "1.1", "700", "0em"],
      "body-lg": ["1rem", "1.5", "400", "0em"],
      body: ["0.875rem", "1.5", "400", "0em"],
      small: ["0.8125rem", "1.45", "400", "0em"],
      caption: ["0.75rem", "1.4", "500", "0em"],
    };
    for (const [name, [size, lh, weight, tracking]] of Object.entries(scale)) {
      expect(theme[`--text-${name}`], name).toBe(size);
      expect(theme[`--text-${name}--line-height`], name).toBe(lh);
      expect(theme[`--text-${name}--font-weight`], name).toBe(weight);
      expect(theme[`--text-${name}--letter-spacing`], name).toBe(tracking);
    }
    expect(css).not.toMatch(/--text-display|--text-h4/);
  });

  it("REQ-BRAND-013: h1–h3 use text-h1–text-h3 and balanced wrapping", () => {
    expect(css).toMatch(/h1,\s*h2,\s*h3\s*\{\s*text-wrap:\s*balance;/);
    expect(css).toMatch(/h1\s*\{\s*@apply text-h1;/);
    expect(css).toMatch(/h2\s*\{\s*@apply text-h2;/);
    expect(css).toMatch(/h3\s*\{\s*@apply text-h3;/);
  });
});

describe("shape, spacing, elevation (REQ-BRAND-014, 015, 016)", () => {
  it("AC-BRAND-014-1: --radius-control is 3 px and the v1.0 radii are gone", () => {
    expect(css).toMatch(/--radius-control:\s*3px;/);
    for (const r of ["xs", "sm", "md", "lg", "xl"]) {
      expect(css).not.toMatch(new RegExp(`--radius-${r}\\b`));
    }
  });

  it("AC-BRAND-015-1: --spacing is not overridden", () => {
    expect(css).not.toMatch(/--spacing\s*:/);
  });

  it("AC-BRAND-016: the overlay shadow and scrim per theme", () => {
    expect(light["--overlay-shadow"]).toBe("0 8px 24px rgb(20 20 20 / 0.12)");
    expect(dark["--overlay-shadow"]).toBe("0 8px 24px rgb(0 0 0 / 0.5)");
    expect(light["--scrim"]).toBe("color-mix(in srgb, var(--ink) 40%, transparent)");
    expect(dark["--scrim"]).toBe("color-mix(in srgb, var(--paper) 70%, transparent)");
  });

  it("AC-BRAND-016-3 (stylesheet): no backdrop filter", () => {
    expect(css).not.toMatch(/backdrop-filter|backdrop-blur/);
  });
});

describe("accessibility, motion, browser surfaces (REQ-BRAND-020, 031, 032)", () => {
  it("AC-BRAND-020-2 (stylesheet): focus is a 2 px teal outline with a 2 px offset", () => {
    expect(css).toMatch(
      /:focus-visible\s*\{\s*outline:\s*2px solid var\(--teal\);\s*outline-offset:\s*2px;/,
    );
  });

  it("AC-BRAND-031-1 (stylesheet): default transitions last 150 ms, ease-out", () => {
    expect(css).toMatch(/--default-transition-duration:\s*150ms;/);
    expect(css).toMatch(
      /--default-transition-timing-function:\s*cubic-bezier\(0, 0, 0\.2, 1\);/,
    );
  });

  it("AC-BRAND-031-2 (stylesheet): reduced motion disables transitions and animations", () => {
    const block = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
    )?.[1];
    expect(block).toBeDefined();
    expect(block).toMatch(/animation:\s*none !important/);
    expect(block).toMatch(/transition:\s*none !important/);
  });

  it("AC-BRAND-032-1: browser surfaces come from the world tokens in both themes", () => {
    expect(light["color-scheme"]).toBe("light");
    expect(dark["color-scheme"]).toBe("dark");
    expect(light["caret-color"]).toBe("var(--teal)");
    expect(light["accent-color"]).toBe("var(--teal)");
    expect(light["scrollbar-color"]).toBe("var(--input-border) var(--paper)");
    expect(light["scrollbar-width"]).toBe("thin");
    const selection = declarations("::selection");
    expect(selection["background-color"]).toBe("var(--teal-tint)");
    expect(selection.color).toBe("var(--ink)");
    expect(css).toMatch(/\ba\s*\{\s*text-underline-offset:\s*3px;/);
  });
});

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("contrast (REQ-BRAND-020)", () => {
  // [foreground, background, light minimum, dark minimum]
  const pairs: [string, string, number, number][] = [
    ["--ink", "--paper", 18.42, 15.98],
    ["--ink-muted", "--paper", 6.76, 7.77],
    ["--ink-muted", "--surface-subtle", 6.25, 6.9],
    ["--ink-muted", "--surface-raised", 6.25, 6.9],
    ["--teal", "--paper", 6.04, 8.31],
    ["--teal", "--surface-subtle", 5.59, 7.38],
    ["--teal", "--surface-raised", 5.59, 7.38],
    ["--rust", "--paper", 7.31, 7.86],
    ["--rust", "--surface-subtle", 6.75, 6.99],
    ["--rust", "--surface-raised", 6.75, 6.99],
    ["--on-teal", "--teal", 6.04, 8.31],
    ["--on-teal", "--teal-strong", 8.47, 9.95],
    ["--on-rust", "--rust", 7.31, 7.86],
    ["--on-rust", "--rust-strong", 9.57, 9.47],
    ["--ink", "--teal-tint", 14.95, 10.43],
    ["--input-border", "--paper", 4.22, 4.81],
    ["--teal", "--rule", 4.87, 5.82],
    ["--rust", "--rule", 5.89, 5.51],
  ];

  it("AC-BRAND-020-1: every measured pair reaches the value of the table in both themes", () => {
    for (const [fg, bg, minLight, minDark] of pairs) {
      const l = contrast(light[fg]!, light[bg]!);
      const d = contrast(dark[fg]!, dark[bg]!);
      expect(Math.round(l * 100) / 100, `${fg} on ${bg} light`).toBeGreaterThanOrEqual(minLight);
      expect(Math.round(d * 100) / 100, `${fg} on ${bg} dark`).toBeGreaterThanOrEqual(minDark);
    }
  });
});
