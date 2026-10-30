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
- **CHANGELOG ref:** 2026-10-27 · docs/brand/sondix-identity-guide.png · task feat/web-redesign · DEV-003 (Removed); 2026-10-27 · BRAND.md → v2.0 · task feat/web-redesign / PH-BRAND-3 · DEV-003; 2026-10-27 · FRONTEND.md → v2.0 · task feat/web-redesign / PH-BRAND-3 · DEV-003

### DEV-004 — Percentages written with no space before "%"
- **Date:** 2026-10-28
- **Spec said:** FRONTEND.md, REQ-FE-033 (AC-FE-033-1, AC-FE-033-2, AC-FE-033-3), v2.1: the statistics tab's percentages are formatted with `Intl.NumberFormat("es-CU", { style: "percent" })` (which gives "86%"), while its acceptance criteria and captions expect a space before "%" ("86 %", "50 · 60 %", "(100 %)", "más de 100 %").
- **User decided:** every percentage in the app is written with no space before "%" ("86%"), everywhere: the statistics tab and the `Bar` component (REQ-BRAND-028), dashboard included.
- **Reason:** remove the contradiction inside REQ-FE-033 with one format used across the whole app.
- **Affected files:** FRONTEND.md, BRAND.md, MAIN.md
- **CHANGELOG ref:** 2026-10-28 · FRONTEND.md → v3.0 · task feat/web-redesign / PH-FE-4 · DEV-004, DEV-005; 2026-10-28 · BRAND.md → v2.1 · task feat/web-redesign / PH-FE-4 · DEV-004, DEV-005

### DEV-005 — `ui/card.tsx` removed in PH-FE-6
- **Date:** 2026-10-28
- **Spec said:** BRAND.md, Implementation phases (PH-BRAND-3 note), v2.0: the v1.0 `card` and `chart` primitives and `recharts` stay until PH-FE-4; FRONTEND.md, REQ-FE-002 (AC-FE-002-3), v2.1, with the removal implied in PH-FE-4.
- **User decided:** `ui/chart.tsx` and `recharts` are removed in PH-FE-4; `ui/card.tsx` is removed in PH-FE-6, after PH-FE-5 and PH-FE-6 stop using it in the pages they redesign (`login-form.tsx`, `InvitationsPage.tsx`, `AcceptInvitationPage.tsx`, `SurveyAnsweringPage.tsx`). The `card.tsx` part of AC-FE-002-3 is covered by PH-FE-6.
- **Reason:** `ui/card.tsx` is still used by pages that are redesigned only in PH-FE-5 and PH-FE-6.
- **Affected files:** BRAND.md, FRONTEND.md, MAIN.md
- **CHANGELOG ref:** 2026-10-28 · FRONTEND.md → v3.0 · task feat/web-redesign / PH-FE-4 · DEV-004, DEV-005; 2026-10-28 · BRAND.md → v2.1 · task feat/web-redesign / PH-FE-4 · DEV-004, DEV-005; 2026-10-28 · FRONTEND.md v3.0, BRAND.md v2.1 · task feat/web-redesign / PH-FE-5 · DEV-005; 2026-10-28 · FRONTEND.md → v3.1 · task feat/web-redesign / PH-FE-6 · DEV-005, DEV-006

### DEV-006 — Smaller, muted logo in the answering page footer
- **Date:** 2026-10-28
- **Spec said:** BRAND.md, REQ-BRAND-021 (AC-BRAND-021-1), v2.1: every place showing the logo, the answering page footer included, renders "Sondix" through `components/Logo.tsx` in Work Sans 700 at 20 px in `--ink`; FRONTEND.md, REQ-FE-034, v3.0, asked for the footer logo in `--ink-muted`, small, contradicting it.
- **User decided:** `components/Logo.tsx` gets a footer variant (`variant="footer"`) that renders the wordmark at 16 px in `--ink-muted`, used only in the public answering page footer; everywhere else the logo stays 20 px in `--ink`.
- **Reason:** remove the contradiction between REQ-FE-034 and REQ-BRAND-021 found by the Implementer in PH-FE-6, keeping the footer quiet below the questionnaire.
- **Affected files:** BRAND.md, FRONTEND.md, MAIN.md
- **CHANGELOG ref:** 2026-10-28 · BRAND.md → v3.0 · task feat/web-redesign / PH-FE-6 · DEV-006; 2026-10-28 · FRONTEND.md → v3.1 · task feat/web-redesign / PH-FE-6 · DEV-006; 2026-10-28 · BRAND.md → v4.0 · task feat/web-redesign / PH-BRAND-4 · DEV-006; 2026-10-28 · FRONTEND.md → v4.0 · task feat/web-redesign / PH-BRAND-4 · DEV-006

### DEV-007 — An already-answered submission shows the answered screen
- **Date:** 2026-10-28
- **Spec said:** FRONTEND.md, REQ-FE-023 (AC-FE-023-5) and REQ-FE-024, v4.0: on any submission error the answering page shows the API `detail` in a toast, a `404` "like any other error"; a `403` (the IP already answered, REQ-ANS-003) therefore showed the English detail "Your IP already submitted an answer for this survey" in a toast.
- **User decided:** a submission rejected with `403` replaces the form with the answered screen ("Tu IP ya ha respondido a esta encuesta", REQ-FE-035); every other submission error keeps the toast with the API `detail`.
- **Reason:** the same outcome whether the duplicate is detected by the answered-status check on load or by the server on submit, with no English message in the Spanish UI.
- **Affected files:** FRONTEND.md, MAIN.md
- **CHANGELOG ref:** 2026-10-28 · FRONTEND.md → v5.0 · task feat/answer-ip-guard / PH-FE-7 · DEV-007

### DEV-008 — API deployed on Vercel instead of Render
- **Date:** 2026-10-29
- **Spec said:** DEV_WORKFLOW.md, §Deployment and REQ-DEVWF-008 (AC-DEVWF-008-1), v2.1: the API is deployed as a Docker image on Render; the web is a Vercel project rooted at `apps/web`, whose `apps/web/vercel.json` rewrites `/api/*` to `https://sondix-api.onrender.com`. Also REQ-DEVWF-003, REQ-DEVWF-007 and REQ-DEVWF-009 (v2.1), CONFIGURATION.md REQ-CFG-010 and REQ-CFG-011 (v1.1), ANSWERS.md REQ-ANS-007 (v1.1), OVERVIEW.md (v1.1) and CONVENTIONS.md §Stack (v0.3) describe the Render target.
- **User decided:** web and API run on one new Vercel project, on the Hobby plan (non-commercial use), using Vercel Services. The API is an Express app on Vercel Functions in region `iad1`, started zero-config from `src/server.ts`, and PostgreSQL is a standalone Neon database in `aws-us-east-1`. Feasibility is checked first with a throwaway spike deployment, with two projects plus a rewrite as the fallback (PH-DEVWF-4). After the spike:
  - the database pool is pooled through `attachDatabasePool`, with `DATABASE_URL` (pooled) at runtime and `DIRECT_DATABASE_URL` (direct) only for migrations;
  - migrations run in the build only for production, under an expand-then-contract rule;
  - there are no preview deployments, and variables are set in the dashboard, Production scope only, with secrets marked Sensitive;
  - the global limit of 40 requests per minute also becomes the Vercel firewall's rate-limit rule, on top of the app's in-memory limiters, which stay;
  - `TRUST_PROXY=1`, verified on the first deployment with a written checklist;
  - logs keep Vercel's one-hour retention;
  - the Dockerfile and `docker-compose.prod.yml` stay as a local production-mode trial;
  - every Render mention is removed;
  - Swagger UI is served only in development if the spike shows it cannot be served on Vercel.
- **Reason:** run the whole product on one platform and origin, without the free Render service's cold start, and keep the session cookies first-party.
- **Affected files:** DEV_WORKFLOW.md, CONVENTIONS.md, MAIN.md (PH-DEVWF-4); the other files listed under "Spec said" when the deployment is specified after the spike
- **CHANGELOG ref:** 2026-10-29 · DEV_WORKFLOW.md → v4.0 · task build/vercel-deployment / PH-DEVWF-4 · DEV-008, DEV-009, DEV-010; 2026-10-29 · CONVENTIONS.md → v0.5 · task build/vercel-deployment / PH-DEVWF-4 · DEV-008, DEV-009; 2026-10-29 · apps/web/vercel.json (Render rewrite) · task build/vercel-deployment / PH-DEVWF-4 · DEV-008

### DEV-009 — Generated Prisma client no longer committed
- **Date:** 2026-10-29
- **Spec said:** ARCHITECTURE.md, REQ-ARCH-008 (AC-ARCH-008-1), v1.0: after `prisma generate` in a clean checkout, `apps/api/src/generated/prisma` has no differences from "the committed version", so the client was versioned. The 13 files under it were tracked because the root `.gitignore` rule `src/generated` matches only `<root>/src/generated`. DEV_WORKFLOW.md REQ-DEVWF-012 (v3.0) already called it git-ignored.
- **User decided:** the generated Prisma client is not versioned. The root `.gitignore` ignores `apps/api/src/generated`, its tracked files are removed from the index (`git rm --cached`), and the client is generated locally, in the tests' environment, in the API image build and in the Vercel build. It is also kept out of Vercel deployments (REQ-DEVWF-013).
- **Reason:** found by the Reviewer in PH-DEVWF-4. Generated code that every build regenerates should not be committed, and the docs contradicted each other about it.
- **Affected files:** ARCHITECTURE.md, DEV_WORKFLOW.md, CONVENTIONS.md, MAIN.md
- **CHANGELOG ref:** 2026-10-29 · ARCHITECTURE.md → v2.0 · task build/vercel-deployment / PH-DEVWF-4 · DEV-009; 2026-10-29 · DEV_WORKFLOW.md → v4.0 · task build/vercel-deployment / PH-DEVWF-4 · DEV-008, DEV-009, DEV-010; 2026-10-29 · CONVENTIONS.md → v0.5 · task build/vercel-deployment / PH-DEVWF-4 · DEV-008, DEV-009

### DEV-010 — Spike deployed from the Vercel dashboard, after the close
- **Date:** 2026-10-29
- **Spec said:** DEV_WORKFLOW.md, REQ-DEVWF-014 (procedure, AC-DEVWF-014-2) and the PH-DEVWF-4 notes, v3.1: the user deploys the local working tree with the Vercel CLI (`pnpm dlx vercel link` / `vercel deploy`) before STOP 2, and the results are recorded at the close of PH-DEVWF-4.
- **User decided:** no Vercel CLI. PH-DEVWF-4 closes with the reviewed files, is committed, and the branch is pushed. The user then imports the repository in the dashboard as the throwaway project `sondix-spike` and deploys `build/vercel-deployment` as a Preview with Preview-only dummy variables. S8 checks the deployment's Git source. The results are recorded at the start of the next phase and drive its specs.
- **Reason:** the user prefers to work only in the Vercel dashboard, and a dashboard deployment needs a pushed commit.
- **Affected files:** DEV_WORKFLOW.md, CONVENTIONS.md, DEVIATIONS.md (DEV-009 wording), MAIN.md
- **CHANGELOG ref:** 2026-10-29 · DEV_WORKFLOW.md → v4.0 · task build/vercel-deployment / PH-DEVWF-4 · DEV-008, DEV-009, DEV-010
