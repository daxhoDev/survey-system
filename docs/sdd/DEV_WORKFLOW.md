← Back to [MAIN](MAIN.md)

# Development workflow

- **Module:** Development workflow
- **Module code:** DEVWF
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Tooling, commands, demo data, code generation, migrations, the test setup and deployment.

Requirement numbers keep the legacy IDs: legacy `DEV-WF-03` is `REQ-DEVWF-003`. REQ-DEVWF-005 and REQ-DEVWF-006 are not used: their legacy requirements (branches, pull requests and merges to `master`; tests added with every change and `pnpm test` passing before a merge) were process rules, replaced by [AGENTS.md](../../AGENTS.md) (§4 Workflow, §5 Git). The same applies to the legacy Git section (default branch `master`, integration branch `development`, Conventional Commits), now defined in AGENTS.md §5. REQ-DEVWF-010 is new (no legacy ID).

Related: [CONFIGURATION.md](CONFIGURATION.md), [CONVENTIONS.md](CONVENTIONS.md).

### Prerequisites

- Node.js 24 (`engines` in `apps/api/package.json`; the Docker image pins `24.19.0`), pnpm `11.5.3` (root `devEngines`, auto-downloaded).
- PostgreSQL reachable through `DATABASE_URL`. For local work, `docker compose up -d` (root `docker-compose.yml`) starts `postgres:18-alpine` on `localhost:5432` (user and password `postgres`) with two databases: `survey_system` (development) and `survey_system_test` (tests), created by `docker/postgres/init.sql` the first time the volume is created. This compose file is for local use only, not for deployment (see Deployment).

### Commands

| Where | Command | Effect |
|-------|---------|--------|
| root | `pnpm install` | Install all workspaces |
| root | `pnpm dev` | Run `dev` of every workspace in parallel (API `tsx watch src/server.ts`, web `vite`) |
| root | `docker compose up -d` / `docker compose down` | Start / stop the local PostgreSQL (data kept in the `pgdata` volume) |
| root | `docker compose -f docker-compose.prod.yml up --build` | Build the API image and run it locally in `production` mode against its own PostgreSQL (REQ-DEVWF-003) |
| root | `docker build -f apps/api/Dockerfile -t sondix-api .` | Build the API image only |
| root | `pnpm test` | Run the tests of every workspace (`pnpm -r test`) |
| root | `pnpm generate:api` | Run Orval: regenerate `apps/web/src/lib/api` from `http://localhost:3000/api/v1/docs-raw` (API must be running) |
| `apps/api` | `pnpm exec prisma migrate dev` | Create/apply migrations |
| `apps/api` | `pnpm seed` | Load the demo data into the development database (REQ-DEVWF-001) |
| `apps/api` | `pnpm create-user` | Create an account interactively, e.g. the first one (REQ-AUTH-031) |
| `apps/api` | `DATABASE_URL=<url> pnpm exec prisma migrate deploy` | Apply pending migrations to a deployed database by hand (REQ-DEVWF-007) |
| `apps/api` | `pnpm exec prisma generate` | Regenerate the Prisma client in `src/generated/prisma` |
| `apps/api` | `pnpm build` / `pnpm start` | `tsc` → `dist/`, run `node dist/server.js` |
| `apps/api` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest: one run / watch mode / one run with a v8 coverage report (`coverage/`) |
| `packages/schemas` | `pnpm build` | `tsc` → `dist/`, used only by the production image (REQ-ARCH-012) |
| `apps/web` | `pnpm build` / `pnpm preview` / `pnpm lint` | `tsc -b && vite build`, preview, ESLint |
| `apps/web` | `pnpm test` / `pnpm test:watch` | Vitest: one run / watch mode |

Dev URLs: API `http://localhost:3000` (Swagger at `/api/v1/docs`), web `http://localhost:5173`.

### Changing things

- **API contract change**: update the Zod schemas in `packages/schemas` → service/controller → `apps/api/src/lib/openapi.ts` → run the API → `pnpm generate:api` → adapt the web. The affected docs are kept in sync as required by [AGENTS.md](../../AGENTS.md) (golden rule 4).
- **Schema change**: edit `apps/api/prisma/schema.prisma` → `prisma migrate dev --name <name>` → `prisma generate` → update the repositories' mapping; the docs ([DATA_MODEL.md](DATA_MODEL.md)) are kept in sync per AGENTS.md.
- **Environment variable**: update the env schema (`apps/api/src/config/env.ts`) and `apps/api/.env.example`; the docs ([CONFIGURATION.md](CONFIGURATION.md)) and `README.md` are kept in sync per AGENTS.md.
- Never edit `apps/api/src/generated/prisma` or the Orval output (except `mutator/customInstance.ts`).

### Deployment

Target: API as a Docker image on **Render** (free web service), web on **Vercel** (Hobby), PostgreSQL on **Neon** (free). All free tiers; decided 2026-10-12.

## Requirements

### REQ-DEVWF-001 — Demo data seed

Legacy ID: DEV-WF-01.

`pnpm seed` in `apps/api` (`prisma db seed`, which runs `apps/api/prisma/seed.ts`) fills the **development** database with demo data: the user `demo@example.com` / `demo12345` (username `demo`), three surveys (an active one with a few answers, an inactive locked one, and an unlocked draft). It is idempotent (running it again changes nothing), uses the same validated configuration as the API (`DATABASE_URL`) and refuses to run with `NODE_ENV=production`. There is no `generate:api` script in `apps/web`: the client is generated with the root `pnpm generate:api` (Orval).

**Acceptance criteria**

- **AC-DEVWF-001-1**
  - **Given** an empty, migrated development database
  - **When** `pnpm seed` runs in `apps/api`
  - **Then** the user `demo@example.com` (username `demo`, password `demo12345`) exists, together with three surveys: one active with answers, one inactive and locked, one unlocked draft
- **AC-DEVWF-001-2**
  - **Given** a database already seeded
  - **When** `pnpm seed` runs again
  - **Then** no row is added or changed
- **AC-DEVWF-001-3**
  - **Given** `NODE_ENV=production`
  - **When** `pnpm seed` runs
  - **Then** it refuses to run and writes nothing
- **AC-DEVWF-001-4**
  - **Given** `apps/web/package.json`
  - **When** its scripts are read
  - **Then** there is no `generate:api` script; the root `package.json` has it

### REQ-DEVWF-002 — Test setup

Legacy ID: DEV-WF-02.

Tests use **Vitest** in both apps. Test file locations and naming are defined in [CONVENTIONS.md](CONVENTIONS.md) §Testing.

- **API, `unit` project** (no database): services with fake repositories; middlewares and the error handler on a small Express app with Supertest; `config/env.ts`; HTTP tests of the real `app` with the repository modules replaced by in-memory fakes (`vi.mock`, `tests/helpers/fakeRepositories.ts`). Rate limiters are mocked out except in `rateLimit.test.ts`.
- **API, `db` project** (real PostgreSQL): repositories, full HTTP flows and the command-line scripts (seed, `create-user`) against `TEST_DATABASE_URL`. A global setup rebuilds that database with `prisma migrate reset --force` once per run and refuses to run unless the database name contains `test` and differs from `DATABASE_URL`; every test starts from truncated tables. Without `TEST_DATABASE_URL` the `db` project is skipped with a warning. Files run one at a time because they share the database.
- **Web** (jsdom + Testing Library): components and pages rendered with a fresh `QueryClient` and `MemoryRouter`; `fetch` is replaced by a route table (`tests/helpers.tsx`). Covered today: `AcceptInvitationPage`, `AppSidebar`, `ConfirmationDialog`, `customInstance`, `DashboardHeader`, the web configuration (`env`), `InvitationsPage`, `LockedBadge`, the login form (`LoginForm`), `LoginPage`, `SurveyAnsweringPage`, `Surveys` and the theme (`theme`).
- Tests set their own configuration (`NODE_ENV=development`, `LOG_LEVEL=silent`, test secrets); `.env` is only read for `TEST_DATABASE_URL`.
- Coverage is reported (`pnpm test:coverage` in `apps/api`) without a minimum threshold. There is no CI: tests run locally.

**Acceptance criteria**

- **AC-DEVWF-002-1**
  - **Given** no `TEST_DATABASE_URL`
  - **When** `pnpm test` runs in `apps/api`
  - **Then** the `unit` project runs, and the `db` project is skipped with a warning
- **AC-DEVWF-002-2**
  - **Given** a `TEST_DATABASE_URL` whose database name does not contain `test`, or that equals `DATABASE_URL`
  - **When** the `db` project starts
  - **Then** the global setup refuses to run and no database is reset
- **AC-DEVWF-002-3**
  - **Given** a valid `TEST_DATABASE_URL`
  - **When** the `db` project runs
  - **Then** the database is rebuilt with `prisma migrate reset --force` once per run, every test starts from truncated tables, and the files run one at a time
- **AC-DEVWF-002-4**
  - **Given** the API `unit` project
  - **When** HTTP tests of the real `app` run
  - **Then** the repository modules are replaced by the in-memory fakes and the rate limiters are mocked out, except in `rateLimit.test.ts`
- **AC-DEVWF-002-5**
  - **Given** `pnpm test:coverage` in `apps/api`
  - **When** it runs
  - **Then** a v8 coverage report is written to `coverage/` and no minimum threshold fails the run

### REQ-DEVWF-003 — API Docker image

Legacy ID: DEV-WF-03.

`apps/api/Dockerfile` builds the API image with the repository root as context (root `.dockerignore`): `node:24.19.0-alpine`, pnpm `11.5.3`, the workspace manifests and lockfile (`--frozen-lockfile`, filtered to the API and `packages/schemas`). A build stage compiles `packages/schemas`, generates the Prisma client and compiles the API; the final stage holds only production dependencies, `dist/` of both packages, `prisma/` and `prisma.config.ts`, and runs as the `node` user with `NODE_ENV=production`. No `.env` is copied: configuration comes from the environment (REQ-CFG-010). `docker-compose.prod.yml` runs the image locally against its own PostgreSQL to try it before deploying.

**Acceptance criteria**

- **AC-DEVWF-003-1**
  - **Given** the repository root
  - **When** `docker build -f apps/api/Dockerfile -t sondix-api .` runs
  - **Then** the image builds from `node:24.19.0-alpine` with pnpm `11.5.3` and `--frozen-lockfile`
- **AC-DEVWF-003-2**
  - **Given** the built image
  - **When** its final stage is inspected
  - **Then** it holds only production dependencies, `dist/` of the API and `packages/schemas`, `prisma/` and `prisma.config.ts`, no `.env`, and runs as user `node` with `NODE_ENV=production`
- **AC-DEVWF-003-3**
  - **Given** `docker compose -f docker-compose.prod.yml up --build`
  - **When** it starts
  - **Then** the API runs in `production` mode against the compose file's own PostgreSQL

### REQ-DEVWF-004 — API build typechecks

Legacy ID: DEV-WF-04.

`pnpm build` in `apps/api` must typecheck with zero errors (it also typechecks the `packages/schemas` source, REQ-ARCH-012).

**Acceptance criteria**

- **AC-DEVWF-004-1**
  - **Given** a clean checkout with dependencies installed and the Prisma client generated
  - **When** `pnpm build` runs in `apps/api`
  - **Then** it exits `0` with no TypeScript errors

### REQ-DEVWF-007 — Migrations on deploy

Legacy ID: DEV-WF-07.

The image's `CMD` runs `prisma migrate deploy` (applies only pending migrations, so it is safe on every start) and then `exec node dist/server.js`; if a migration fails the container does not start. Migrations can also be applied by hand from a development machine with `DATABASE_URL=<Neon URL> pnpm exec prisma migrate deploy` in `apps/api`. `prisma` is a production dependency of the API for this reason.

**Acceptance criteria**

- **AC-DEVWF-007-1**
  - **Given** a database with pending migrations
  - **When** the container starts
  - **Then** the pending migrations are applied before `node dist/server.js` starts; on a second start nothing is applied
- **AC-DEVWF-007-2**
  - **Given** a migration that fails
  - **When** the container starts
  - **Then** the server is not started and the container exits
- **AC-DEVWF-007-3**
  - **Given** `apps/api/package.json`
  - **When** its dependencies are read
  - **Then** `prisma` is listed under `dependencies`, not `devDependencies`

### REQ-DEVWF-008 — Web on Vercel with API rewrite

Legacy ID: DEV-WF-08.

The web is a Vercel project rooted at `apps/web`. `apps/web/vercel.json` rewrites `/api/*` to the Render service (`https://sondix-api.onrender.com`) and every other path to `index.html` (client-side routing). The browser therefore talks only to the Vercel origin: the session cookies (REQ-AUTH-001) are first-party and requests are same-origin. `VITE_API_URL` and `CORS_ORIGIN` are the Vercel URL (REQ-CFG-010, REQ-CFG-011); `TRUST_PROXY` is set in Render to the measured number of proxies (REQ-ANS-007). There are no preview deployments.

**Acceptance criteria**

- **AC-DEVWF-008-1**
  - **Given** `apps/web/vercel.json`
  - **When** it is read
  - **Then** `/api/*` is rewritten to `https://sondix-api.onrender.com/api/*` and every other path to `/index.html`

### REQ-DEVWF-009 — Free-tier cold start accepted

Legacy ID: DEV-WF-09.

Known limitation of the free tiers: Render stops the API after about 15 minutes without traffic and the next request waits for it to start (around a minute), which can exceed the time Vercel waits for the rewrite; Neon also suspends its compute when idle. No keep-alive is used (decided 2026-10-12).

**Acceptance criteria**

- **AC-DEVWF-009-1**
  - **Given** the repository
  - **When** it is searched for keep-alive mechanisms (scheduled pings, cron jobs or workflows calling the API)
  - **Then** there are none

### REQ-DEVWF-010 — Code comments cite existing docs and current behaviour

Legacy ID: none (added in the SDD migration).

A code comment that cites the documentation names an existing spec file in `docs/sdd/` and describes the current behaviour: it never points to a removed doc file or describes removed behaviour (e.g. the public signup, REQ-AUTH-013).

**Acceptance criteria**

- **AC-DEVWF-010-1**
  - **Given** every tracked file outside `docs/` (code, configuration templates, Dockerfile, test configuration)
  - **When** its comments are searched for references to `docs/sdd/` files
  - **Then** every referenced file exists in `docs/sdd/`
- **AC-DEVWF-010-2**
  - **Given** every tracked code comment
  - **When** it is read
  - **Then** none describes removed behaviour (e.g. a response "returned by signup")

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-DEVWF-1 | Existing implementation (migrated) | Done | REQ-DEVWF-001, REQ-DEVWF-002, REQ-DEVWF-003, REQ-DEVWF-004, REQ-DEVWF-007, REQ-DEVWF-008, REQ-DEVWF-009 |
| PH-DEVWF-2 | Code comments cite existing docs | Planned | REQ-DEVWF-010 |

PH-DEVWF-2 fixes the five comments that break REQ-DEVWF-010 once the legacy docs are removed:

- `apps/api/.env.example:1` and `apps/web/.env.example:1` point to `docs/sdd/05-configuration.md` (the web one also cites "CFG-09") → [CONFIGURATION.md](CONFIGURATION.md).
- `apps/api/Dockerfile:4` points to `docs/sdd/05-configuration.md` → [CONFIGURATION.md](CONFIGURATION.md).
- `apps/api/vitest.config.ts:5` points to `docs/sdd/30-dev-workflow.md` → [DEV_WORKFLOW.md](DEV_WORKFLOW.md) and [CONVENTIONS.md](CONVENTIONS.md) §Testing.
- `packages/schemas/src/userSchema.ts:58` says `userAccountSchema` is "Returned by signup and login (AUTH-12, AUTH-15)": signup no longer exists; it is returned by login and invitation acceptance (REQ-AUTH-015, REQ-AUTH-029).
