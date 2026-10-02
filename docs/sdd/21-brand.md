# 21 — Brand identity and visual system (Sondix)

[← Back to index](MAIN.md) · Related: [01 Overview](01-overview.md), [20 Frontend](20-frontend.md), [BACKLOG](BACKLOG.md)

Derived from the owner's brand guide *Sondix — Identidad de marca y guía de
estilo*, v1.0 (October 2026). The guide is a design proposal; this spec is the
normative subset that applies to this repository. Where the guide and this spec
differ, this spec wins.

Implementation is phased (decided 2026-10-01):

- **Phase 1** — BL-24: product name, color tokens, light/dark themes with a
  theme selector, Manrope, radii, semantic colors, typography scale.
- **Phase 2** — BL-25: isotype, logos, app icon and favicon redrawn as SVG
  from the final design.
- **Phase 3** — BL-26: textured brand panel on the login page.
- **Undecided** — OQ-18 (side navigation).

## 1. Name and identity

- **BRAND-01** `[pending: BL-24]` The product name is **Sondix**. The repository,
  workspace packages (`@survey-system/*`) and code identifiers keep the name
  `survey-system`. The web app shows "Sondix" as the document `<title>`
  (`apps/web/index.html`) and next to the logo in the dashboard header (FE-16).
- **BRAND-02** `[implemented]` The README, the specs and the API documentation
  (API-35) refer to the product as Sondix (repository `survey-system`).
- **BRAND-03** `[implemented]` Trademark registration and domain availability for
  "Sondix" are not verified; the name is used as the product name without any
  claim of registration (no `®`/`™`).
- **BRAND-04** `[implemented]` Sondix must not use ETECSA's logos, corporate
  identity, official names or materials, and must not suggest it is an official
  ETECSA product, unless authorized. The web app and the API do not mention
  ETECSA at all; the guide's "Plataforma de gestión de encuestas para ETECSA"
  lockup is only an example of external use.
- **BRAND-05** `[implemented]` The slogan "La información comienza escuchando."
  may appear in documentation and promotional material; it is not part of the
  web app UI.

## 2. Color palette

- **BRAND-06** `[pending: BL-24]` Brand palettes are defined once as CSS custom
  properties in `apps/web/src/styles/global.css` (`--color-<family>-<step>`, so
  Tailwind also exposes them as utilities, e.g. `bg-midnight-900`):

| Step | Midnight | Turquoise | Slate | Neutral |
|-----:|----------|-----------|-------|---------|
| 100 | `#E8EDF5` | `#E5FBF7` | `#F1F4F8` | `#FFFFFF` |
| 200 | `#C9D3E3` | `#C4F5EB` | `#E2E8F0` | `#F8FAFC` |
| 300 | `#A0B1CC` | `#99EBDD` | `#CBD5E1` | `#F1F5F9` |
| 400 | `#7188AE` | `#6CE2D1` | `#94A3B8` | `#E2E8F0` |
| 500 | `#4A638D` | `#43D9C2` | `#64748B` | `#CBD5E1` |
| 600 | `#30496F` | `#22BBA8` | `#475569` | `#94A3B8` |
| 700 | `#213653` | `#168E81` | `#334155` | `#64748B` |
| 800 | `#17263D` | `#126D64` | `#1E293B` | `#334155` |
| 900 | `#101827` | `#104F4A` | `#0F172A` | `#0F172A` |

- **BRAND-07** `[pending: BL-24]` Semantic colors: success `#16A34A`, warning
  `#D97706`, error `#DC2626`, info `#2563EB`, exposed as `--success`,
  `--warning`, `--destructive` and `--info` (each with a `-foreground`
  counterpart). State must never be conveyed by color alone: status messages and
  badges also carry an icon or a text label.
- **BRAND-08** `[pending: BL-24]` Components consume **semantic tokens** (the
  shadcn variables: `--background`, `--primary`, …), never raw hex values or
  palette steps. Palette utilities are reserved for brand graphics.

## 3. Themes

- **BRAND-09** `[pending: BL-24]` The shadcn semantic tokens map to the palette
  as follows (`:root` = light, `.dark` = dark):

| Token | Light | Dark |
|-------|-------|------|
| `--background` | Neutral 200 | Midnight 900 |
| `--foreground` | Midnight 900 | Neutral 200 |
| `--card`, `--popover` | Neutral 100 | Midnight 800 |
| `--card-foreground`, `--popover-foreground` | Midnight 900 | Neutral 200 |
| `--secondary`, `--muted` | Slate 100 | Midnight 700 |
| `--secondary-foreground` | Midnight 900 | Neutral 200 |
| `--muted-foreground` | Slate 500 | Slate 400 |
| `--border`, `--input` | Neutral 400 | Midnight 700 |
| `--primary` | Midnight 900 | Turquoise 500 |
| `--primary-foreground` | Neutral 100 | Midnight 900 |
| `--accent` (hover/selected surfaces) | Turquoise 100 | Midnight 700 |
| `--accent-foreground` | Midnight 900 | Neutral 200 |
| `--brand` (accent text, links, highlights) | Turquoise 700 | Turquoise 400 |
| `--ring` (focus) | Turquoise 600 | Turquoise 300 |
| `--destructive` | Error `#DC2626` | Error `#DC2626` |

  The `--sidebar-*` tokens follow the same mapping as their non-sidebar
  counterparts. Pure black is never used as a background.
- **BRAND-10** `[pending: BL-24]` Chart series (`--chart-1` … `--chart-5`) use
  brand colors adapted to each theme, starting with the brand accent (light:
  Turquoise 700, Midnight 500, Turquoise 500, Midnight 300, Slate 500; dark:
  Turquoise 400, Midnight 300, Turquoise 600, Midnight 500, Slate 400). Charts
  keep titles, axis labels and enough context to be read without color (FE-22).
- **BRAND-11** `[pending: BL-24]` The dashboard header (FE-16) offers a theme
  selector with three options — "Claro", "Oscuro", "Sistema" — default
  "Sistema" (follows `prefers-color-scheme`, reacting to changes). The choice is
  stored in `localStorage` and applied by toggling the `dark` class on
  `<html>` before the first paint (inline script in `index.html`) to avoid a
  flash of the wrong theme. Public pages (login, accept invitation, answering)
  apply the stored or system theme but do not show the selector.

## 4. Typography

- **BRAND-12** `[pending: BL-24]` Two families, self-hosted through Fontsource
  (no external font CDN): **Manrope** (`@fontsource-variable/manrope`) for
  headings, navigation, buttons and brand elements (`--font-heading`), and
  **Inter** (`@fontsource-variable/inter`, FE-01) for body text, tables, figures
  and forms (`--font-sans`). No other family is used.
- **BRAND-13** `[pending: BL-24]` Typographic scale (base 16 px), exposed as
  Tailwind theme text sizes:

| Level | Size | Weight | Family | Use |
|-------|-----:|-------:|--------|-----|
| Display | 40 px | 800 | Manrope | Covers, presentations |
| H1 | 32 px | 700 | Manrope | Page title |
| H2 | 24 px | 700 | Manrope | Sections |
| H3 | 20 px | 600 | Manrope | Subsections |
| H4 | 18 px | 600 | Manrope | Card titles |
| Body large | 16 px | 400 | Inter | Main text |
| Body | 14 px | 400 | Inter | Interface text |
| Small | 12 px | 400 | Inter | Metadata, help |
| Caption | 11 px | 500 | Inter | Complementary info |

  Line height is 1.5 for text and 1.2–1.35 for headings. Essential information
  must not rely on sizes below 12 px. Uppercase is used sparingly.

## 5. Shape, spacing, elevation, icons

- **BRAND-14** `[pending: BL-24]` Radii: `--radius-xs` 4 px (compact elements),
  `--radius-sm` 6 px (inputs, controls), `--radius-md` 10 px (buttons, cards),
  `--radius-lg` 14 px (highlighted panels), `--radius-xl` 20 px (main
  containers), `rounded-full` (avatars, pills). These replace the multipliers
  derived from `--radius` in `global.css`.
- **BRAND-15** `[implemented]` Spacing uses multiples of 4 px (Tailwind's default
  `--spacing: 0.25rem`): 16 px between components, 24–32 px between sections.
- **BRAND-16** `[pending: BL-24]` Elevation is built with contrast, borders and
  soft shadows: level 0 flat surfaces, level 1 cards with a subtle border,
  level 2 menus and popovers, level 3 dialogs. Shadows are subtle and adapted to
  each theme; they are not used as general decoration.
- **BRAND-17** `[pending: BL-24]` Icons come from `lucide-react` (FE-02): 20 px
  standard, 16 px compact, 24 px highlighted. Icon-only buttons have an
  accessible label (`aria-label` or visually hidden text).

## 6. Components

- **BRAND-18** `[pending: BL-24]` Buttons: *primary* uses `--primary` (Midnight
  900 light / Turquoise 500 dark) for main actions (create, save, confirm);
  *secondary* is transparent or secondary surface with a subtle border;
  *tertiary* (`ghost`/`link`) has no permanent background or border;
  *destructive* uses the error color and irreversible actions keep the
  confirmation dialog (FE-25). Every button has normal, hover, focus, active,
  disabled and loading states.
- **BRAND-19** `[pending: BL-24]` Forms use persistent labels, mark required fields,
  show errors next to the field, keep entered data on error and are fully
  keyboard operable (FE-04, FE-19, FE-23, FE-28).

## 7. Accessibility

- **BRAND-20** `[pending: BL-24]` Target WCAG 2.2 level AA: text contrast
  ≥ 4.5:1 (≥ 3:1 for large text), non-text and focus indicator contrast ≥ 3:1,
  visible focus, keyboard navigation, accessible labels, text alternatives for
  relevant charts. Measured contrast of the guide's colors (2026-10-01) leaves
  these pairs below AA — `[open: OQ-21]`:

| Pair | Ratio | Required |
|------|------:|---------:|
| Light `--brand` text, Turquoise 700 on Neutral 100 / 200 | 4.02 / 3.84 | 4.5 |
| Light focus ring, Turquoise 600 on Neutral 200 | 2.30 | 3 |
| Success `#16A34A` text on Neutral 100 | 3.30 | 4.5 |
| Warning `#D97706` text on Neutral 100 | 3.19 | 4.5 |
| Error `#DC2626` text on Midnight 900 | 3.68 | 4.5 |
| Info `#2563EB` text on Midnight 900 | 3.44 | 4.5 |

  Until OQ-21 is decided, BL-24 uses the colors as specified and the gap is
  recorded here, not silently corrected.

## 8. Logo, icons and textures

- **BRAND-21** `[pending: BL-25]` Isotype (final design, approved 2026-10-01):
  a stylized "S" made of two thick strokes with round caps — an upper stroke
  rising to the right and curling back down, and a lower stroke descending to
  the left and curling up — plus two circular nodes, one left of the upper
  stroke and one right of the lower stroke. The reference artwork is the
  owner's raster sheet *Guía de identidad visual Sondix* (October 2026), kept
  in the repository as
  [`docs/brand/sondix-identity-guide.png`](../brand/sondix-identity-guide.png); the
  agent redraws it as SVG (approved 2026-10-01); the SVG redraw was validated
  by the owner on 2026-10-02. The redraw is point-symmetric: the lower stroke
  is the upper stroke rotated 180° about the centre of the isotype. Relative
  to the isotype height, the stroke width is 12.4 % and each node's radius is
  11.4 %. Proportions and nodes are never altered; the minimum clear space
  equals the diameter of one node.
- **BRAND-25** `[pending: BL-25]` Logo colors. The *claro* (color) isotype uses
  a turquoise-to-cyan gradient that is **exclusive to the logo** (it is not a
  palette color and must not be used elsewhere in the UI); the *oscuro*
  isotype is a single ink. Gradient values (validated 2026-10-02): strokes
  run from `#4AEEC8` (top right) to `#12B2D6` (bottom left); the nodes carry
  their own vertical gradient, `#2FDDB8` to `#17C9AB`. The logo is flat (no
  highlights or shadows). The wordmark "Sondix" is set in Manrope (Bold) with
  −0.025 em tracking, converted to outlines, to the right of the isotype
  (horizontal lockup): its cap height is 58 % of the isotype height and the
  gap between isotype and wordmark is 29 %. Variants, as SVG files in
  `apps/web/src/assets/brand/` (the gradient isotype is a single file used on
  both backgrounds):

| Background | Isotype *claro* | Isotype *oscuro* | Logo with wordmark | Monochrome logo |
|------------|-----------------|------------------|--------------------|-----------------|
| Light | gradient (`isotype-gradient.svg`) | Midnight 900 (`isotype-midnight.svg`) | gradient isotype + Midnight 900 text (`logo-light.svg`) | Midnight 900 (`logo-mono-midnight.svg`) |
| Dark | gradient (`isotype-gradient.svg`) | white (`isotype-white.svg`) | gradient isotype + white text (`logo-dark.svg`) | white (`logo-mono-white.svg`) |

- **BRAND-26** `[pending: BL-25]` App icon and favicon: a Midnight 900 rounded
  square (corner radius 22.5 % of the side) with the gradient isotype
  (*icono claro*, `app-icon-light.svg`) or the white isotype (*icono oscuro*,
  `app-icon-dark.svg`), the isotype spanning 60 % of the width. The favicon
  (`apps/web/index.html`; `apps/web/public/favicon.svg` plus a 32 px
  `favicon.png` fallback) uses the *icono claro*. The dashboard header (FE-16, FE-29) shows
  the logo with wordmark matching the active theme and replaces
  `apps/web/src/assets/logo.png`.
- **BRAND-22** `[open: OQ-18]` Side navigation (guide §8.2) and its structure.
- **BRAND-23** `[pending: BL-26]` Textures (digital noise, signal gradient
  between Midnight and Turquoise, glow) are used only on the login page
  (`/auth/login`), in a brand panel beside the form: Midnight 900 background,
  low-opacity texture, the large gradient isotype and the name "Sondix". On
  narrow screens the panel is hidden. Textures never sit behind the form,
  tables or body text; the rest of the web app has no textures. Promotional
  material and documentation may use them freely.

## 9. Voice and tone

- **BRAND-24** `[implemented]` UI copy is Spanish (FE-06), professional, clear and
  direct: it states what happened and, when possible, how to fix it; it avoids
  marketing exaggeration and unnecessary jargon. Exception: the login form is in
  English — `[open: OQ-13]`.
