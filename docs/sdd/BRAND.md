← Back to [MAIN](MAIN.md)

# Brand identity

- **Module:** Brand identity
- **Module code:** BRAND
- **Version:** v4.0
- **Status:** Approved
- **Last updated:** 2026-10-28

## Description

Brand identity and visual system of Sondix: name and identity, voice and tone, and the visual system of the web app — color tokens for the light and dark themes, semantic colors, typography, shape, spacing, elevation, icons, controls, tables, the signature small multiples, motion, browser surfaces, accessibility, and the logo. The web app that applies it is specified in [FRONTEND.md](FRONTEND.md); the product overview and the quality bar for the web UI are in [OVERVIEW.md](OVERVIEW.md).

Requirement numbers keep the legacy IDs: legacy `BRAND-26` is `REQ-BRAND-026`.

### Visual direction: «Anuario estadístico»

Since v2.0 (DEV-003) the web app's visual system follows the direction «Anuario estadístico»: Sondix reads like a statistics office's yearbook — every survey compared on the same scale, numbers first. Its world lends the app four things only: type (one workhorse grotesque with tabular figures), palette (white or ink ground, one statistical teal for data, selection and primary actions, a muted rust only for problems), density (dense tables, hairline rules instead of cards) and one signature move (ruled small multiples on a common scale, REQ-BRAND-027). Navigation, layout and controls stay the standard ones of a web product. It refuses the generic SaaS card dashboard and the generic online form builder.

### Implementation history

- **v1.0** (legacy BL-24, BL-25, BL-26, October 2026): the first visual system (Midnight/Turquoise palette, Manrope and Inter, rounded cards, gradient isotype, textured login panel), derived from the owner's brand guide *Sondix — Identidad de marca y guía de estilo* v1.0. Replaced in full by v2.0 (DEV-003); only the name, the identity constraints and the voice (REQ-BRAND-001…005, REQ-BRAND-024) carry over.
- **v2.0** (task `feat/web-redesign`): «Anuario estadístico». The logo is redesigned in its own phase (PH-BRAND-4): the logo «Celda de anuario» (REQ-BRAND-021) replaces the interim wordmark used until then, and its app icons and favicons (REQ-BRAND-026) replace the v1.0 ones.

## Requirements

### REQ-BRAND-001 — Product name

Legacy ID: BRAND-01.

The product name is **Sondix**. The repository, workspace packages (`@survey-system/*`) and code identifiers keep the name `survey-system`. The web app shows "Sondix" as the document `<title>` (`apps/web/index.html`); in the top bar (REQ-FE-016) the name is the logo's wordmark (REQ-BRAND-021), not a separate text.

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
  - **Given** the top bar and the menu sheet
  - **When** they render
  - **Then** "Sondix" appears only as the wordmark of the logo (REQ-BRAND-021), not as separate text

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

### REQ-BRAND-006 — World color tokens

The world's colors are defined once as CSS custom properties in `apps/web/src/styles/global.css`, with light values on `:root` and dark values on `.dark` (REQ-BRAND-011). They are the only color values of the app; the previous palettes (`--color-midnight-*`, `--color-turquoise-*`, `--color-slate-*`, `--color-neutral-*`) are removed.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--paper` | `#FFFFFF` | `#141414` | Page ground |
| `--ink` | `#141414` | `#EDEFF1` | Text, strong rules, the selected status chip |
| `--ink-muted` | `#565C63` | `#A3A9B0` | Secondary text, table headers, captions, bar labels |
| `--rule` | `#E4E7EA` | `#2E3236` | Hairline rules between rows and cells, bar tracks |
| `--rule-strong` | `#141414` | `#EDEFF1` | Top-bar rule, table header rule, ruled-row borders |
| `--input-border` | `#767C83` | `#7D838A` | Outline of inputs, textareas, selects, secondary buttons, checkboxes and radios |
| `--surface-subtle` | `#F5F6F7` | `#1D2023` | Row hover, hovered menu items |
| `--surface-raised` | `#FFFFFF` | `#1D2023` | Popovers, menus, dialogs, sheets, toasts |
| `--teal` | `#0E6E6E` | `#5CBDBD` | Data, selection, primary actions, positive state, focus |
| `--teal-strong` | `#0A5656` | `#7ACCCC` | Hover and active of teal fills |
| `--teal-tint` | `#D5ECEC` | `#1F3B3B` | Text selection, selected option rows |
| `--on-teal` | `#FFFFFF` | `#141414` | Text and icons on teal fills |
| `--rust` | `#9A3412` | `#F0916A` | Errors, destructive actions, incomplete values |
| `--rust-strong` | `#7C2A0E` | `#F4A887` | Hover and active of rust fills |
| `--on-rust` | `#FFFFFF` | `#141414` | Text and icons on rust fills |

No other hue is used: there is no green, amber, blue or gradient anywhere in the app. Pure black (`#000000`) is never used.

**Acceptance criteria**

- **AC-BRAND-006-1**
  - **Given** `apps/web/src/styles/global.css`
  - **When** `:root` and `.dark` are read
  - **Then** every token of the table is defined with exactly the light and dark values shown
- **AC-BRAND-006-2**
  - **Given** `global.css`
  - **When** it is searched for `--color-midnight-`, `--color-turquoise-`, `--color-slate-` and `--color-neutral-`
  - **Then** there is no match
- **AC-BRAND-006-3**
  - **Given** both themes
  - **When** every color token is read
  - **Then** none is `#000000`

### REQ-BRAND-007 — Two-hue semantic system

Meaning is carried by two hues only:

- **Teal** (`--teal`): primary actions, data marks, selection, the active navigation item, and positive state (the "Activa" survey status, the "Aceptada" invitation status, success toasts).
- **Rust** (`--rust`): validation and API errors, destructive actions (delete survey, delete answer, revoke invitation, confirmation of destructive dialogs), incomplete values in the statistics, and error toasts.
- **Neutral** (`--ink` or `--ink-muted`): every other state — "Inactiva", "Bloqueada", "Pendiente", "Revocada", "Caducada", informational toasts.

State is never conveyed by color alone: every status, error and toast carries a text label (and, for errors and toasts, an icon) besides its color; teal and rust bars are always labelled with text ("Completas", "Incompletas", the option text).

**Acceptance criteria**

- **AC-BRAND-007-1**
  - **Given** the survey statuses, the invitation statuses and the toasts
  - **When** they render
  - **Then** "Activa", "Aceptada" and success toasts use teal; error toasts use rust; "Inactiva", "Bloqueada", "Pendiente", "Revocada", "Caducada" and other toasts use ink or ink-muted
- **AC-BRAND-007-2**
  - **Given** a validation error, an API error toast or a destructive button
  - **When** it renders
  - **Then** it uses rust
- **AC-BRAND-007-3**
  - **Given** any status, error, toast or data bar
  - **When** it renders
  - **Then** it carries a text label besides its color, and errors and toasts also carry an icon

### REQ-BRAND-008 — Components consume semantic tokens

Components and pages consume the semantic tokens of REQ-BRAND-006 and REQ-BRAND-009 (as Tailwind theme colors), never raw hex values. Raw values appear only in `global.css` and in the logo assets. Toasts (`sonner`) follow the active theme.

**Acceptance criteria**

- **AC-BRAND-008-1**
  - **Given** `apps/web/src/components` and `apps/web/src/pages`
  - **When** they are searched for raw hex, `rgb(` and `hsl(` color values
  - **Then** none appear outside the logo assets
- **AC-BRAND-008-2**
  - **Given** the dark theme is active
  - **When** a toast is shown
  - **Then** it uses the dark theme

### REQ-BRAND-009 — Theme token mapping

The shadcn/ui semantic variables used by the primitives (REQ-FE-002) map to the world tokens, in both themes:

| shadcn variable | World token |
|-----------------|-------------|
| `--background` | `--paper` |
| `--foreground` | `--ink` |
| `--popover`, `--card` | `--surface-raised` |
| `--popover-foreground`, `--card-foreground` | `--ink` |
| `--primary` | `--teal` |
| `--primary-foreground` | `--on-teal` |
| `--secondary`, `--muted`, `--accent` | `--surface-subtle` |
| `--secondary-foreground`, `--accent-foreground` | `--ink` |
| `--muted-foreground` | `--ink-muted` |
| `--destructive` | `--rust` |
| `--destructive-foreground` | `--on-rust` |
| `--border` | `--rule` |
| `--input` | `--input-border` |
| `--ring` | `--teal` |

The `--sidebar-*`, `--chart-*`, `--brand`, `--success*`, `--warning*`, `--info*` and `--destructive-text` variables are removed.

**Acceptance criteria**

- **AC-BRAND-009-1**
  - **Given** `global.css`
  - **When** `:root` and `.dark` are read
  - **Then** every shadcn variable of the table resolves to the world token shown
- **AC-BRAND-009-2**
  - **Given** `global.css` and `apps/web/src`
  - **When** they are searched for `--sidebar-`, `--chart-`, `--brand`, `--success`, `--warning`, `--info` and `--destructive-text`
  - **Then** there is no match

### REQ-BRAND-010 — Data colors

Data marks use the world's two hues only: a value is drawn in `--teal` on a `--rule` track; incomplete answers (and only they) are drawn in `--rust`. There is no multi-color series palette. Every chart carries its numbers as text (REQ-BRAND-028).

**Acceptance criteria**

- **AC-BRAND-010-1**
  - **Given** any data bar in the app
  - **When** it renders
  - **Then** its fill is `--teal`, or `--rust` for incomplete answers, on a `--rule` track
- **AC-BRAND-010-2**
  - **Given** a statistics view
  - **When** it renders
  - **Then** every bar shows its value as text next to it

### REQ-BRAND-011 — Theme selector

The app has a light and a dark theme (REQ-BRAND-006). The top bar (REQ-FE-016) offers a theme selector with three options — "Claro", "Oscuro", "Sistema" — default "Sistema" (follows `prefers-color-scheme`, reacting to changes). The selector is an icon-only button (accessible name "Tema"; its icon shows the active choice: sun, moon or monitor) opening a menu with the three options as radio items; below `md` the three options are shown in the menu sheet instead (REQ-FE-016). The choice is stored in `localStorage` and applied by toggling the `dark` class on `<html>` before the first paint (inline script in `index.html`) to avoid a flash of the wrong theme. Public pages (login, accept invitation, answering) apply the stored or system theme but do not show the selector. Code: `apps/web/src/lib/theme.ts` (storage key `sondix-theme`; "Sistema" removes the key) and `components/ThemeSelector.tsx`.

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
- **AC-BRAND-011-6**
  - **Given** the top bar at `md` or wider
  - **When** the theme button (accessible name "Tema") is pressed
  - **Then** a menu offers "Claro", "Oscuro" and "Sistema" as radio items with the active one checked

### REQ-BRAND-012 — Font family

One family, **Work Sans**, self-hosted through Fontsource (`@fontsource-variable/work-sans`; no external font CDN), for every text of the app (`--font-sans`; there is no separate heading font). `@fontsource-variable/inter` and `@fontsource-variable/manrope` are removed. Figures in tables, statistics, small multiples, counters, pagination and dates use tabular lining figures (`font-variant-numeric: tabular-nums lining-nums`).

**Acceptance criteria**

- **AC-BRAND-012-1**
  - **Given** the web app
  - **When** its fonts are inspected
  - **Then** the only family is Work Sans, loaded from `@fontsource-variable/work-sans`, with no external font CDN, and `apps/web/package.json` has neither `@fontsource-variable/inter` nor `@fontsource-variable/manrope`
- **AC-BRAND-012-2**
  - **Given** a table cell, a statistics value, a small-multiple figure, the pagination text or a date
  - **When** its computed style is read
  - **Then** `font-variant-numeric` includes `tabular-nums`

### REQ-BRAND-013 — Typographic scale

Typographic scale (base 16 px), exposed as Tailwind theme text sizes (size, line height, weight, tracking):

| Utility | Size | Line height | Weight | Tracking | Use |
|---------|-----:|------------:|-------:|---------:|-----|
| `text-h1` | 30 px | 1.2 | 700 | −0.01 em | Page title, survey name on the answering page |
| `text-h2` | 22 px | 1.25 | 600 | −0.01 em | Section titles |
| `text-h3` | 18 px | 1.3 | 600 | 0 | Subsections, question text on the answering page |
| `text-figure` | 26 px | 1.1 | 700 | 0 | The total of a small multiple (REQ-BRAND-027), headline counts |
| `text-body-lg` | 16 px | 1.5 | 400 | 0 | Answering page text, auth pages |
| `text-body` | 14 px | 1.5 | 400 | 0 | Interface text, controls, table cells |
| `text-small` | 13 px | 1.45 | 400 | 0 | Table headers (weight 600), summary lines, metadata |
| `text-caption` | 12 px | 1.4 | 500 | 0 | Bar labels, scale captions, help text |

No essential information is set below 12 px. Uppercase is not used for labels. `h1`–`h3` use `text-h1`–`text-h3` and `text-wrap: balance`; running text keeps a measure of at most 75 characters.

**Acceptance criteria**

- **AC-BRAND-013-1**
  - **Given** `global.css`
  - **When** the theme text sizes are read
  - **Then** the eight utilities exist with the size, line height, weight and tracking of the table, and `text-display` and `text-h4` no longer exist
- **AC-BRAND-013-2**
  - **Given** page titles and section titles
  - **When** they are inspected
  - **Then** page titles use `text-h1` and section titles `text-h2`
- **AC-BRAND-013-3**
  - **Given** any rendered text
  - **When** its computed font size is read
  - **Then** it is at least 12 px

### REQ-BRAND-014 — Radii

Controls have a 3 px radius (`--radius-control`): buttons, inputs, textareas, selects, status chips and checkboxes. Radio buttons are circular. Everything else has square corners (radius 0): tables, rules, ruled rows, sections, menus, popovers, dialogs, sheets, toasts and tooltips. The radius tokens of v1.0 (`--radius-xs` … `--radius-xl`) are removed.

**Acceptance criteria**

- **AC-BRAND-014-1**
  - **Given** `global.css`
  - **When** the radius tokens are read
  - **Then** `--radius-control` is 3 px and `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg` and `--radius-xl` do not exist
- **AC-BRAND-014-2**
  - **Given** a button, an input, a select and a status chip, and a menu, a dialog and a toast
  - **When** their computed `border-radius` is read
  - **Then** the controls have 3 px and the others 0

### REQ-BRAND-015 — Spacing and layout

Spacing uses multiples of 4 px (Tailwind's default `--spacing: 0.25rem`): tight inside a group (4–12 px), generous between groups (24–32 px), with more space above a heading than below it. Breakpoints are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280 px). Page gutters are 16 px below `md`, 24 px from `md` and 44 px from `lg`. Dashboard content is at most 80 rem (1280 px) wide; the answering page column at most 42 rem (672 px); auth pages at most 24 rem (384 px). No layout scrolls horizontally at 320 px wide or more.

**Acceptance criteria**

- **AC-BRAND-015-1**
  - **Given** `global.css`
  - **When** it is read
  - **Then** `--spacing` is not overridden (Tailwind default `0.25rem`)
- **AC-BRAND-015-2**
  - **Given** a dashboard page at 1440 px, 1024 px, 768 px and 375 px wide
  - **When** its gutters are measured
  - **Then** they are 44 px, 44 px, 24 px and 16 px, and the content is at most 1280 px wide
- **AC-BRAND-015-3**
  - **Given** every page at 320 px wide
  - **When** it renders
  - **Then** the document has no horizontal scroll

### REQ-BRAND-016 — Elevation

Page content is flat: structure comes from hairline rules (`--rule`) and strong rules (`--rule-strong`), never from cards, shadows or tinted panels. Only overlays are elevated — menus, popovers, select lists, tooltips, dialogs, sheets and toasts — on `--surface-raised` with a 1 px `--rule-strong` border (tooltips: `--ink` ground, `--paper` text, no border) and one soft shadow with offset and blur: light `0 8px 24px rgb(20 20 20 / 0.12)`, dark `0 8px 24px rgb(0 0 0 / 0.5)`. Dialogs and sheets dim the page behind with a scrim of `--ink` at 40% (light) or `--paper` at 70% (dark). No glass, blur or backdrop-filter is used.

**Acceptance criteria**

- **AC-BRAND-016-1**
  - **Given** any page
  - **When** its non-overlay elements are inspected
  - **Then** none has a `box-shadow` or a card container
- **AC-BRAND-016-2**
  - **Given** an open menu, popover, dialog, sheet or toast
  - **When** its computed style is read
  - **Then** it has the `--surface-raised` background, a 1 px `--rule-strong` border and the theme's shadow
- **AC-BRAND-016-3**
  - **Given** the web source
  - **When** it is searched for `backdrop-blur` and `backdrop-filter`
  - **Then** there is no match

### REQ-BRAND-017 — Icons

Icons come from `lucide-react` (REQ-FE-002) at their default stroke width: 16 px inside controls, table rows and status labels, 20 px in the top bar and the menu sheet. Icons accompany text; icon-only buttons (theme selector, menu button, actions menu, password visibility, copy and open link) have an accessible name. No emoji or Unicode glyph stands in for an icon.

**Acceptance criteria**

- **AC-BRAND-017-1**
  - **Given** every icon-only button
  - **When** its accessible name is computed
  - **Then** it is non-empty
- **AC-BRAND-017-2**
  - **Given** the web source
  - **When** icon imports are inspected
  - **Then** icons come from `lucide-react` with their default stroke width

### REQ-BRAND-018 — Buttons

Button variants (`components/ui/button.tsx`), all with the 3 px radius, `text-body` weight 600, height 40 px (44 px below `md`):

| Variant | Normal | Hover / active |
|---------|--------|----------------|
| `default` (primary) | `--teal` fill, `--on-teal` text | `--teal-strong` fill |
| `outline` (secondary) | transparent, 1 px `--input-border`, `--ink` text | `--surface-subtle` fill |
| `ghost` | transparent, no border, `--ink` text | `--surface-subtle` fill |
| `link` | `--teal` text, underline offset 3 px | underline thickness 2 px |
| `destructive` | `--rust` fill, `--on-rust` text | `--rust-strong` fill |

Every button also has a focus state (REQ-BRAND-020), a disabled state (50% opacity, `not-allowed` cursor, no hover change) and, where it starts a request, a loading state (spinner icon before the label, `aria-busy="true"`, the label kept, the button disabled). Each page has at most one primary button in view. Irreversible actions keep the confirmation dialog (REQ-FE-025).

**Acceptance criteria**

- **AC-BRAND-018-1**
  - **Given** `components/ui/button.tsx`
  - **When** its variants are read
  - **Then** they are `default`, `outline`, `ghost`, `link` and `destructive` with the colors of the table
- **AC-BRAND-018-2**
  - **Given** a button
  - **When** it is hovered, focused, pressed or disabled
  - **Then** each state has the style specified, and a disabled button does not react to hover
- **AC-BRAND-018-3**
  - **Given** a button that starts a request
  - **When** the request is pending
  - **Then** it shows a spinner before its label, has `aria-busy="true"` and is disabled

### REQ-BRAND-019 — Forms

Forms use persistent labels above their fields (`text-body` weight 600), mark required fields, show client-side validation errors under the field (rust, with an icon, linked with `aria-describedby`, the field marked `aria-invalid="true"` and outlined in `--rust`) and errors returned by the API in a toast with the API detail (as REQ-FE-015, REQ-FE-019, REQ-FE-023, REQ-FE-027 and REQ-FE-028 specify), keep entered data on error and are fully keyboard operable (REQ-FE-004, REQ-FE-019, REQ-FE-023, REQ-FE-028). Inputs, textareas and selects have a 1 px `--input-border` outline, `--paper` fill, 3 px radius and 40 px height (44 px below `md`); placeholders use `--ink-muted`. Checkboxes and radios are outlined with `--input-border` and filled with `--teal` when checked.

**Acceptance criteria**

- **AC-BRAND-019-1**
  - **Given** any form field
  - **When** it renders
  - **Then** it has a visible label above it, associated with it (not only a placeholder)
- **AC-BRAND-019-2**
  - **Given** a form submitted with an invalid field
  - **When** validation fails
  - **Then** a client-side validation error appears under its field in rust with an icon, the field has `aria-invalid="true"` and `aria-describedby` pointing to the error; an error returned by the API appears in a toast with the API `detail`; in both cases the entered values are kept
- **AC-BRAND-019-3**
  - **Given** any form
  - **When** it is used with the keyboard only
  - **Then** every field and button can be reached and operated
- **AC-BRAND-019-4**
  - **Given** the create-survey form (`apps/web/src/pages/SurveyCreatePage.tsx`) with a select question whose option text is empty
  - **When** it is submitted
  - **Then** the submission is blocked and "El contenido de la opción es obligatorio" appears under that option input

### REQ-BRAND-020 — Accessibility target

Target WCAG 2.2 level AA in both themes: text contrast ≥ 4.5:1 (≥ 3:1 for large text), non-text and focus indicator contrast ≥ 3:1, visible focus, keyboard navigation, accessible labels, text alternatives for charts (the numbers are text, REQ-BRAND-028), and target size at least 24 × 24 px (44 px tall for the answering page's options, REQ-FE-034). Focus is shown with `:focus-visible` as a 2 px `--teal` outline with a 2 px offset. Measured pairs (WCAG relative luminance):

| Pair | Light | Dark |
|------|------:|-----:|
| `--ink` on `--paper` | 18.42 | 15.98 |
| `--ink-muted` on `--paper` | 6.76 | 7.77 |
| `--ink-muted` on `--surface-subtle` / `--surface-raised` | 6.25 | 6.90 |
| `--teal` (text, focus ring) on `--paper` | 6.04 | 8.31 |
| `--teal` on `--surface-subtle` / `--surface-raised` | 5.59 | 7.38 |
| `--rust` (text) on `--paper` | 7.31 | 7.86 |
| `--rust` on `--surface-subtle` / `--surface-raised` | 6.75 | 6.99 |
| `--on-teal` on `--teal` | 6.04 | 8.31 |
| `--on-teal` on `--teal-strong` | 8.47 | 9.95 |
| `--on-rust` on `--rust` | 7.31 | 7.86 |
| `--on-rust` on `--rust-strong` | 9.57 | 9.47 |
| `--ink` on `--teal-tint` | 14.95 | 10.43 |
| `--input-border` on `--paper` (non-text) | 4.22 | 4.81 |
| `--teal` bar on `--rule` track (non-text) | 4.87 | 5.82 |
| `--rust` bar on `--rule` track (non-text) | 5.89 | 5.51 |
| `--ink-muted` value fill of the footer logo on `--rule` track (non-text, REQ-BRAND-021) | 5.44 | 5.44 |

`--rule` (1.24 light, 1.43 dark on `--paper`) is used only for decorative separators and bar tracks, never as the only boundary of a control.

**Acceptance criteria**

- **AC-BRAND-020-1**
  - **Given** each pair of the table in each theme
  - **When** its contrast ratio is computed
  - **Then** it is at least the value shown (and so ≥ 4.5:1 for text pairs and ≥ 3:1 for non-text pairs)
- **AC-BRAND-020-2**
  - **Given** a focused interactive element reached with the keyboard
  - **When** focus is visible
  - **Then** it has a 2 px `--teal` outline with a 2 px offset
- **AC-BRAND-020-3**
  - **Given** inputs, textareas, selects, checkboxes, radios and secondary buttons
  - **When** they render
  - **Then** their boundary is `--input-border`, never `--rule`
- **AC-BRAND-020-4**
  - **Given** any interactive element
  - **When** its target size is measured
  - **Then** it is at least 24 × 24 px

### REQ-BRAND-021 — Logo

The logo is «Celda de anuario»: an isotype that is the app's minimal unit — a ruled cell holding a value bar on its track, under a short ink bar — next to the wordmark "Sondix". Every place that shows the logo renders it through `components/Logo.tsx`.

**Isotype geometry.** One geometry on a 48 × 48 grid (`viewBox="0 0 48 48"`), used at every size without pixel snapping. All shapes are axis-aligned rectangles with square corners (no radius); the outline's stroke is centered on its edge, so its outer edge lies at `3 − stroke/2`.

| Shape | Rectangle (`x`, `y`, `width`, `height`) | Drawn as | Color role |
|-------|------------------------------------------|----------|-------------|
| Outline | 3, 3, 42, 42 | stroke only, no fill; width per form (below) | ink |
| Ink bar | 10, 12, 14, 5 | fill | ink |
| Track | 10, 28, 28, 8 | fill | track |
| Value fill | 10, 28, 19, 8 (19/28 = 67.9 % of the track), drawn over the track | fill | fill |

Forms of the isotype:

| Form | Rendered size | Outline stroke | Shapes |
|------|---------------|---------------:|--------|
| In-app isotype (default and footer lockups) | 20 px / 16 px | 4 | outline, ink bar, track, value fill |
| App icons (REQ-BRAND-026) | 76 of 112 tile units | 3 | outline, ink bar, track, value fill |
| Favicon 32 (REQ-BRAND-026) | 32 px | 4 | outline; track 10, 26, 28, 12 and value fill 10, 26, 19, 12; no ink bar |
| Favicon 16 (REQ-BRAND-026) | 16 px | 6 | outline; value fill 10, 22, 20, 16; no track, no ink bar |

**Colors.** The roles take the theme tokens of REQ-BRAND-006, so the logo follows the active theme (REQ-BRAND-011):

| Role | Default lockup | Footer variant |
|------|----------------|----------------|
| ink (outline, ink bar) | `--ink` | `--ink-muted` |
| track | `--rule` | `--rule` |
| fill (value fill) | `--teal` | `--ink-muted` |
| Wordmark | `--ink` | `--ink-muted` |

In `Logo.tsx` the isotype is an inline SVG colored with the token classes (e.g. `stroke-ink`, `fill-rule`, `fill-teal`, `fill-ink-muted`), never raw hex (REQ-BRAND-008). The footer variant has no teal.

**Wordmark.** The text "Sondix" as live text (not outlined paths), Work Sans 700, letter-spacing −0.02em, line-height 1.

**Lockup.** The isotype on the left and the wordmark on the right, vertically centered; the isotype is a square whose side equals the wordmark's font size.

| Variant | Isotype | Wordmark | Gap | Used in |
|---------|---------|----------|-----|---------|
| Default (`<Logo />`) | 20 × 20 px | 20 px | 8 px | top bar (REQ-FE-016), menu sheet, auth page frame (REQ-FE-030) |
| Footer (`<Logo variant="footer" />`, DEV-006) | 16 × 16 px | 16 px | 6 px | public answering page footer only (REQ-FE-034) |

**Accessibility.** The lockup is one element with `data-slot="logo"` (and `data-variant="footer"` for the footer variant). Its accessible name comes from the wordmark text "Sondix"; the isotype is decorative (`aria-hidden="true"`, `focusable="false"`, no `role` or `<title>`). Where the logo is a link, the link keeps its own accessible name (top bar: "Sondix, ir a encuestas", REQ-FE-016). Contrast: the ink role on `--paper` is the `--ink` / `--ink-muted` text pairs of REQ-BRAND-020; the value fill on the track is the `--teal` bar pair and, for the footer, the `--ink-muted` value-fill pair of REQ-BRAND-020.

**Acceptance criteria**

- **AC-BRAND-021-1**
  - **Given** `components/Logo.tsx` rendered without a variant
  - **When** it is inspected
  - **Then** one element with `data-slot="logo"` and no `data-variant` holds, in order, an SVG with `viewBox="0 0 48 48"`, `aria-hidden="true"` and `focusable="false"`, 20 × 20 px, and the text "Sondix" in Work Sans 700 at 20 px, letter-spacing −0.02em, in `--ink`, 8 px apart
- **AC-BRAND-021-2**
  - **Given** the default isotype
  - **When** its shapes are read
  - **Then** it has exactly the outline (3, 3, 42, 42, no fill, stroke 4, `--ink`), the ink bar (10, 12, 14, 5, `--ink`), the track (10, 28, 28, 8, `--rule`) and the value fill (10, 28, 19, 8, `--teal`) over the track, with no radius
- **AC-BRAND-021-3**
  - **Given** `components/Logo.tsx` rendered with `variant="footer"`
  - **When** it is inspected
  - **Then** the `data-slot="logo"` element has `data-variant="footer"` and holds the same isotype at 16 × 16 px, with outline, ink bar and value fill in `--ink-muted`, track in `--rule` and nothing in `--teal`, and the text "Sondix" in Work Sans 700 at 16 px in `--ink-muted`, 6 px apart
- **AC-BRAND-021-4**
  - **Given** the top bar, the menu sheet, the login and accept-invitation pages and the answering page footer
  - **When** they render the logo
  - **Then** they use `components/Logo.tsx`: the default variant in the top bar, the menu sheet and the login and accept-invitation pages, and `variant="footer"` in the answering page footer
- **AC-BRAND-021-5**
  - **Given** the code of `apps/web/src`
  - **When** the uses of `components/Logo.tsx` are listed
  - **Then** `variant="footer"` is used only in the public answering page (`pages/SurveyAnsweringPage.tsx`)
- **AC-BRAND-021-6**
  - **Given** a rendered logo
  - **When** its accessible name is computed and `Logo.tsx` is searched for raw hex, `rgb(` and `hsl(` values
  - **Then** the isotype contributes nothing (no `img` role named "Sondix"), the name comes from the text "Sondix", and no raw color value appears
- **AC-BRAND-021-7**
  - **Given** the dark theme is active
  - **When** the default logo renders
  - **Then** its colors resolve to the dark token values (`--ink` `#EDEFF1`, `--rule` `#2E3236`, `--teal` `#5CBDBD`)

### REQ-BRAND-022 — Top bar navigation pattern

Navigation is a top bar (REQ-FE-016, REQ-FE-031) holding only the sections that exist; there is no sidebar. Below `md` the sections fold into a menu button that opens a sheet. The shadcn `ui/sidebar.tsx` component and the `sidebar_state` cookie are removed.

**Acceptance criteria**

- **AC-BRAND-022-1**
  - **Given** the dashboard
  - **When** it renders
  - **Then** navigation is a top bar with only the existing sections, and below `md` a menu button opens them in a sheet (as verified by REQ-FE-016 and REQ-FE-031)
- **AC-BRAND-022-2**
  - **Given** `apps/web/src`
  - **When** it is searched for `ui/sidebar` and `sidebar_state`
  - **Then** there is no match

### REQ-BRAND-023 — No textures

The app uses no textures, gradients, glows, noise, glass or decorative imagery on any page: the world's character comes from type, rules, density and data. The login brand panel of v1.0 (`LoginBrandPanel`, `brand-noise`) is removed.

**Acceptance criteria**

- **AC-BRAND-023-1**
  - **Given** `apps/web/src/components`, `apps/web/src/pages`, `apps/web/src/styles` and `apps/web/src/lib`
  - **When** they are searched for `brand-noise`, `LoginBrandPanel`, `gradient` and `glow`
  - **Then** there is no match
- **AC-BRAND-023-2**
  - **Given** every page in both themes
  - **When** it renders
  - **Then** no element has a gradient or image background

### REQ-BRAND-024 — Voice and tone

Legacy ID: BRAND-24.

UI copy is Spanish (REQ-FE-006), professional, clear and direct: it states what happened and, when possible, how to fix it; it avoids marketing exaggeration and unnecessary jargon. The login form is in Spanish too (legacy OQ-13, decided 2026-10-09).

**Acceptance criteria**

- **AC-BRAND-024-1**
  - **Given** any UI text, the login form included
  - **When** it is read
  - **Then** it is in Spanish (verified with REQ-FE-006)

### REQ-BRAND-025 — Former logo assets removed

The v1.0 logo assets (`isotype-gradient.svg`, `isotype-midnight.svg`, `isotype-white.svg`, `logo-light.svg`, `logo-dark.svg`, `logo-mono-midnight.svg`, `logo-mono-white.svg` in `apps/web/src/assets/brand/`) are deleted, and nothing in the web app keeps the v1.0 logo colors: the gradient colors `#4AEEC8`, `#12B2D6`, `#2FDDB8`, `#17C9AB` and the v1.0 icon tile `#101827`. The current logo assets are those of REQ-BRAND-021 and REQ-BRAND-026.

**Acceptance criteria**

- **AC-BRAND-025-1**
  - **Given** `apps/web/src`
  - **When** it is searched for the seven file names above
  - **Then** there is no match, and the seven files do not exist
- **AC-BRAND-025-2**
  - **Given** `apps/web/src`, `apps/web/public` and `apps/web/index.html`
  - **When** they are searched (case-insensitive) for `#4AEEC8`, `#12B2D6`, `#2FDDB8`, `#17C9AB` and `#101827`
  - **Then** there is no match

### REQ-BRAND-026 — App icon and favicon

The app icons, favicons and home-screen icon use the isotype of REQ-BRAND-021 in the forms shown there. The three PNG files are generated by `scripts/brand-icons.ts` (REQ-BRAND-034), never drawn by hand. They are logo assets, so they carry the token values of REQ-BRAND-006 as raw hex (REQ-BRAND-008). Light colors: ink `#141414`, track `#E4E7EA`, fill `#0E6E6E`; dark colors: ink `#EDEFF1`, track `#2E3236`, fill `#5CBDBD`.

| File | Format and size | Content |
|------|-----------------|---------|
| `apps/web/public/favicon.svg` | SVG, `viewBox="0 0 48 48"` | Favicon 32 form on a transparent ground, light colors, with an embedded `<style>` whose `@media (prefers-color-scheme: dark)` rule switches the shapes to the dark colors; `role="img"`, `aria-label="Sondix"` |
| `apps/web/public/favicon.png` | PNG, 32 × 32 | Favicon 32 form, light colors, transparent ground |
| `apps/web/public/favicon-16.png` | PNG, 16 × 16 | Favicon 16 form, light colors, transparent ground |
| `apps/web/public/apple-touch-icon.png` | PNG, 180 × 180, opaque | The light app icon full-bleed: a `#FFFFFF` square with no rounded corners and no border, holding the app-icon isotype (stroke 3, light colors) at the app-icon proportion — 76/112 of the side, offset 18/112 from the top and left (122.14 px at 28.93 px) |
| `apps/web/src/assets/brand/app-icon-light.svg` | SVG, `viewBox="0 0 112 112"` | Tile: rectangle 0, 0, 112, 112 with radius 24, fill `#FFFFFF`, and a 1-unit `#E4E7EA` border (rectangle 0.5, 0.5, 111, 111, radius 23.5, stroke 1, no fill); the isotype at `translate(18 18) scale(76/48)`, stroke 3, light colors; `role="img"`, `aria-label="Sondix"` |
| `apps/web/src/assets/brand/app-icon-dark.svg` | SVG, `viewBox="0 0 112 112"` | Tile: rectangle 0, 0, 112, 112 with radius 24, fill `#141414`, no border; the isotype as in the light icon, in the dark colors; `role="img"`, `aria-label="Sondix"` |

The app icons are brand assets for use outside the app; the app does not reference them. The SVG favicon follows the browser's color scheme, not the app's theme selector (REQ-BRAND-011); the PNG favicons and the home-screen icon are light only. `apps/web/index.html` links them in its `<head>`, in this order:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

**Acceptance criteria**

- **AC-BRAND-026-1**
  - **Given** `apps/web/index.html`
  - **When** it is read
  - **Then** it holds the four links above, in that order, and each linked file exists in `apps/web/public`
- **AC-BRAND-026-2**
  - **Given** `favicon.png`, `favicon-16.png` and `apple-touch-icon.png`
  - **When** their PNG headers are read
  - **Then** they are 32 × 32, 16 × 16 and 180 × 180 pixels; the two favicons have an alpha channel, and every pixel of `apple-touch-icon.png` is fully opaque
- **AC-BRAND-026-3**
  - **Given** `favicon.svg`
  - **When** it is read
  - **Then** it has `viewBox="0 0 48 48"`, the outline (3, 3, 42, 42, stroke 4, `#141414`), the track (10, 26, 28, 12, `#E4E7EA`) and the value fill (10, 26, 19, 12, `#0E6E6E`), no ink bar and no background, and a `@media (prefers-color-scheme: dark)` rule that sets them to `#EDEFF1`, `#2E3236` and `#5CBDBD`
- **AC-BRAND-026-4**
  - **Given** `app-icon-light.svg` and `app-icon-dark.svg`
  - **When** they are read
  - **Then** each has `viewBox="0 0 112 112"`, a radius-24 tile (`#FFFFFF` with the 1-unit `#E4E7EA` border; `#141414` with no border) and the isotype of REQ-BRAND-021 at `translate(18 18) scale(76/48)` with stroke 3, in the light and the dark colors respectively
- **AC-BRAND-026-5**
  - **Given** the three PNG files
  - **When** single pixels (x, y from the top-left, 0-based) are sampled
  - **Then** they are fully opaque with these colors (± 2 per channel): `favicon.png` (2, 16) `#141414` (outline), (12, 21) `#0E6E6E` (value fill), (22, 21) `#E4E7EA` (track), and (16, 8) fully transparent (no ink bar); `favicon-16.png` (0, 8) `#141414`, (6, 9) `#0E6E6E`, and (12, 9) fully transparent (no track); `apple-touch-icon.png` (0, 0) `#FFFFFF`, (70, 65) `#141414` (ink bar), (70, 110) `#0E6E6E` and (112, 110) `#E4E7EA`

### REQ-BRAND-027 — Signature move: ruled small multiples on a common scale

The signature move of the visual system is a **ruled row of small multiples**: a set of equal cells, one per item being compared, all drawn on one common scale so that they can be compared at a glance. It is one shared component, `components/SmallMultiples.tsx`, used on the dashboard (one cell per active survey, REQ-FE-032) and in the statistics tab (one cell per select question, REQ-FE-033). Nowhere else.

- **Frame:** the row has a 1 px `--rule-strong` rule above and below; cells are separated by 1 px `--rule` vertical rules (no outer side borders, no fill, no shadow, no radius). When cells wrap onto several lines, each line is separated by a 1 px `--rule` horizontal rule.
- **Columns:** 4 cells per line from `lg`, 2 from `md`, 1 below `md` (then cells stack, separated by horizontal `--rule` rules). The statistics tab uses 3 / 2 / 1 (REQ-FE-033).
- **Cell:** 16 px padding; a title (`text-body` weight 600, wrapping to at most two lines, then truncated with an ellipsis and the full text as `title`); an optional figure (`text-figure`); then one labelled bar per measure (REQ-BRAND-028), all on the row's common scale.
- **Caption:** under the row, `text-caption` in `--ink-muted`, stating the common scale (e.g. "Escala común: 0–100 respuestas").
- **Semantics:** the row is a `<section>` with an accessible name; each cell is a list item of an `<ul>`; every number is text.

**Acceptance criteria**

- **AC-BRAND-027-1**
  - **Given** a small-multiples row at `lg`, `md` and below `md`
  - **When** it renders
  - **Then** it shows 4, 2 and 1 cells per line (3, 2 and 1 in the statistics tab), with a `--rule-strong` rule above and below, `--rule` rules between cells and between lines, and no fill, shadow or radius
- **AC-BRAND-027-2**
  - **Given** two cells whose values are 40 and 80 on a common scale of 0–100
  - **When** they render
  - **Then** the bar of the second is twice as long as the bar of the first, and both rows of bars have the same total track length
- **AC-BRAND-027-3**
  - **Given** a small-multiples row
  - **When** it renders
  - **Then** a caption under it states the common scale, and it is a `<section>` with an accessible name holding a `<ul>` with one `<li>` per cell
- **AC-BRAND-027-4**
  - **Given** the web source
  - **When** `SmallMultiples` usages are listed
  - **Then** it is used only in the dashboard and the statistics tab

### REQ-BRAND-028 — Bar component

Every data bar of the app is one small custom component, `components/Bar.tsx`, in HTML and CSS (no chart library; `recharts` and `ui/chart.tsx` are removed, REQ-FE-002). A bar row is a three-column grid: label (`text-caption`, `--ink-muted`, left), track (8 px tall, `--rule`, square ends) with its fill (`--teal`, or `--rust` for incomplete answers) whose width is `value / scaleMax` of the track, and value text (`text-caption`, tabular figures, right-aligned, optionally followed by a percentage in parentheses, e.g. "25 (40%)"). Every percentage in the app, in `Bar` and elsewhere (dashboard, statistics tab), is written with no space before "%" ("86%"). A value of 0 draws no fill but keeps its track and its "0". When the label does not fit (below `md`, or longer than the label column), the label goes on its own line above the track and value. The track and fill are `aria-hidden`; the label and value are real text, so the chart reads without color and without the graphic.

**Acceptance criteria**

- **AC-BRAND-028-1**
  - **Given** a bar with value 25 on a scale of 100
  - **When** it renders
  - **Then** its fill is 25% of the track width, and the label and "25" are visible text
- **AC-BRAND-028-2**
  - **Given** a bar with value 0
  - **When** it renders
  - **Then** it shows an empty track and the text "0"
- **AC-BRAND-028-3**
  - **Given** `apps/web/package.json` and `apps/web/src`
  - **When** they are searched for `recharts` and `ui/chart`
  - **Then** there is no match
- **AC-BRAND-028-4**
  - **Given** a bar
  - **When** the accessibility tree is read
  - **Then** the track is hidden and the label and value are exposed as text
- **AC-BRAND-028-5**
  - **Given** a bar with value 25 and percentage 40
  - **When** it renders
  - **Then** its value text reads "25 (40%)", with no space before "%"

### REQ-BRAND-029 — Dense tables

Data tables (`ui/table.tsx`, `ui/data-table.tsx`) are dense and ruled: no outer border, no fill, no radius; header cells `text-small` weight 600 in `--ink-muted`, left-aligned, with a 1 px `--rule-strong` rule under the header row; body cells `text-body`, 11 px vertical and 14 px horizontal padding, separated by 1 px `--rule` rules; numeric columns (counts, dates) right-aligned in tabular figures; rows highlight with `--surface-subtle` on hover; sortable headers are buttons showing the sort direction with an icon and `aria-sort` on the header cell. Below `md`, every table becomes a list of stacked rows: each row is a block separated by 1 px `--rule` rules, its first column as the row title (`text-body` weight 600) and the other columns as label–value lines, the actions menu at the top right of the block; there is no horizontal scroll.

**Acceptance criteria**

- **AC-BRAND-029-1**
  - **Given** a data table at `md` or wider
  - **When** it renders
  - **Then** it has a `--rule-strong` rule under the header, `--rule` rules between rows, no outer border, fill or radius, and numeric columns right-aligned with tabular figures
- **AC-BRAND-029-2**
  - **Given** a sortable column header
  - **When** it is pressed
  - **Then** the header cell's `aria-sort` changes between `ascending` and `descending` and an icon shows the direction
- **AC-BRAND-029-3**
  - **Given** a data table below `md`
  - **When** it renders
  - **Then** each row is a stacked block with its first column as title, the other columns as label–value lines and the actions menu at the top right, with no horizontal scroll

### REQ-BRAND-030 — Status chips and status labels

Status filter chips (REQ-FE-018, REQ-FE-027) are toggle buttons with the 3 px radius and `aria-pressed`: unselected, transparent with a 1 px `--input-border` outline and `--ink` text; selected, `--ink` fill with `--paper` text. Status labels in tables and headers are text, not filled badges: "Activa" and "Aceptada" in `--teal` weight 600; "Inactiva", "Pendiente", "Revocada" and "Caducada" in `--ink` or `--ink-muted`; the "Bloqueada" label (REQ-FE-026) is `--ink-muted` text with a 16 px lock icon.

**Acceptance criteria**

- **AC-BRAND-030-1**
  - **Given** a status chip
  - **When** it is selected and unselected
  - **Then** selected it has an `--ink` fill with `--paper` text and `aria-pressed="true"`; unselected it is transparent with an `--input-border` outline and `aria-pressed="false"`
- **AC-BRAND-030-2**
  - **Given** survey and invitation status labels and the "Bloqueada" label
  - **When** they render
  - **Then** they are text with the colors specified, with no filled badge background, and "Bloqueada" has a lock icon

### REQ-BRAND-031 — Motion

Motion is limited to state changes: color and background transitions of controls, and the opening and closing of menus, popovers, dialogs, sheets and toasts (a fade; menus also slide 4 px and sheets slide in from their edge). Every transition lasts at most 150 ms with an ease-out curve, starting from an already-visible state. There are no entrance animations, scroll effects, animated counters or animated bars. Under `prefers-reduced-motion: reduce`, every transition and animation is disabled.

**Acceptance criteria**

- **AC-BRAND-031-1**
  - **Given** every transition and animation in the app
  - **When** its computed duration is read
  - **Then** it is at most 150 ms with an ease-out timing function
- **AC-BRAND-031-2**
  - **Given** `prefers-reduced-motion: reduce`
  - **When** any control is hovered or any overlay opens
  - **Then** no transition or animation runs
- **AC-BRAND-031-3**
  - **Given** a page load and a data load
  - **When** content appears
  - **Then** it appears without an entrance animation and bars are drawn at their final width

### REQ-BRAND-032 — Browser surfaces

The parts the browser draws carry the design, in both themes: text selection (`::selection`) uses `--teal-tint` with `--ink` text; the caret (`caret-color`) is `--teal`; native controls use `accent-color: var(--teal)`; scrollbars use `scrollbar-color` with `--input-border` on `--paper` and `scrollbar-width: thin`; links have `text-underline-offset: 3px`; `color-scheme` is `light` or `dark` to match the theme; the focus ring is the one of REQ-BRAND-020.

**Acceptance criteria**

- **AC-BRAND-032-1**
  - **Given** `global.css`
  - **When** it is read
  - **Then** it sets `::selection`, `caret-color`, `accent-color`, `scrollbar-color`, `scrollbar-width`, `text-underline-offset` and `color-scheme` from the world tokens as specified, for both themes
- **AC-BRAND-032-2**
  - **Given** the dark theme
  - **When** text is selected
  - **Then** the selection uses the dark `--teal-tint` with `--ink` text

### REQ-BRAND-033 — Loading, empty and error states

Every data view has explicit states in the world's terms: **loading** shows skeleton rules (8 px `--rule` bars in the shape of the content, no shimmer) or, for whole pages, a single line of `--ink-muted` text (e.g. "Cargando panel..."); **empty** shows one line of `--ink-muted` text, plus a link or button to the next action when one exists; **error** shows one line of `--rust` text with an icon, plus "Reintentar" when the request can be retried. No illustration or icon-only empty state is used.

**Acceptance criteria**

- **AC-BRAND-033-1**
  - **Given** a data view whose request is pending
  - **When** it renders
  - **Then** it shows skeleton rules without animation (or the page's loading line)
- **AC-BRAND-033-2**
  - **Given** a data view with no data
  - **When** it renders
  - **Then** it shows one line of `--ink-muted` text and, when one exists, the next action
- **AC-BRAND-033-3**
  - **Given** a data view whose request failed
  - **When** it renders
  - **Then** it shows one line of `--rust` text with an icon and a "Reintentar" button that repeats the request

### REQ-BRAND-034 — Icon generator script

The three PNG files of REQ-BRAND-026 (`favicon.png`, `favicon-16.png`, `apple-touch-icon.png`) are produced by a committed developer script, `scripts/brand-icons.ts`, so they can be regenerated whenever the logo changes. It is TypeScript run directly by Node.js (type stripping, so only erasable TypeScript syntax), uses only Node.js built-in modules (e.g. `node:zlib`, `node:fs`, `node:path`) and adds no dependency.

- **Run:** from the repository root, `node scripts/brand-icons.ts [<output-dir>]`. The output directory defaults to `apps/web/public`; the script creates or overwrites the three files there and changes nothing else.
- **Drawing:** it holds the REQ-BRAND-021 geometry (the 48-unit shapes, the favicon 32, favicon 16 and app-icon forms with their strokes) and the light colors of REQ-BRAND-026 as constants. Each pixel's color comes from the exact area coverage of every rectangle (the outline is drawn as four rectangles), painted in the order track, value fill, ink shapes, over a transparent ground (favicons) or `#FFFFFF` (`apple-touch-icon.png`).
- **Output:** 8-bit RGBA PNG files with only the `IHDR`, `IDAT` and `IEND` chunks, compressed with `zlib` at level 9, with no timestamp or other metadata, so the same input always gives the same bytes. The files meet AC-BRAND-026-2 and AC-BRAND-026-5.
- **Exit code:** `0` when the three files were written; non-zero, with an error message on standard error, if any could not be written.

**Acceptance criteria**

- **AC-BRAND-034-1**
  - **Given** an empty temporary directory
  - **When** `node scripts/brand-icons.ts <that directory>` runs from the repository root
  - **Then** it exits `0` and the directory holds exactly `favicon.png`, `favicon-16.png` and `apple-touch-icon.png`, which meet AC-BRAND-026-2 and AC-BRAND-026-5
- **AC-BRAND-034-2**
  - **Given** the files it wrote
  - **When** they are compared with the committed files in `apps/web/public`
  - **Then** they are byte-for-byte identical
- **AC-BRAND-034-3**
  - **Given** an output directory that cannot be written (e.g. a path below a regular file)
  - **When** the script runs
  - **Then** it exits non-zero and prints an error on standard error
- **AC-BRAND-034-4**
  - **Given** `scripts/brand-icons.ts` and the root and workspace `package.json` files
  - **When** they are read
  - **Then** the script imports only `node:` built-in modules and no dependency was added for it

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-BRAND-1 | Existing implementation (migrated; v1.0 visual system, superseded by DEV-003) | Done | REQ-BRAND-001, REQ-BRAND-002, REQ-BRAND-003, REQ-BRAND-004, REQ-BRAND-005, REQ-BRAND-024 (and the v1.0 versions of REQ-BRAND-006 … REQ-BRAND-018, REQ-BRAND-020 … REQ-BRAND-023, REQ-BRAND-025, REQ-BRAND-026) |
| PH-BRAND-3 | Redesign foundation: tokens, Work Sans, both themes, restyled primitives, browser surfaces, top-bar shell | Done | REQ-BRAND-001, REQ-BRAND-006, REQ-BRAND-007, REQ-BRAND-008, REQ-BRAND-009, REQ-BRAND-010, REQ-BRAND-011, REQ-BRAND-012, REQ-BRAND-013, REQ-BRAND-014, REQ-BRAND-015, REQ-BRAND-016, REQ-BRAND-017, REQ-BRAND-018, REQ-BRAND-020, REQ-BRAND-021, REQ-BRAND-022, REQ-BRAND-024, REQ-BRAND-026, REQ-BRAND-027, REQ-BRAND-028, REQ-BRAND-029, REQ-BRAND-030, REQ-BRAND-031, REQ-BRAND-032, REQ-BRAND-033, REQ-FE-001, REQ-FE-002, REQ-FE-006, REQ-FE-013, REQ-FE-016, REQ-FE-029, REQ-FE-031 |
| PH-BRAND-4 | Logo «Celda de anuario», app icons, favicons and home-screen icon | Done | REQ-BRAND-001, REQ-BRAND-020, REQ-BRAND-021, REQ-BRAND-025, REQ-BRAND-026, REQ-BRAND-034, REQ-FE-029, REQ-FE-034 |

The redesign task (`feat/web-redesign`) ran seven phases in this order: PH-STAT-2 ([STATS.md](STATS.md)), PH-BRAND-3, PH-FE-3, PH-FE-4, PH-FE-5, PH-FE-6 ([FRONTEND.md](FRONTEND.md)) and PH-BRAND-4.

- **PH-BRAND-3** also delivers the Spanish loading texts formerly planned as PH-FE-2 ("Cargando panel...", "Redirigiendo...") and builds the shared components every later phase uses (`SmallMultiples`, `Bar`, tables, chips, status labels, states), exercised there with the pages that already exist. Pages not yet redesigned keep working on the new tokens. It removed the v1.0 `LoginBrandPanel` ahead of PH-FE-5, because it could not render without the removed v1.0 tokens; the rest of REQ-BRAND-023 and the auth page frame (REQ-FE-030) are still delivered by PH-FE-5. The v1.0 `chart` primitive and `recharts` stay until PH-FE-4, the v1.0 `card` primitive until PH-FE-6 (its last users are redesigned in PH-FE-5 and PH-FE-6, DEV-005; [FRONTEND.md](FRONTEND.md), Implementation phases), and the v1.0 logo SVGs until PH-FE-5 (REQ-BRAND-025), where the pages that still use them are redesigned.
- **PH-BRAND-4** started with a logo decision round run by the Manager; the user chose «Celda de anuario». REQ-BRAND-021, REQ-BRAND-025 and REQ-BRAND-026 specify its construction (geometry, colors in both themes, lockup sizes, the footer variant, app icons, favicons and home-screen icon), and REQ-BRAND-034 the committed script that generates the PNG icons. It replaces the interim wordmark (Work Sans 700 text only) that the logo slot showed from PH-BRAND-3 to PH-BRAND-4, and the v1.0 favicons and app icons kept until then.
- REQ-BRAND-019 and the percentage format of REQ-BRAND-028 (DEV-004) are covered by PH-FE-4, and REQ-BRAND-023 and REQ-BRAND-025 by PH-FE-5 (in [FRONTEND.md](FRONTEND.md)), where the pages they concern are redesigned.
