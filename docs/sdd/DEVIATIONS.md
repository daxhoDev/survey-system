← Back to [MAIN](MAIN.md)

# Deviations

This is the historical record of every user decision that contradicts an **already approved** spec. Edits to specs that are not yet approved are plain edits and are not recorded here. Every deviation is also propagated to all affected docs. Rules: [AGENTS.md](../../AGENTS.md) §6.6.

<!--
Entry template:

### DEV-NNN — <title>
- **Date:** YYYY-MM-DD
- **Spec said:** <what the approved spec said: spec file (relative to `docs/sdd/`), REQ-IDs and previous version, e.g. AUTH.md, REQ-AUTH-002, v1.1>
- **User decided:** <the decision>
- **Reason:** <reason>
- **Affected files:** <list>
- **CHANGELOG ref:** <entry reference>
-->

### DEV-001 — API image on Node.js 24.22.1
- **Date:** 2026-10-27
- **Spec said:** DEV_WORKFLOW.md, REQ-DEVWF-003 (AC-DEVWF-003-1), v1.0: the API image builds from `node:24.19.0-alpine`.
- **User decided:** the API image builds from `node:24.22.1-alpine`, the same version as the environment preflight's Node.js minimum.
- **Reason:** keep the production runtime aligned with the minimum version the development environment is checked against.
- **Affected files:** DEV_WORKFLOW.md, ENV.md, CONVENTIONS.md
- **CHANGELOG ref:** 2026-10-27 · DEV_WORKFLOW.md → v2.0 · task chore/sdd-bootstrap / PH-ENV-1 · DEV-001

### DEV-002 — Test database migrated and emptied instead of reset
- **Date:** 2026-10-27
- **Spec said:** DEV_WORKFLOW.md, REQ-DEVWF-002 (AC-DEVWF-002-3), v1.0: the `db` project's global setup rebuilds the test database with `prisma migrate reset --force` once per run. CONFIGURATION.md, v1.0: the `db` project "rebuilds" the test database.
- **User decided:** the global setup applies migrations with `prisma migrate deploy` and empties every application table before the run, and a global teardown empties them again after the run, so the test database is left empty. `prisma migrate reset` is no longer used. Running the `db` tests needs no consent, as long as the test database is left empty.
- **Reason:** Prisma refuses `migrate reset` when an AI agent runs it unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` holds the user's literal consent, and the user wants agents to be able to run the `db` tests without leaving data behind.
- **Affected files:** DEV_WORKFLOW.md, CONFIGURATION.md, CONVENTIONS.md
- **CHANGELOG ref:** 2026-10-27 · DEV_WORKFLOW.md v2.0 · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002; 2026-10-27 · CONFIGURATION.md → v1.1 · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002; 2026-10-27 · CONVENTIONS.md v0.2 (Testing: test database) · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002

### DEV-003 — Web visual system replaced by «Anuario estadístico»
- **Date:** 2026-10-27
- **Spec said:** BRAND.md, v1.0: the Midnight/Turquoise palettes and semantic colors (REQ-BRAND-006 … REQ-BRAND-010), Manrope and Inter (REQ-BRAND-012, REQ-BRAND-013), rounded radii and card elevation (REQ-BRAND-014, REQ-BRAND-016), button and form styles (REQ-BRAND-018, REQ-BRAND-019), the contrast table (REQ-BRAND-020), the gradient isotype and logos (REQ-BRAND-021, REQ-BRAND-025, REQ-BRAND-026), the sidebar pattern (REQ-BRAND-022) and the textured login panel (REQ-BRAND-023), with the owner's brand guide image as reference. FRONTEND.md, v1.0: Inter and Manrope (REQ-FE-001), charts with `recharts` (REQ-FE-002), the sidebar layout and its cookie (REQ-FE-013, REQ-FE-031), the header with the sidebar toggle (REQ-FE-016), the "Total de encuestas" / "Encuestas activas" cards and a table without answer counts (REQ-FE-017), card-based statistics (REQ-FE-022), the "Bloqueada" badge (REQ-FE-026), the theme-aware logo in the header and sidebar (REQ-FE-029) and the login brand panel (REQ-FE-030). The planned phases PH-FE-2 and PH-BRAND-2.
- **User decided:** the whole web app is redesigned in the «Anuario estadístico» direction, keeping the name Sondix, the identity constraints and the voice: new color tokens for a light and a dark theme (the Claro / Oscuro / Sistema selector is kept), a two-hue semantic system (teal and rust), Work Sans as the only family, 3 px control radii and square corners elsewhere, hairline rules instead of cards, dense ruled tables, ruled small multiples on a common scale as the signature move (dashboard and statistics), custom bars instead of `recharts`, a top bar instead of the sidebar, a single-column auth frame with no textures, a questionnaire-sheet answering page, and a new logo designed in its own phase (interim wordmark until then). The statuses Activa / Inactiva and the "Bloqueada" label are kept. The brand guide image `docs/brand/sondix-identity-guide.png` is deleted. PH-FE-2 is delivered by PH-BRAND-3 and PH-BRAND-2 by PH-FE-4.
- **Reason:** the user wants the web UI to look professional and serious yet distinctive for a university presentation, a portfolio and daily use by a team, and not to resemble a generic SaaS template, a generic form builder or the previous version (OVERVIEW.md, Quality bar for the web UI).
- **Affected files:** BRAND.md, FRONTEND.md, STATS.md, SURVEYS.md, API.md, OVERVIEW.md, MAIN.md, docs/brand/sondix-identity-guide.png (deleted)
- **CHANGELOG ref:** 2026-10-27 · docs/brand/sondix-identity-guide.png · task feat/web-redesign · DEV-003 (Removed); the BRAND.md → v2.0 and FRONTEND.md → v2.0 entries are added at the closes of the phases that implement them
