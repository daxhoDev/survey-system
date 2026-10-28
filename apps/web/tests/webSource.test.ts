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
  const raw = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/;

  it("AC-BRAND-008-1: components and pages use no raw color values", () => {
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

describe("former logo assets (REQ-BRAND-025)", () => {
  const formerAssets = [
    "isotype-gradient.svg",
    "isotype-midnight.svg",
    "isotype-white.svg",
    "logo-light.svg",
    "logo-dark.svg",
    "logo-mono-midnight.svg",
    "logo-mono-white.svg",
  ];

  it("AC-BRAND-025-1: the seven v1.0 logo files are gone and nothing references them", () => {
    for (const name of formerAssets) {
      expect(existsSync(join(root, "src/assets/brand", name)), name).toBe(false);
    }
    const names = new RegExp(formerAssets.map((n) => n.replace(/\./g, "\\.")).join("|"));
    expect(matches(src, names)).toEqual([]);
  });

  it("AC-BRAND-025-2: no v1.0 logo color in src, public or index.html", () => {
    const all = (function walk(dir: string): string[] {
      const abs = join(root, dir);
      return readdirSync(abs).flatMap((name) => {
        const path = join(dir, name);
        return statSync(join(root, path)).isDirectory() ? walk(path) : [path];
      });
    });
    const users = [...all("src"), ...all("public"), "index.html"].filter((p) =>
      /#(4AEEC8|12B2D6|2FDDB8|17C9AB|101827)/i.test(read(p)),
    );
    expect(users).toEqual([]);
  });
});

describe("pages redesigned in PH-FE-5 (DEV-005)", () => {
  it("AC-FE-002-3 (card, PH-FE-5 part): the login form, invitations and accept-invitation pages no longer use ui/card", () => {
    for (const path of [
      "src/components/login-form.tsx",
      "src/pages/InvitationsPage.tsx",
      "src/pages/AcceptInvitationPage.tsx",
      "src/pages/LoginPage.tsx",
      "src/pages/AuthPage.tsx",
    ]) {
      expect(read(path), path).not.toMatch(/ui\/card|\bCard\w*\b/);
    }
  });
});

describe("app icon and favicon (REQ-BRAND-026)", () => {
  // Attributes of every <rect> of an SVG, in document order.
  function rects(svg: string) {
    return Array.from(svg.matchAll(/<rect\b([^>]*?)\/?>/g), ([, attrs]) =>
      Object.fromEntries(Array.from(attrs!.matchAll(/([\w-]+)="([^"]*)"/g), ([, k, v]) => [k, v])),
    ) as Record<string, string>[];
  }
  const geometry = (r: Record<string, string>) => [r.x, r.y, r.width, r.height].map(Number);

  it("AC-BRAND-026-1: index.html holds the four icon links in order, and each linked file exists in public", () => {
    const links = [
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
      '<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />',
      '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />',
      '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
    ];
    const positions = links.map((l) => indexHtml.indexOf(l));
    expect(positions.every((p) => p >= 0), positions.join(",")).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(indexHtml.match(/<link rel="(icon|apple-touch-icon)"/g)).toHaveLength(4);
    for (const file of ["favicon.svg", "favicon.png", "favicon-16.png", "apple-touch-icon.png"]) {
      expect(existsSync(join(root, "public", file)), file).toBe(true);
    }
  });

  it("AC-BRAND-026-3: favicon.svg is the favicon 32 form in light colors with a dark-scheme rule, no ink bar and no background", () => {
    const svg = read("public/favicon.svg");
    expect(svg).toMatch(/<svg\b[^>]*viewBox="0 0 48 48"/);
    expect(svg).toMatch(/<svg\b[^>]*role="img"/);
    expect(svg).toMatch(/<svg\b[^>]*aria-label="Sondix"/);

    const style = svg.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    const media = style.indexOf("@media (prefers-color-scheme: dark)");
    expect(media).toBeGreaterThan(0);
    const lightCss = style.slice(0, media);
    const darkCss = style.slice(media);
    const rule = (css: string, cls: string) =>
      css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`))?.[1]?.trim();

    const r = rects(svg);
    expect(r).toHaveLength(3);
    const byClass = Object.fromEntries(r.map((x) => [x.class, x]));
    expect(geometry(byClass.ink!)).toEqual([3, 3, 42, 42]);
    expect(byClass.ink!.fill).toBe("none");
    expect(byClass.ink!["stroke-width"]).toBe("4");
    expect(geometry(byClass.track!)).toEqual([10, 26, 28, 12]);
    expect(geometry(byClass.value!)).toEqual([10, 26, 19, 12]);
    expect(r.every((x) => !x.rx && !x.ry)).toBe(true);

    expect(rule(lightCss, "ink")).toMatch(/stroke:\s*#141414/i);
    expect(rule(lightCss, "track")).toMatch(/fill:\s*#E4E7EA/i);
    expect(rule(lightCss, "value")).toMatch(/fill:\s*#0E6E6E/i);
    expect(rule(darkCss, "ink")).toMatch(/stroke:\s*#EDEFF1/i);
    expect(rule(darkCss, "track")).toMatch(/fill:\s*#2E3236/i);
    expect(rule(darkCss, "value")).toMatch(/fill:\s*#5CBDBD/i);
  });

  it("AC-BRAND-026-4: the light and dark app icons are a radius-24 tile with the stroke-3 isotype at translate(18 18) scale(76/48)", () => {
    const cases = [
      {
        file: "src/assets/brand/app-icon-light.svg",
        tile: "#FFFFFF",
        border: true,
        colors: { ink: "#141414", track: "#E4E7EA", fill: "#0E6E6E" },
      },
      {
        file: "src/assets/brand/app-icon-dark.svg",
        tile: "#141414",
        border: false,
        colors: { ink: "#EDEFF1", track: "#2E3236", fill: "#5CBDBD" },
      },
    ];
    for (const { file, tile, border, colors } of cases) {
      const svg = read(file);
      expect(svg, file).toMatch(/<svg\b[^>]*viewBox="0 0 112 112"/);
      expect(svg, file).toMatch(/<svg\b[^>]*role="img"/);
      expect(svg, file).toMatch(/<svg\b[^>]*aria-label="Sondix"/);

      const transform = svg.match(
        /<g\b[^>]*transform="translate\(18 18\) scale\(([\d.]+)\)"[^>]*>([\s\S]*?)<\/g>/,
      );
      expect(transform, file).not.toBeNull();
      expect(Math.abs(Number(transform![1]) - 76 / 48), file).toBeLessThan(1e-6);

      const outside = rects(svg.replace(transform![0], ""));
      expect(outside, file).toHaveLength(border ? 2 : 1);
      expect(geometry(outside[0]!), file).toEqual([0, 0, 112, 112]);
      expect(outside[0]!.rx, file).toBe("24");
      expect(outside[0]!.fill?.toUpperCase(), file).toBe(tile);
      if (border) {
        expect(geometry(outside[1]!), file).toEqual([0.5, 0.5, 111, 111]);
        expect(outside[1]!.rx, file).toBe("23.5");
        expect(outside[1]!.fill, file).toBe("none");
        expect(outside[1]!.stroke?.toUpperCase(), file).toBe("#E4E7EA");
        expect(outside[1]!["stroke-width"], file).toBe("1");
      }

      const [outline, inkBar, track, value, ...rest] = rects(transform![2]!);
      expect(rest, file).toEqual([]);
      expect(geometry(outline!), file).toEqual([3, 3, 42, 42]);
      expect(outline!.fill, file).toBe("none");
      expect(outline!.stroke?.toUpperCase(), file).toBe(colors.ink);
      expect(outline!["stroke-width"], file).toBe("3");
      expect(geometry(inkBar!), file).toEqual([10, 12, 14, 5]);
      expect(inkBar!.fill?.toUpperCase(), file).toBe(colors.ink);
      expect(geometry(track!), file).toEqual([10, 28, 28, 8]);
      expect(track!.fill?.toUpperCase(), file).toBe(colors.track);
      expect(geometry(value!), file).toEqual([10, 28, 19, 8]);
      expect(value!.fill?.toUpperCase(), file).toBe(colors.fill);
    }
  });

  it("REQ-BRAND-026: the app does not reference the app icons", () => {
    expect(matches(src, /app-icon-(light|dark)/)).toEqual([]);
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

  it("AC-FE-002-3 (sidebar, chart, recharts): the sidebar and chart primitives and recharts are gone", () => {
    for (const f of ["sidebar.tsx", "chart.tsx"]) {
      expect(existsSync(join(root, "src/components/ui", f)), f).toBe(false);
    }
    expect(deps.recharts).toBeUndefined();
  });

  // PH-FE-6 removes ui/card.tsx once no page uses it (DEV-005).
  it("AC-FE-002-3 (card): the card primitive is gone and nothing imports it", () => {
    expect(existsSync(join(root, "src/components/ui/card.tsx"))).toBe(false);
    expect(matches(src, /ui\/card|\bCard(Header|Title|Content|Footer|Description|Action)?\b/)).toEqual([]);
  });

  it("AC-BRAND-021-5: Logo variant=\"footer\" is used only by the public answering page", () => {
    const users = matches(src, /<Logo\b[^>]*variant=/).filter(
      (p) => !p.endsWith("components/Logo.tsx"),
    );
    expect(users).toEqual(["src/pages/SurveyAnsweringPage.tsx"]);
    expect(read("src/pages/SurveyAnsweringPage.tsx")).toMatch(/<Logo variant="footer" \/>/);
  });

  it("REQ-BRAND-019: checkboxes and radios fill with teal on Radix's checked state", () => {
    for (const f of ["checkbox.tsx", "radio-group.tsx"]) {
      const code = read(`src/components/ui/${f}`);
      expect(code, f).toMatch(/data-\[state=checked\]:bg-teal/);
      expect(code, f).not.toMatch(/\bdata-checked:/);
    }
  });

  it("AC-FE-025-2: only ConfirmationDialog builds a DialogContent outside components/ui", () => {
    const users = matches(componentsAndPages, /\bDialogContent\b/).filter(
      (p) => !p.includes("components/ui/") && !p.endsWith("ConfirmationDialog.tsx"),
    );
    expect(users).toEqual([]);
  });

  it("AC-BRAND-028-3: no recharts and no ui/chart", () => {
    expect(read("package.json")).not.toMatch(/recharts|ui\/chart/);
    expect(matches(src, /recharts|ui\/chart/)).toEqual([]);
  });
});
