← Back to [MAIN](MAIN.md)

# Brand identity

- **Module:** Brand identity
- **Module code:** BRAND
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Brand identity and visual system of Sondix: name and identity, color palette, themes, typography, shape, spacing, elevation, icons, components, accessibility, logo, icons and textures, voice and tone. The web app that applies it is specified in [FRONTEND.md](FRONTEND.md); the product overview is in [OVERVIEW.md](OVERVIEW.md).

Requirement numbers keep the legacy IDs: legacy `BRAND-26` is `REQ-BRAND-026`.

### Source

Derived from the owner's brand guide *Sondix — Identidad de marca y guía de estilo*, v1.0 (October 2026). The guide is a design proposal; this spec is the normative subset that applies to this repository. Where the guide and this spec differ, this spec wins. The reference artwork is the owner's raster sheet *Guía de identidad visual Sondix* (October 2026), kept in the repository as [`docs/brand/sondix-identity-guide.png`](../brand/sondix-identity-guide.png).

### Implementation history

Implementation was staged (decided 2026-10-01), as three legacy backlog items:

- **Stage 1** — legacy BL-24: product name, color tokens, light/dark themes with a theme selector, Manrope, radii, semantic colors, typography scale (implemented 2026-10-02).
- **Stage 2** — legacy BL-25: isotype, logos, app icon and favicon redrawn as SVG from the final design (implemented 2026-10-02).
- **Stage 3** — legacy BL-26: textured brand panel on the login page (implemented 2026-10-09).

## Requirements

### REQ-BRAND-001 — Product name

Legacy ID: BRAND-01.

The product name is **Sondix**. The repository, workspace packages (`@survey-system/*`) and code identifiers keep the name `survey-system`. The web app shows "Sondix" as the document `<title>` (`apps/web/index.html`); in the dashboard header (REQ-FE-016) the name is the wordmark of the logo (REQ-BRAND-026), not a separate text.

**Acceptance criteria**

- **AC-BRAND-001-1**
  - **Given** `apps/web/index.html`
  - **When** it is read
  - **Then** the document `<title>` is "Sondix"
- **AC-BRAND-001-2**
  - **Given** the workspace `package.json` files
  - **When** their names are read
  - **Then** they keep the `@survey-system/*` scope
- **AC-BRAND-001-3**
  - **Given** the dashboard header and sidebar
  - **When** they render
  - **Then** "Sondix" appears only as the logo wordmark, not as separate text

### REQ-BRAND-002 — Sondix in docs and API documentation

Legacy ID: BRAND-02.

The README, the specs and the API documentation (REQ-API-035) refer to the product as Sondix (repository `survey-system`).

**Acceptance criteria**

- **AC-BRAND-002-1**
  - **Given** `README.md`, the specs and the OpenAPI document
  - **When** they name the product
  - **Then** they call it Sondix (with `survey-system` only as the repository name)

### REQ-BRAND-003 — No trademark claim

Legacy ID: BRAND-03.

Trademark registration and domain availability for "Sondix" are not verified; the name is used as the product name without any claim of registration (no `®`/`™`).

**Acceptance criteria**

- **AC-BRAND-003-1**
  - **Given** the web app, the API documentation and the README
  - **When** they are searched for `®` or `™`
  - **Then** neither appears next to "Sondix"

### REQ-BRAND-004 — No ETECSA identity

Legacy ID: BRAND-04.

Sondix must not use ETECSA's logos, corporate identity, official names or materials, and must not suggest it is an official ETECSA product, unless authorized. The web app and the API do not mention ETECSA at all; the guide's "Plataforma de gestión de encuestas para ETECSA" lockup is only an example of external use.

**Acceptance criteria**

- **AC-BRAND-004-1**
  - **Given** `apps/web` and `apps/api`
  - **When** they are searched (case-insensitive) for "ETECSA"
  - **Then** there is no match

### REQ-BRAND-005 — Slogan outside the UI

Legacy ID: BRAND-05.

The slogan "La información comienza escuchando." may appear in documentation and promotional material; it is not part of the web app UI.

**Acceptance criteria**

- **AC-BRAND-005-1**
  - **Given** `apps/web/src`
  - **When** it is searched for "La información comienza escuchando"
  - **Then** there is no match

### REQ-BRAND-006 — Brand palettes as CSS custom properties

Legacy ID: BRAND-06.

Brand palettes are defined once as CSS custom properties in `apps/web/src/styles/global.css` (`--color-<family>-<step>`, so Tailwind also exposes them as utilities, e.g. `bg-midnight-900`):

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

**Acceptance criteria**

- **AC-BRAND-006-1**
  - **Given** `apps/web/src/styles/global.css`
  - **When** it is read
  - **Then** it defines `--color-midnight-*`, `--color-turquoise-*`, `--color-slate-*` and `--color-neutral-*` for steps 100–900 with exactly the values of the table, each once

### REQ-BRAND-007 — Semantic colors

Legacy ID: BRAND-07.

Semantic colors: success `#16A34A`, warning `#D97706`, error `#DC2626`, info `#2563EB`, exposed as `--success`, `--warning`, `--destructive` and `--info` for fills (badges, buttons, icons), each with a `-foreground` for text on that fill (Neutral 100 on error and info; Midnight 900 on success and warning, which do not reach 4.5:1 with white). Text drawn in a semantic color on a page or card surface uses the per-theme text variants `--success-text`, `--warning-text`, `--destructive-text` and `--info-text` (legacy OQ-21, decided 2026-10-02):

| Token | Light | Dark |
|-------|-------|------|
| `--success-text` | `#15803D` | `#16A34A` |
| `--warning-text` | `#B45309` | `#D97706` |
| `--destructive-text` | `#DC2626` | `#F87171` |
| `--info-text` | `#2563EB` | `#60A5FA` |

State must never be conveyed by color alone: status messages and badges also carry an icon or a text label.

**Acceptance criteria**

- **AC-BRAND-007-1**
  - **Given** `global.css`
  - **When** the semantic tokens are read
  - **Then** `--success` is `#16A34A`, `--warning` `#D97706`, `--destructive` `#DC2626`, `--info` `#2563EB`; `--destructive-foreground` and `--info-foreground` are Neutral 100; `--success-foreground` and `--warning-foreground` are Midnight 900
- **AC-BRAND-007-2**
  - **Given** the light (`:root`) and dark (`.dark`) themes
  - **When** the `-text` tokens are read
  - **Then** they have the values of the table
- **AC-BRAND-007-3**
  - **Given** any status badge or status message
  - **When** it renders
  - **Then** it carries a text label or an icon besides its color

### REQ-BRAND-008 — Components consume semantic tokens

Legacy ID: BRAND-08.

Components consume **semantic tokens** (the shadcn variables: `--background`, `--primary`, …, plus `--brand` and the semantic colors of REQ-BRAND-007), never raw hex values or palette steps. Palette utilities are reserved for brand graphics. Toasts (`sonner`) follow the active theme.

**Acceptance criteria**

- **AC-BRAND-008-1**
  - **Given** `apps/web/src/components` and `apps/web/src/pages`
  - **When** they are searched for raw hex colors and palette utilities (`midnight-`, `turquoise-`, `slate-`, `neutral-` steps)
  - **Then** none appear outside brand graphics (`LoginBrandPanel`, logo assets)
- **AC-BRAND-008-2**
  - **Given** the dark theme is active
  - **When** a toast is shown
  - **Then** it uses the dark theme

### REQ-BRAND-009 — Theme token mapping

Legacy ID: BRAND-09.

The shadcn semantic tokens map to the palette as follows (`:root` = light, `.dark` = dark):

| Token | Light | Dark |
|-------|-------|------|
| `--background` | Midnight 100 | Midnight 900 |
| `--foreground` | Midnight 900 | Neutral 200 |
| `--card`, `--popover` | Neutral 100 | Midnight 800 |
| `--card-foreground`, `--popover-foreground` | Midnight 900 | Neutral 200 |
| `--secondary`, `--muted` | Slate 100 | Midnight 700 |
| `--secondary-foreground` | Midnight 900 | Neutral 200 |
| `--muted-foreground` | Slate 600 | Slate 400 |
| `--border`, `--input` | Midnight 200 | Midnight 700 |
| `--input-border` (outline of text inputs, textareas, selects) | Slate 500 | Midnight 400 |
| `--primary` | Midnight 900 | Turquoise 500 |
| `--primary-foreground` | Neutral 100 | Midnight 900 |
| `--accent` (hover/selected surfaces) | Turquoise 100 | Midnight 700 |
| `--accent-foreground` | Midnight 900 | Neutral 200 |
| `--brand` (accent text, links, highlights) | Turquoise 800 | Turquoise 400 |
| `--ring` (focus) | Turquoise 700 | Turquoise 300 |
| `--destructive` | Error `#DC2626` | Error `#DC2626` |

The `--sidebar-*` tokens follow the same mapping as their non-sidebar counterparts. Pure black is never used as a background. The light background is Midnight 100 instead of the guide's Neutral 200 and borders Midnight 200 instead of Neutral 400 (owner decision 2026-10-02, so cards and data tables, which sit on a card surface in light, stand out from the page).

**Acceptance criteria**

- **AC-BRAND-009-1**
  - **Given** `global.css`
  - **When** `:root` and `.dark` are read
  - **Then** every token of the table maps to the palette step shown for that theme
- **AC-BRAND-009-2**
  - **Given** each `--sidebar-*` token
  - **When** it is read
  - **Then** it has the same value as its non-sidebar counterpart in that theme
- **AC-BRAND-009-3**
  - **Given** both themes
  - **When** background tokens are read
  - **Then** none is pure black (`#000000`)

### REQ-BRAND-010 — Chart colors

Legacy ID: BRAND-10.

Chart series (`--chart-1` … `--chart-5`) use brand colors adapted to each theme, starting with the brand accent (light: Turquoise 700, Midnight 500, Turquoise 500, Midnight 300, Slate 500; dark: Turquoise 400, Midnight 300, Turquoise 600, Midnight 500, Slate 400). Charts keep titles, axis labels and enough context to be read without color (REQ-FE-022).

**Acceptance criteria**

- **AC-BRAND-010-1**
  - **Given** `global.css`
  - **When** `--chart-1` … `--chart-5` are read
  - **Then** light is Turquoise 700, Midnight 500, Turquoise 500, Midnight 300, Slate 500 and dark is Turquoise 400, Midnight 300, Turquoise 600, Midnight 500, Slate 400
- **AC-BRAND-010-2**
  - **Given** a statistics chart
  - **When** it renders
  - **Then** it has a title and axis labels

### REQ-BRAND-011 — Theme selector

Legacy ID: BRAND-11.

The dashboard header (REQ-FE-016) offers a theme selector with three options — "Claro", "Oscuro", "Sistema" — default "Sistema" (follows `prefers-color-scheme`, reacting to changes). The choice is stored in `localStorage` and applied by toggling the `dark` class on `<html>` before the first paint (inline script in `index.html`) to avoid a flash of the wrong theme. Public pages (login, accept invitation, answering) apply the stored or system theme but do not show the selector. Code: `apps/web/src/lib/theme.ts` (storage key `sondix-theme`; "Sistema" removes the key) and `components/ThemeSelector.tsx`.

**Acceptance criteria**

- **AC-BRAND-011-1**
  - **Given** no stored choice
  - **When** the app loads
  - **Then** the theme follows `prefers-color-scheme` and changes when the system preference changes
- **AC-BRAND-011-2**
  - **Given** the user picks "Oscuro" (or "Claro")
  - **When** the choice is applied
  - **Then** `localStorage["sondix-theme"]` stores it and `<html>` has (or lacks) the `dark` class
- **AC-BRAND-011-3**
  - **Given** the user picks "Sistema"
  - **When** the choice is applied
  - **Then** the `sondix-theme` key is removed
- **AC-BRAND-011-4**
  - **Given** a stored choice
  - **When** `index.html` loads
  - **Then** an inline script sets the `dark` class before the first paint
- **AC-BRAND-011-5**
  - **Given** the login, accept-invitation and answering pages
  - **When** they render
  - **Then** they apply the stored or system theme and show no theme selector

### REQ-BRAND-012 — Font families

Legacy ID: BRAND-12.

Two families, self-hosted through Fontsource (no external font CDN): **Manrope** (`@fontsource-variable/manrope`) for headings, navigation, buttons and brand elements (`--font-heading`), and **Inter** (`@fontsource-variable/inter`, REQ-FE-001) for body text, tables, figures and forms (`--font-sans`). No other family is used.

**Acceptance criteria**

- **AC-BRAND-012-1**
  - **Given** the web app
  - **When** its fonts are inspected
  - **Then** `--font-heading` is Manrope and `--font-sans` is Inter, both loaded from Fontsource packages, with no external font CDN and no other family

### REQ-BRAND-013 — Typographic scale

Legacy ID: BRAND-13.

Typographic scale (base 16 px), exposed as Tailwind theme text sizes:

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

Line height is 1.5 for text and 1.2–1.35 for headings. Essential information must not rely on sizes below 12 px. Uppercase is used sparingly. The levels are Tailwind utilities `text-display`, `text-h1` … `text-h4`, `text-body-lg`, `text-body`, `text-small` and `text-caption` (size, line height and weight); `h1`–`h4` use Manrope. Page titles use `text-h1`, sections `text-h2`, card titles `text-h4`; interface text, buttons, inputs, labels and tables are 14 px.

**Acceptance criteria**

- **AC-BRAND-013-1**
  - **Given** `global.css`
  - **When** the theme text sizes are read
  - **Then** `text-display`, `text-h1` … `text-h4`, `text-body-lg`, `text-body`, `text-small` and `text-caption` exist with the size and weight of the table, line height 1.5 for text levels and between 1.2 and 1.35 for headings
- **AC-BRAND-013-2**
  - **Given** `h1`–`h4` elements
  - **When** they render
  - **Then** they use Manrope
- **AC-BRAND-013-3**
  - **Given** page titles, section titles and card titles
  - **When** they are inspected
  - **Then** they use `text-h1`, `text-h2` and `text-h4` respectively

### REQ-BRAND-014 — Radii

Legacy ID: BRAND-14.

Radii: `--radius-xs` 4 px (compact elements), `--radius-sm` 6 px (inputs, controls), `--radius-md` 10 px (buttons, cards), `--radius-lg` 14 px (highlighted panels), `--radius-xl` 20 px (main containers), `rounded-full` (avatars, pills). These replace the multipliers derived from `--radius` in `global.css`.

**Acceptance criteria**

- **AC-BRAND-014-1**
  - **Given** `global.css`
  - **When** the radius tokens are read
  - **Then** `--radius-xs` is 4 px, `--radius-sm` 6 px, `--radius-md` 10 px, `--radius-lg` 14 px and `--radius-xl` 20 px, as fixed values (not multipliers of `--radius`)

### REQ-BRAND-015 — Spacing

Legacy ID: BRAND-15.

Spacing uses multiples of 4 px (Tailwind's default `--spacing: 0.25rem`): 16 px between components, 24–32 px between sections.

**Acceptance criteria**

- **AC-BRAND-015-1**
  - **Given** `global.css`
  - **When** it is read
  - **Then** `--spacing` is not overridden (Tailwind default `0.25rem`)

### REQ-BRAND-016 — Elevation

Legacy ID: BRAND-16.

Elevation is built with contrast, borders and soft shadows: level 0 flat surfaces, level 1 cards with a subtle border, level 2 menus and popovers, level 3 dialogs. Shadows are subtle and adapted to each theme; they are not used as general decoration.

**Acceptance criteria**

- **AC-BRAND-016-1**
  - **Given** a card
  - **When** it renders
  - **Then** it has a subtle border on the card surface (level 1)

### REQ-BRAND-017 — Icons

Legacy ID: BRAND-17.

Icons come from `lucide-react` (REQ-FE-002): 20 px standard, 16 px compact, 24 px highlighted. Icon-only buttons have an accessible label (`aria-label` or visually hidden text).

**Acceptance criteria**

- **AC-BRAND-017-1**
  - **Given** every icon-only button
  - **When** its accessible name is computed
  - **Then** it is non-empty (`aria-label` or visually hidden text)
- **AC-BRAND-017-2**
  - **Given** the web source
  - **When** icon imports are inspected
  - **Then** icons come from `lucide-react`

### REQ-BRAND-018 — Buttons

Legacy ID: BRAND-18.

Buttons: *primary* uses `--primary` (Midnight 900 light / Turquoise 500 dark) for main actions (create, save, confirm); *secondary* is transparent or secondary surface with a subtle border; *tertiary* (`ghost`/`link`) has no permanent background or border; *destructive* uses the error color and irreversible actions keep the confirmation dialog (REQ-FE-025). Every button has normal, hover, focus, active, disabled and loading states.

**Acceptance criteria**

- **AC-BRAND-018-1**
  - **Given** `components/ui/button.tsx`
  - **When** its variants are read
  - **Then** the default variant uses `--primary`, `outline`/`secondary` use a transparent or secondary surface with a subtle border, `ghost`/`link` have no permanent background or border, and `destructive` uses `--destructive`
- **AC-BRAND-018-2**
  - **Given** a button
  - **When** it is hovered, focused, pressed or disabled
  - **Then** each state has a distinct style

### REQ-BRAND-019 — Forms

Legacy ID: BRAND-19.

Forms use persistent labels, mark required fields, show client-side validation errors next to the field and errors returned by the API in a toast with the API detail (as REQ-FE-015, REQ-FE-019, REQ-FE-023, REQ-FE-027 and REQ-FE-028 specify), keep entered data on error and are fully keyboard operable (REQ-FE-004, REQ-FE-019, REQ-FE-023, REQ-FE-028).

**Acceptance criteria**

- **AC-BRAND-019-1**
  - **Given** any form field
  - **When** it renders
  - **Then** it has a visible label associated with it (not only a placeholder)
- **AC-BRAND-019-2**
  - **Given** a form submitted with an invalid field
  - **When** validation fails
  - **Then** a client-side validation error appears next to its field, an error returned by the API appears in a toast with the API `detail`, and in both cases the entered values are kept
- **AC-BRAND-019-3**
  - **Given** any form
  - **When** it is used with the keyboard only
  - **Then** every field and button can be reached and operated
- **AC-BRAND-019-4**
  - **Given** the create-survey form (`apps/web/src/pages/SurveyCreatePage.tsx`) with a select question whose option text is empty
  - **When** it is submitted
  - **Then** the submission is blocked and "El contenido de la opción es obligatorio" appears next to that option input

### REQ-BRAND-020 — Accessibility target

Legacy ID: BRAND-20.

Target WCAG 2.2 level AA: text contrast ≥ 4.5:1 (≥ 3:1 for large text), non-text and focus indicator contrast ≥ 3:1, visible focus, keyboard navigation, accessible labels, text alternatives for relevant charts. The guide's colors left six pairs below AA (measured 2026-10-01); legacy OQ-21 was resolved on 2026-10-02 with per-theme variants that keep the guide's colors for fills and use a darker or lighter step for text and focus:

| Pair | Guide value → ratio | Used instead → ratio |
|------|---------------------|----------------------|
| Light `--brand` text on Neutral 200 | Turquoise 700 → 3.84 | Turquoise 800 → 5.91 |
| Light focus ring on Neutral 200 | Turquoise 600 → 2.30 | Turquoise 700 → 3.84 |
| Success text on Neutral 100 (light) | `#16A34A` → 3.30 | `--success-text` `#15803D` → 5.02 |
| Warning text on Neutral 100 (light) | `#D97706` → 3.19 | `--warning-text` `#B45309` → 5.02 |
| Error text on Midnight 900 (dark) | `#DC2626` → 3.68 | `--destructive-text` `#F87171` → 6.42 |
| Info text on Midnight 900 (dark) | `#2563EB` → 3.44 | `--info-text` `#60A5FA` → 6.99 |

Focus rings use `--ring` at full opacity (2 px). Checkbox and radio outlines use `--muted-foreground`. Legacy OQ-22 (decided 2026-10-02): text inputs, textareas and selects are outlined with `--input-border` (Slate 500 on Neutral 100, 4.76:1; Midnight 400 on Midnight 800, 4.23:1), while `--border`/`--input` stay soft for cards, tables and tinted backgrounds; light `--muted-foreground` is Slate 600 (6.45:1 on Midnight 100, 6.87:1 on Slate 100) instead of the guide's Slate 500.

**Acceptance criteria**

- **AC-BRAND-020-1**
  - **Given** each text token pair of REQ-BRAND-009 and REQ-BRAND-007 on its intended surface
  - **When** its contrast ratio is computed
  - **Then** it is ≥ 4.5:1 (≥ 3:1 for large text), including the "Used instead" values of the table
- **AC-BRAND-020-2**
  - **Given** a focused interactive element
  - **When** focus is visible
  - **Then** the ring uses `--ring` at full opacity, 2 px wide
- **AC-BRAND-020-3**
  - **Given** text inputs, textareas and selects
  - **When** they render
  - **Then** they are outlined with `--input-border`; checkboxes and radios are outlined with `--muted-foreground`

### REQ-BRAND-021 — Isotype

Legacy ID: BRAND-21.

Isotype (final design, approved 2026-10-01): a stylized "S" made of two thick strokes with round caps — an upper stroke rising to the right and curling back down, and a lower stroke descending to the left and curling up — plus two circular nodes, one left of the upper stroke and one right of the lower stroke. The reference artwork is the owner's raster sheet [`docs/brand/sondix-identity-guide.png`](../brand/sondix-identity-guide.png); it is redrawn as SVG (approved 2026-10-01); the SVG redraw was validated by the owner on 2026-10-02. The redraw is point-symmetric: the lower stroke is the upper stroke rotated 180° about the centre of the isotype. Relative to the isotype height, the stroke width is 12.4 % and each node's radius is 11.4 %. Proportions and nodes are never altered; the minimum clear space equals the diameter of one node.

**Acceptance criteria**

- **AC-BRAND-021-1**
  - **Given** the isotype SVGs in `apps/web/src/assets/brand/`
  - **When** their geometry is read
  - **Then** the two strokes are point-symmetric about the centre, the stroke width is 12.4 % and each node radius 11.4 % of the isotype height, with round caps

### REQ-BRAND-022 — Side navigation pattern

Legacy ID: BRAND-22.

Side navigation (guide §8.2): a sidebar with only the sections that exist plus a top bar (legacy OQ-18, decided 2026-10-09); the guide's full structure (Resumen, Encuestas, Participantes, Resultados, Informes, Administración) is the target, and each section is added when its feature exists. Collapsible to icons on desktop, a sheet on mobile. Details in REQ-FE-031.

**Acceptance criteria**

- **AC-BRAND-022-1**
  - **Given** the dashboard
  - **When** it renders
  - **Then** it has a sidebar listing only existing sections and a top bar, collapsible to icons on desktop and a sheet on mobile (as verified by REQ-FE-031)

### REQ-BRAND-023 — Textures only on the login page

Legacy ID: BRAND-23.

Textures (digital noise, signal gradient between Midnight and Turquoise, glow) are used only on the login page (`/auth/login`), in a brand panel beside the form: Midnight 900 background, low-opacity texture, the large gradient isotype and the name "Sondix". On narrow screens the panel is hidden. Textures never sit behind the form, tables or body text; the rest of the web app has no textures. Promotional material and documentation may use them freely. Implementation (`pages/LoginPage.tsx`, `components/LoginBrandPanel.tsx`): from the `lg` breakpoint the page splits in two columns, the panel on the left; the panel uses fixed colors (same look in both themes), a 135° gradient Midnight 900 → Midnight 800 → Turquoise 900, a blurred Turquoise 500 glow at 15 % and an SVG fractal-noise texture (`brand-noise` utility) at 7 %, and is `aria-hidden` (decorative). While the panel is visible the small isotype in the login card is hidden.

**Acceptance criteria**

- **AC-BRAND-023-1**
  - **Given** `/auth/login` at `lg` or wider
  - **When** it renders
  - **Then** the page has two columns with `LoginBrandPanel` on the left, `aria-hidden`, showing the large gradient isotype and "Sondix" on a 135° gradient Midnight 900 → Midnight 800 → Turquoise 900, a Turquoise 500 glow at 15 % and the `brand-noise` texture at 7 %, identical in both themes; the small isotype in the login card is hidden
- **AC-BRAND-023-2**
  - **Given** `/auth/login` below `lg`
  - **When** it renders
  - **Then** the panel is hidden and the login card shows the small isotype
- **AC-BRAND-023-3**
  - **Given** any other page
  - **When** it is inspected
  - **Then** it uses no texture (`brand-noise`, brand gradient or glow)

### REQ-BRAND-024 — Voice and tone

Legacy ID: BRAND-24.

UI copy is Spanish (REQ-FE-006), professional, clear and direct: it states what happened and, when possible, how to fix it; it avoids marketing exaggeration and unnecessary jargon. The login form is in Spanish too (legacy OQ-13, decided 2026-10-09).

**Acceptance criteria**

- **AC-BRAND-024-1**
  - **Given** any UI text, the login form included
  - **When** it is read
  - **Then** it is in Spanish (verified with REQ-FE-006)

### REQ-BRAND-025 — Logo colors and variants

Legacy ID: BRAND-25.

Logo colors. The *claro* (color) isotype uses a turquoise-to-cyan gradient that is **exclusive to the logo** (it is not a palette color and must not be used elsewhere in the UI); the *oscuro* isotype is a single ink. Gradient values (validated 2026-10-02): strokes run from `#4AEEC8` (top right) to `#12B2D6` (bottom left); the nodes carry their own vertical gradient, `#2FDDB8` to `#17C9AB`. The logo is flat (no highlights or shadows). The wordmark "Sondix" is set in Manrope (Bold) with −0.025 em tracking, converted to outlines, to the right of the isotype (horizontal lockup): its cap height is 58 % of the isotype height and the gap between isotype and wordmark is 29 %. Variants, as SVG files in `apps/web/src/assets/brand/` (the gradient isotype is a single file used on both backgrounds):

| Background | Isotype *claro* | Isotype *oscuro* | Logo with wordmark | Monochrome logo |
|------------|-----------------|------------------|--------------------|-----------------|
| Light | gradient (`isotype-gradient.svg`) | Midnight 900 (`isotype-midnight.svg`) | gradient isotype + Midnight 900 text (`logo-light.svg`) | Midnight 900 (`logo-mono-midnight.svg`) |
| Dark | gradient (`isotype-gradient.svg`) | white (`isotype-white.svg`) | gradient isotype + white text (`logo-dark.svg`) | white (`logo-mono-white.svg`) |

**Acceptance criteria**

- **AC-BRAND-025-1**
  - **Given** `apps/web/src/assets/brand/`
  - **When** it is listed
  - **Then** it holds `isotype-gradient.svg`, `isotype-midnight.svg`, `isotype-white.svg`, `logo-light.svg`, `logo-dark.svg`, `logo-mono-midnight.svg` and `logo-mono-white.svg`
- **AC-BRAND-025-2**
  - **Given** the gradient isotype
  - **When** its fills are read
  - **Then** the strokes run `#4AEEC8` → `#12B2D6` and the nodes `#2FDDB8` → `#17C9AB`, with no highlights or shadows
- **AC-BRAND-025-3**
  - **Given** `apps/web/src` outside the logo SVGs
  - **When** it is searched for the logo gradient values
  - **Then** there is no match
- **AC-BRAND-025-4**
  - **Given** the logos with wordmark
  - **When** they are read
  - **Then** the wordmark is outlined text to the right of the isotype, Midnight 900 in `logo-light.svg` and white in `logo-dark.svg`

### REQ-BRAND-026 — App icon, favicon and logo placement

Legacy ID: BRAND-26.

App icon and favicon: a Midnight 900 rounded square (corner radius 22.5 % of the side) with the gradient isotype (*icono claro*, `app-icon-light.svg`) or the white isotype (*icono oscuro*, `app-icon-dark.svg`), the isotype spanning 60 % of the width. The favicon (`apps/web/index.html`; `apps/web/public/favicon.svg` plus a 32 px `favicon.png` fallback) uses the *icono claro*. The logo with wordmark matching the active theme (`logo-light.svg`, or `logo-dark.svg` under the `.dark` class of REQ-BRAND-011) is shown in the sidebar header at 28 px tall (`h-7`, REQ-FE-031) and, only on mobile (below `md`), in the dashboard header at 24 px tall (`h-6`, REQ-FE-016). The login form (REQ-FE-015) and the invitation acceptance page (REQ-FE-028) show the gradient isotype (`isotype-gradient.svg`), which works on both themes. The former raster `logo.png` is removed.

**Acceptance criteria**

- **AC-BRAND-026-1**
  - **Given** `apps/web/index.html`
  - **When** it is read
  - **Then** it links `/favicon.svg` (SVG) and `/favicon.png` (32 × 32 PNG), both the *icono claro*
- **AC-BRAND-026-2**
  - **Given** `app-icon-light.svg` and `app-icon-dark.svg`
  - **When** they are read
  - **Then** each is a Midnight 900 square with corner radius 22.5 % of the side holding the gradient (light) or white (dark) isotype at 60 % of the width
- **AC-BRAND-026-3**
  - **Given** the expanded sidebar
  - **When** it renders
  - **Then** the logo matching the theme is 28 px tall (`h-7`)
- **AC-BRAND-026-4**
  - **Given** the dashboard header below `md`
  - **When** it renders
  - **Then** the logo matching the theme is 24 px tall (`h-6`); from `md` up the header shows no logo
- **AC-BRAND-026-5**
  - **Given** the login form and the accept-invitation page
  - **When** they render
  - **Then** they show `isotype-gradient.svg`
- **AC-BRAND-026-6**
  - **Given** the repository
  - **When** it is searched for `logo.png`
  - **Then** no such file exists or is referenced

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-BRAND-1 | Existing implementation (migrated) | Done | REQ-BRAND-001, REQ-BRAND-002, REQ-BRAND-003, REQ-BRAND-004, REQ-BRAND-005, REQ-BRAND-006, REQ-BRAND-007, REQ-BRAND-008, REQ-BRAND-009, REQ-BRAND-010, REQ-BRAND-011, REQ-BRAND-012, REQ-BRAND-013, REQ-BRAND-014, REQ-BRAND-015, REQ-BRAND-016, REQ-BRAND-017, REQ-BRAND-018, REQ-BRAND-020, REQ-BRAND-021, REQ-BRAND-022, REQ-BRAND-023, REQ-BRAND-025, REQ-BRAND-026 |
| PH-BRAND-2 | Visible option-text error | Planned | REQ-BRAND-019 |

PH-BRAND-2 shows the empty option-text error ("El contenido de la opción es obligatorio") next to its option input in `apps/web/src/pages/SurveyCreatePage.tsx`; today it blocks the submission without showing any message.

REQ-BRAND-024 (Spanish UI copy) is covered by PH-FE-2 in [FRONTEND.md](FRONTEND.md): two loading texts are still in English.
