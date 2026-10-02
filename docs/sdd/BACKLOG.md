# Backlog and Open Questions

[← Back to index](MAIN.md) · Process: [00-sdd-process.md](00-sdd-process.md)

- **BL-xx** — decided by the owner, not yet implemented. The spec already
  describes the target; implement it, flip the spec tags to `[implemented]`,
  update the README if affected, and remove the item from this list.
- **OQ-xx** — needs an owner decision. Agents must not resolve these on their
  own; present options with a recommendation and wait for the decision. Once
  decided, update the specs and convert it into a BL item if code must change.

## Pending work

| ID | Item | Specs |
|----|------|-------|
| BL-26 | **Login brand panel** (decided 2026-10-01): textured Midnight panel with the large isotype beside the login form, hidden on narrow screens. Uses the BL-25 isotype (`isotype-gradient.svg`). | BRAND-23, FE-15 |
| BL-02 | **Dockerfile / containerized deployment** (design agreed 2026-09-23, specified with the change): not built yet. Must install pnpm, handle the workspace (`packages/schemas`), not bake `.env` into the image, fix `CMD`, pin Node version. Design to be agreed. | DEV-WF-03, ANS-07 |

## Open questions

Resolved IDs are removed from this table and never reused (OQ-01 → ANS-05, OQ-11 → CFG-01…09/BL-05, OQ-15 → BL-04, OQ-16 → OV-01, implemented 2026-09-23; OQ-03, OQ-04, OQ-07 → BL-22, OQ-17 → BL-14, OQ-10 → BL-02, decided 2026-09-23; OQ-02, OQ-05, OQ-06, OQ-08, OQ-12 → BL-23 (DATA-06…08, SURV-17, SURV-19, ANS-04, STAT-06), OQ-09 → AUTH-03, decided and implemented 2026-09-30; OQ-21 → BRAND-07, BRAND-09, BRAND-20 (per-theme text variants), decided 2026-10-02 and implemented in BL-24).

| ID | Question | Context / options | Specs |
|----|----------|-------------------|-------|
| OQ-22 | Outline and muted-text contrast. | After BL-24 (2026-10-02) three pairs stay below WCAG AA: text input / border outlines (`--input`, `--border`) are 1.23:1 (light, Neutral 400 on Neutral 100) and 1.24:1 (dark, Midnight 700 on Midnight 800) against the 3:1 non-text target; light `--muted-foreground` on `--muted` (Slate 500 on Slate 100) is 4.31:1. Options: keep the guide's values (inputs are still identified by their label and placeholder); darker/lighter `--input` only (e.g. Slate 500 light 4.76:1, Midnight 400 dark 4.23:1) keeping soft `--border` for cards and tables; also use Slate 600 for light `--muted-foreground`. | BRAND-09, BRAND-20 |
| OQ-13 | Login form language. | UI is Spanish except the login form (English). | FE-06 |
| OQ-18 | Side navigation (brand guide §8.2). | The guide recommends a sidebar (Resumen, Encuestas, Participantes, Resultados, Informes, Administración) plus a top bar; today there is only a header (FE-13, FE-16) and most of those sections do not exist. Options: keep the header; sidebar with the existing sections only; sidebar with the full structure as features arrive. | BRAND-22, FE-13, FE-16 |
| OQ-14 | Dashboard list: pagination/search/filter/sort UI and counters. | Currently only the first 10 surveys are shown and counted. | FE-17, FE-18 |
