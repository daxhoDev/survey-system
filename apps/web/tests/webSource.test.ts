import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Static checks over the web source and its manifests (BRAND.md v2.0,
// FRONTEND.md). Paths are relative to apps/web.
const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function files(dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(root, path)).isDirectory()
      ? files(path)
      : /\.(tsx?|css)$/.test(name)
        ? [path]
        : [];
  });
}

function matches(paths: string[], pattern: RegExp) {
  return paths.filter((p) => pattern.test(read(p))).map((p) => relative(".", p));
}

const src = files("src");
const componentsAndPages = [...files("src/components"), ...files("src/pages")];
const pkg = JSON.parse(read("package.json")) as {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const indexHtml = read("index.html");

describe("name and identity (REQ-BRAND-001, 003, 004, 005)", () => {
  it("AC-BRAND-001-1: the document title is Sondix", () => {
    expect(indexHtml).toMatch(/<title>Sondix<\/title>/);
  });

  it("AC-BRAND-001-2: workspace packages keep the @survey-system scope", () => {
    const repo = resolve(root, "../..");
    for (const path of [
      "apps/web/package.json",
      "apps/api/package.json",
      "packages/schemas/package.json",
    ]) {
      const { name } = JSON.parse(readFileSync(join(repo, path), "utf8"));
      expect(name, path).toMatch(/^@survey-system\//);
    }
  });

  it("AC-BRAND-003-1 (web): no ® or ™ next to Sondix", () => {
    expect(matches(src, /Sondix\s*[®™]/)).toEqual([]);
  });

  it("AC-BRAND-004-1 (web): no ETECSA", () => {
    expect(matches(src, /etecsa/i)).toEqual([]);
  });

  it("AC-BRAND-005-1: the slogan is not in the UI", () => {
    expect(matches(src, /La información comienza escuchando/)).toEqual([]);
  });
});

describe("stack (REQ-FE-001, REQ-BRAND-012)", () => {
  it("AC-FE-001-1 / AC-BRAND-012-1: Work Sans only, and the documented stack", () => {
    expect(deps["@fontsource-variable/work-sans"]).toBeDefined();
    expect(deps["@fontsource-variable/inter"]).toBeUndefined();
    expect(deps["@fontsource-variable/manrope"]).toBeUndefined();
    expect(deps.vite).toMatch(/^\^?8\./);
    expect(deps.react).toMatch(/^\^?19\./);
    expect(deps.typescript).toBeDefined();
    expect(deps.tailwindcss).toMatch(/^\^?4\./);
    expect(deps["@tailwindcss/vite"]).toBeDefined();
    expect(deps["tw-animate-css"]).toBeDefined();
    expect(deps["babel-plugin-react-compiler"]).toBeDefined();
    expect(deps["@rolldown/plugin-babel"]).toBeDefined();
    const vite = read("vite.config.ts");
    expect(vite).toMatch(/@tailwindcss\/vite/);
    expect(vite).toMatch(/@rolldown\/plugin-babel/);
    expect(vite).toMatch(/babel-plugin-react-compiler|reactCompilerPreset/);
  });

  it("AC-BRAND-012-1: no external font CDN", () => {
    expect(indexHtml).not.toMatch(/fonts\.googleapis|fonts\.gstatic|<link[^>]+font/i);
    expect(matches(src, /fonts\.googleapis|@fontsource-variable\/(inter|manrope)/)).toEqual([]);
  });
});

describe("Spanish UI document (REQ-FE-006)", () => {
  it("AC-FE-006-1: <html lang=\"es\">", () => {
    expect(indexHtml).toMatch(/<html lang="es">/);
  });
});

describe("semantic tokens only (REQ-BRAND-008, 009)", () => {
  // ui/chart.tsx (recharts) is removed in PH-FE-4 (AC-FE-002-3); its
  // attribute selectors match recharts' own default strokes.
  const raw = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/;

  it("AC-BRAND-008-1 (all but ui/chart.tsx): components and pages use no raw color values", () => {
    const scope = componentsAndPages.filter((p) => !p.endsWith("ui/chart.tsx"));
    expect(matches(scope, raw)).toEqual([]);
  });

  // Passes once ui/chart.tsx is removed (PH-FE-4).
  it.skip("AC-BRAND-008-1 (full, PH-FE-4): no raw color values at all", () => {
    expect(matches(componentsAndPages, raw)).toEqual([]);
  });

  it("AC-BRAND-009-2: the removed variables are not used anywhere", () => {
    expect(
      matches(src, /--sidebar-|--chart-|--brand|--success|--warning|--info|destructive-text/),
    ).toEqual([]);
  });
});

describe("removed patterns (REQ-BRAND-016, 022, 023)", () => {
  it("AC-BRAND-016-3: no backdrop blur or filter", () => {
    expect(matches(src, /backdrop-blur|backdrop-filter/)).toEqual([]);
  });

  it("AC-BRAND-022-2: no sidebar component or sidebar_state cookie", () => {
    expect(matches(src, /ui\/sidebar|sidebar_state/)).toEqual([]);
    expect(existsSync(join(root, "src/components/ui/sidebar.tsx"))).toBe(false);
  });

  it("AC-BRAND-023-1: no brand panel, noise, gradient or glow", () => {
    const scope = [
      ...componentsAndPages,
      ...files("src/styles"),
      ...files("src/lib"),
    ];
    expect(matches(scope, /brand-noise|LoginBrandPanel|gradient|glow/)).toEqual([]);
  });
});

describe("icons (REQ-BRAND-017)", () => {
  it("AC-BRAND-017-2: icons come from lucide-react at their default stroke width", () => {
    expect(matches(src, /strokeWidth|stroke-width|react-icons|@radix-ui\/react-icons|@heroicons/)).toEqual([]);
  });
});

describe("app icon and favicon (REQ-BRAND-026)", () => {
  it("AC-BRAND-026-1: index.html links /favicon.svg and the 32 px /favicon.png", () => {
    expect(indexHtml).toMatch(/<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
    expect(indexHtml).toMatch(
      /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon\.png" \/>/,
    );
    expect(existsSync(join(root, "public/favicon.svg"))).toBe(true);
    expect(existsSync(join(root, "public/favicon.png"))).toBe(true);
  });
});

describe("theme script (REQ-BRAND-011)", () => {
  it("AC-BRAND-011-4: an inline script in <head> sets the dark class before the first paint", () => {
    const head = indexHtml.split("</head>")[0]!;
    const inline = head.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(inline).toBeDefined();
    expect(inline).toContain('localStorage.getItem("sondix-theme")');
    expect(inline).toContain("prefers-color-scheme: dark");
    expect(inline).toMatch(/classList\.toggle\("dark"/);
    expect(head.indexOf("<script>")).toBeLessThan(indexHtml.indexOf('src="/src/main.tsx"'));
  });
});

describe("shared components (REQ-FE-002, REQ-BRAND-027)", () => {
  it("AC-FE-002-1: toasts, tables and bars come from the documented libraries", () => {
    expect(deps.sonner).toBeDefined();
    expect(deps["lucide-react"]).toBeDefined();
    expect(deps["@tanstack/react-table"]).toBeDefined();
    expect(deps["radix-ui"]).toBeDefined();
    expect(existsSync(join(root, "components.json"))).toBe(true);
    expect(read("src/components/ui/data-table.tsx")).toMatch(/@tanstack\/react-table/);
    expect(existsSync(join(root, "src/components/Bar.tsx"))).toBe(true);
  });

  it("AC-BRAND-027-4: SmallMultiples is used only by the dashboard and the statistics tab", () => {
    const allowed = ["ActiveSurveys.tsx", "SurveyStatistics.tsx", "SmallMultiples.tsx"];
    const users = matches(src, /SmallMultiples/).filter(
      (p) => !allowed.some((a) => p.endsWith(a)),
    );
    expect(users).toEqual([]);
  });

  // Pass once the details page drops recharts and cards (PH-FE-4).
  it.skip("AC-FE-002-3 (PH-FE-4): sidebar, card and chart primitives and recharts are gone", () => {
    for (const f of ["sidebar.tsx", "card.tsx", "chart.tsx"]) {
      expect(existsSync(join(root, "src/components/ui", f)), f).toBe(false);
    }
    expect(deps.recharts).toBeUndefined();
  });

  it.skip("AC-BRAND-028-3 (PH-FE-4): no recharts and no ui/chart", () => {
    expect(deps.recharts).toBeUndefined();
    expect(matches(src, /recharts|ui\/chart/)).toEqual([]);
  });
});
