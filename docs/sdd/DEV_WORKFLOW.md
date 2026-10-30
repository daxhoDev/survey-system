← Back to [MAIN](MAIN.md)

# Development workflow

- **Module:** Development workflow
- **Module code:** DEVWF
- **Version:** v6.0
- **Status:** Approved
- **Last updated:** 2026-10-30

## Description

Tooling, commands, demo data, code generation, migrations, the test setup and deployment.

Requirement numbers keep the legacy IDs: legacy `DEV-WF-03` is `REQ-DEVWF-003`. REQ-DEVWF-005 and REQ-DEVWF-006 are not used: their legacy requirements (branches, pull requests and merges to `master`; tests added with every change and `pnpm test` passing before a merge) were process rules, replaced by [AGENTS.md](../../AGENTS.md) (§4 Workflow, §5 Git). The same applies to the legacy Git section (default branch `master`, integration branch `development`, Conventional Commits), now defined in AGENTS.md §5. REQ-DEVWF-010 to REQ-DEVWF-014 are new (no legacy ID).

Related: [CONFIGURATION.md](CONFIGURATION.md), [CONVENTIONS.md](CONVENTIONS.md), [ENV.md](ENV.md) (environment preflight).

### Prerequisites

- Node.js 24 (`engines` in `apps/api/package.json`; the Docker image pins `24.22.1`, which is also the minimum the environment preflight accepts, [CONVENTIONS.md](CONVENTIONS.md) §Environment preflight), pnpm `11.5.3` (root `devEngines`, auto-downloaded).
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
| root | `bash scripts/preflight.sh` | Environment preflight: checks the runtimes and their versions, runs the tests without the API `db` project, prints a summary; exit `0` only if everything passed ([ENV.md](ENV.md)) |
| root | `node scripts/brand-icons.ts` | Regenerate the PNG icons `favicon.png`, `favicon-16.png` and `apple-touch-icon.png` in `apps/web/public` from the logo geometry ([BRAND.md](BRAND.md), REQ-BRAND-034); an optional argument writes them to another directory |
| root | `bash scripts/tests/<script>.test.sh` | Run the tests of a developer script (e.g. `preflight.test.sh`, `brand-icons.test.sh`); not part of `pnpm test` ([CONVENTIONS.md](CONVENTIONS.md) §Testing) |
| root | `pnpm generate:api` | Run Orval: regenerate `apps/web/src/lib/api` from `http://localhost:3000/api/v1/docs-raw` (API must be running) |
| `apps/api` | `pnpm exec prisma migrate dev` | Create/apply migrations |
| `apps/api` | `pnpm seed` | Load the demo data into the development database (REQ-DEVWF-001) |
| `apps/api` | `pnpm create-user` | Create an account interactively, e.g. the first one (REQ-AUTH-031) |
| `apps/api` | `DATABASE_URL=<url> pnpm exec prisma migrate deploy` | Apply pending migrations to a deployed database by hand (REQ-DEVWF-007) |
| `apps/api` | `pnpm exec prisma generate` | Generate the Prisma client in `src/generated/prisma` (git-ignored, so needed after every fresh `pnpm install`, REQ-ARCH-008) |
| `apps/api` | `pnpm build` / `pnpm start` | `tsc` → `dist/`, run `node dist/server.js` |
| `apps/api` | `pnpm run vercel-build` | The API's build on Vercel: build `packages/schemas`, generate the Prisma client and, only when `VERCEL_ENV=production`, apply pending migrations through `DATABASE_URL_UNPOOLED` (REQ-DEVWF-012) |
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

Target: web and API on **one Vercel project** (Hobby plan, non-commercial use) using Vercel Services, with the API as an Express app on Vercel Functions in region `iad1`, and PostgreSQL on **Neon** (free, `aws-us-east-1`), created from the Vercel Marketplace Neon integration rather than as a standalone Neon account ([DEVIATIONS.md](DEVIATIONS.md) DEV-012). Decided 2026-10-29, replacing the earlier target of the API as a Docker image on Render ([DEVIATIONS.md](DEVIATIONS.md) DEV-008). Nothing is deployed yet: the Vercel project and its Neon database exist, but the first production build (2026-10-30) stopped at the migration step of REQ-DEVWF-012 because the direct connection variable it then expected was not set. There is no Render service.

The Neon integration injects the database variables into the Vercel project; they are not set by hand: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NO_SSL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `PGHOST`, `PGHOST_UNPOOLED`, `PGUSER`, `PGDATABASE` and `NEON_PROJECT_ID`. `DATABASE_URL` is the pooled connection string and `DATABASE_URL_UNPOOLED` the direct (non-pooled) one. The build uses only `DATABASE_URL_UNPOOLED`, for migrations (REQ-DEVWF-012); how the runtime uses `DATABASE_URL` is specified with the database pool, after the spike. The other injected variables are not used.

The Vercel project's **Node.js Version** setting (Project → Settings → Build and Deployment) must be `24.x`, the Node.js major version of the stack ([CONVENTIONS.md](CONVENTIONS.md) §Stack, §Environment preflight) and of `engines.node` in `apps/api/package.json`. Vercel installs and builds with that setting, not with `engines`: on the first production build it was `26.x`, the install ran on Node.js 26, and Prisma warned that it supports only Node.js 20, 22 and 24.

The move is done in two steps. First, PH-DEVWF-4 adds the Vercel configuration (REQ-DEVWF-011 to REQ-DEVWF-013). Once it is pushed, a throwaway deployment from the dashboard checks that Vercel Services can build this pnpm workspace (REQ-DEVWF-014). The rest of the deployment is specified after its results: the real project, its variables, the database pool, the rate limits at the Vercel firewall, migrations on deploy, the `TRUST_PROXY` measurement and the free-tier limits. Until then, REQ-DEVWF-003, REQ-DEVWF-007 and REQ-DEVWF-009, and the deployment text of [CONFIGURATION.md](CONFIGURATION.md) (REQ-CFG-010, REQ-CFG-011), [ANSWERS.md](ANSWERS.md) (REQ-ANS-007) and [OVERVIEW.md](OVERVIEW.md), still describe the Render target.

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
- **API, `db` project** (real PostgreSQL): repositories, full HTTP flows and the command-line scripts (seed, `create-user`) against `TEST_DATABASE_URL`. A global setup refuses to run unless the database name contains `test` and differs from `DATABASE_URL`. It then applies pending migrations with `prisma migrate deploy` and empties every application table (every table except Prisma's `_prisma_migrations`) before the first test. When the run ends, whether the tests passed or failed, a global teardown empties every application table again, so the test database is left empty. The database is never dropped or reset: `prisma migrate reset` is not used ([DEVIATIONS.md](DEVIATIONS.md) DEV-002). Every test starts from truncated tables. Without `TEST_DATABASE_URL` the `db` project is skipped with a warning. Files run one at a time because they share the database.
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
  - **Then** the global setup refuses to run and no database is changed
- **AC-DEVWF-002-3**
  - **Given** a valid `TEST_DATABASE_URL`
  - **When** the `db` project runs
  - **Then** pending migrations are applied with `prisma migrate deploy` (never `prisma migrate reset`), every application table is empty before the first test, every test starts from truncated tables, and the files run one at a time
- **AC-DEVWF-002-4**
  - **Given** the API `unit` project
  - **When** HTTP tests of the real `app` run
  - **Then** the repository modules are replaced by the in-memory fakes and the rate limiters are mocked out, except in `rateLimit.test.ts`
- **AC-DEVWF-002-5**
  - **Given** `pnpm test:coverage` in `apps/api`
  - **When** it runs
  - **Then** a v8 coverage report is written to `coverage/` and no minimum threshold fails the run
- **AC-DEVWF-002-6**
  - **Given** a valid `TEST_DATABASE_URL` and a test database that still holds rows from an earlier run
  - **When** the `db` project runs to the end, with all tests passing or with some failing
  - **Then** the rows present before the run are gone before the first test, every application table is empty after the run, and `_prisma_migrations` keeps its rows

### REQ-DEVWF-003 — API Docker image

Legacy ID: DEV-WF-03.

`apps/api/Dockerfile` builds the API image with the repository root as context (root `.dockerignore`): `node:24.22.1-alpine` ([DEVIATIONS.md](DEVIATIONS.md) DEV-001), pnpm `11.5.3`, the workspace manifests and lockfile (`--frozen-lockfile`, filtered to the API and `packages/schemas`). A build stage compiles `packages/schemas`, generates the Prisma client and compiles the API; the final stage holds only production dependencies, `dist/` of both packages, `prisma/` and `prisma.config.ts`, and runs as the `node` user with `NODE_ENV=production`. No `.env` is copied: configuration comes from the environment (REQ-CFG-010). `docker-compose.prod.yml` runs the image locally against its own PostgreSQL to try it before deploying.

**Acceptance criteria**

- **AC-DEVWF-003-1**
  - **Given** the repository root
  - **When** `docker build -f apps/api/Dockerfile -t sondix-api .` runs
  - **Then** the image builds from `node:24.22.1-alpine` with pnpm `11.5.3` and `--frozen-lockfile`
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

### REQ-DEVWF-008 — Web and API on one Vercel origin

Legacy ID: DEV-WF-08.

Web and API are served from one Vercel project, configured by the root `vercel.json` (REQ-DEVWF-011). Paths under `/api/` go to the API service and every other path goes to the web service, which serves `index.html` for client-side routes. The browser therefore talks only to the Vercel origin: the session cookies (REQ-AUTH-001) are first-party and requests are same-origin. `VITE_API_URL` and `CORS_ORIGIN` are the Vercel URL (REQ-CFG-010, REQ-CFG-011), and `TRUST_PROXY` is the measured number of proxies (REQ-ANS-007). The real project builds no preview deployments; this is configured once the project is specified after the spike. The spike's throwaway project (REQ-DEVWF-014) is the only exception. `apps/web/vercel.json`, which rewrote `/api/*` to Render, no longer exists ([DEVIATIONS.md](DEVIATIONS.md) DEV-008).

**Acceptance criteria**

- **AC-DEVWF-008-1**
  - **Given** the repository
  - **When** it is searched for Vercel configuration and for the Render host
  - **Then** the only `vercel.json` is the one at the root, `apps/web/vercel.json` does not exist, and no tracked file outside `docs/` contains `onrender.com`

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

### REQ-DEVWF-011 — Root Vercel configuration with Services

Legacy ID: none (task build/vercel-deployment).

The repository root `vercel.json` (`$schema` `https://openapi.vercel.sh/vercel.json`) configures one Vercel project with two **services** (Vercel Services, beta). Each service has its own root, relative to the repository root (the directory that holds `vercel.json`), and declares its own framework and build settings. These keys are set per service: in services mode they are not valid at the top level.

- `api`: root `apps/api`, framework `express`, entrypoint `src/server.ts`. Its build command runs the API's `vercel-build` script (REQ-DEVWF-012). Vercel runs the Express app with its Express support, starting from the declared entrypoint, so it does not have to detect the entry itself ([DEVIATIONS.md](DEVIATIONS.md) DEV-011). The whole app becomes one function. There is no separate entry file, and the import order of `src/server.ts` is unchanged (REQ-ARCH-003, REQ-CFG-001).
- `web`: root `apps/web`, framework `vite`. Build command `pnpm build`, output directory `dist`.

No service calls another internally: the services declare no bindings. The browser reaches each service only through the public rewrites below.

Top-level rewrites, in this order:

1. `/api/(.*)` → service `api`. The request path is kept, so the API receives `/api/v1/...` exactly as the browser sent it.
2. `/(.*)` → service `web`.

In the web service, a path that matches no file in `dist` is answered with `dist/index.html` (client-side routing; this used to be in `apps/web/vercel.json`). A path that matches a file (e.g. `/favicon.png`) is served as that file. The API function runs in region `iad1`, next to the Neon database in `aws-us-east-1`.

The configuration holds nothing else yet: no Git deployment rules, firewall rules or headers, and no other key in either service. Those are specified after the spike. Where the `vercel.json` schema allows a setting (per-service build, SPA fallback, region) in more than one place, the Implementer picks one and reports it, and the spike confirms that it works (REQ-DEVWF-014).

**Acceptance criteria**

- **AC-DEVWF-011-1**
  - **Given** the root `vercel.json`
  - **When** it is read
  - **Then** it declares the services `api` (root `apps/api`, framework `express`, entrypoint `src/server.ts`, build running the `vercel-build` script) and `web` (root `apps/web`, framework `vite`, build `pnpm build`, output `dist`), and no other service
- **AC-DEVWF-011-2**
  - **Given** the root `vercel.json`
  - **When** its top-level rewrites are read
  - **Then** the first sends `/api/(.*)` to the service `api` with the path kept, and the second sends `/(.*)` to the service `web`
- **AC-DEVWF-011-3**
  - **Given** the root `vercel.json`
  - **When** it is read
  - **Then** the web service answers paths that match no file with `index.html`, and the API function's region is `iad1`
- **AC-DEVWF-011-4**
  - **Given** `apps/api`
  - **When** it is searched for a Vercel entry file other than `src/server.ts` (e.g. `index.ts`, `app.js`, `api/`)
  - **Then** there is none, and `src/server.ts` keeps the import order of AC-ARCH-003-1
- **AC-DEVWF-011-5**
  - **Given** the root `vercel.json`
  - **When** its top-level keys and each service's keys are read
  - **Then** besides the region setting and the SPA fallback (wherever the Implementer placed them, REQ-DEVWF-011), the top level holds only `$schema`, `services` and `rewrites`, `api` holds only `root`, `framework`, `entrypoint` and `buildCommand`, and `web` holds only `root`, `framework`, `buildCommand` and `outputDirectory`; no service declares bindings

### REQ-DEVWF-012 — API `vercel-build` script

Legacy ID: none (task build/vercel-deployment).

`apps/api/package.json` has a `vercel-build` script, the API service's build on Vercel. It runs these steps in order, stops at the first step that fails, and then exits non-zero:

1. Build `packages/schemas` (`tsc` → `packages/schemas/dist`), so that plain Node resolves `@survey-system/schemas` to `dist/` (REQ-ARCH-012).
2. Generate the Prisma client (`prisma generate` → `src/generated/prisma`, which is git-ignored and not committed, REQ-ARCH-008).
3. Only when `VERCEL_ENV` is exactly `production`: `prisma migrate deploy`, with `DATABASE_URL` set to the value of `DATABASE_URL_UNPOOLED` (Neon's direct, non-pooled connection string, injected by the Neon integration, §Deployment) for that command only.

Migrations are the last step, so a build that fails never migrates the database, and a failing migration fails the build. With any other `VERCEL_ENV` value (`preview`, `development`) or none, step 3 is skipped and nothing connects to a database. If `VERCEL_ENV` is `production` and `DATABASE_URL_UNPOOLED` is unset or empty, step 3 fails with a message that names `DATABASE_URL_UNPOOLED`, before `prisma migrate deploy` runs, and so does the build. The script does not compile the API with `tsc`: Vercel compiles `src` itself. `prisma.config.ts` is unchanged (REQ-CFG-008). `DATABASE_URL_UNPOOLED` is read only by this script, never by the runtime configuration schema (REQ-CFG-001). The project's variables are specified in [CONFIGURATION.md](CONFIGURATION.md) after the spike.

**Acceptance criteria**

- **AC-DEVWF-012-1**
  - **Given** dependencies installed, no `packages/schemas/dist` and no `apps/api/src/generated/prisma`, `VERCEL_ENV` unset or `preview`, and `DATABASE_URL_UNPOOLED` pointing to a host that does not answer
  - **When** `pnpm run vercel-build` runs in `apps/api`
  - **Then** it exits `0`, `packages/schemas/dist/index.js` and `apps/api/src/generated/prisma` exist, and no migration is attempted
- **AC-DEVWF-012-2**
  - **Given** `VERCEL_ENV=production` and `DATABASE_URL_UNPOOLED` pointing to a host that does not answer, or unset
  - **When** `pnpm run vercel-build` runs in `apps/api`
  - **Then** it exits non-zero; when `DATABASE_URL_UNPOOLED` is unset, its output names `DATABASE_URL_UNPOOLED`
- **AC-DEVWF-012-3**
  - **Given** `VERCEL_ENV=production`, `DATABASE_URL` pointing to a host that does not answer, and `DATABASE_URL_UNPOOLED` set to the test database (`TEST_DATABASE_URL`)
  - **When** `pnpm run vercel-build` runs in `apps/api`
  - **Then** it exits `0` and every migration in `apps/api/prisma/migrations` is recorded in that database's `_prisma_migrations`, applied through `DATABASE_URL_UNPOOLED`
- **AC-DEVWF-012-4**
  - **Given** the `vercel-build` script
  - **When** it is read
  - **Then** `prisma migrate deploy` is its last step and runs only after the schemas build and `prisma generate` succeeded

### REQ-DEVWF-013 — Nothing secret or locally generated is uploaded to Vercel

Legacy ID: none (task build/vercel-deployment).

A root `.vercelignore` keeps these out of the files of every Vercel deployment. Most of them are already absent from a Git deployment because they are git-ignored; the file also covers an upload made with the Vercel CLI, which sends the local working tree. The CLI is not used by this project:

- every `.env` and `.env.*` file in any directory, except `.env.example`;
- `node_modules`, `dist`, `coverage`, `logs`, `.vercel` and `apps/api/src/generated` (the Prisma client, generated by the Vercel build itself, REQ-DEVWF-012);
- `.impeccable`, `apps/web/PRODUCT.md` and `apps/web/DESIGN.md`.

Generated code that is committed on purpose is uploaded like any other source: the Orval client in `apps/web/src/lib/api` (REQ-FE-008) is versioned and is not excluded.

The root `.gitignore` also lists `.vercel`, the local project link the Vercel CLI would create, so it can never be committed.

**Acceptance criteria**

- **AC-DEVWF-013-1**
  - **Given** the root `.vercelignore`
  - **When** it is read
  - **Then** it excludes `.env` and `.env.*` in every directory except `.env.example`, `node_modules`, `dist`, `coverage`, `logs`, `.vercel`, `apps/api/src/generated`, `.impeccable`, `apps/web/PRODUCT.md` and `apps/web/DESIGN.md`, and it does not exclude `apps/web/src/lib/api`
- **AC-DEVWF-013-2**
  - **Given** the root `.gitignore`
  - **When** it is read
  - **Then** it lists `.vercel`

### REQ-DEVWF-014 — Vercel Services feasibility spike

Legacy ID: none (task build/vercel-deployment).

Before the rest of the deployment is specified, the user deploys the pushed task branch once, entirely from the Vercel dashboard, to a **throwaway** Vercel Hobby project. It is a Git import, built as a Preview, with dummy variables and no database. No Vercel CLI is used. The user runs the checks below and reports them, and the throwaway project is deleted afterwards. The spike runs after PH-DEVWF-4 is closed, committed and pushed, because a dashboard deployment builds a pushed commit. Its results are recorded at the start of the next phase of this task, and they drive that phase's specs. The spike answers what the Vercel docs leave open: whether a service can use the workspace package `packages/schemas` outside its root, whether the API's build, the native `bcrypt` module and the Swagger UI files work, whether the SPA fallback and the region work under Services, and whether the runtime sets `NODE_ENV`.

**Procedure** (the user, in the Vercel dashboard, after PH-DEVWF-4 is committed and the branch `build/vercel-deployment` is pushed):

1. Log in to vercel.com with a personal Hobby account. Choose **Add New… → Project → Import Git Repository**, and pick the GitHub repository `survey-system`. If Vercel asks for access, allow its GitHub app for that repository.
2. In the import form: Project Name `sondix-spike`, Root Directory `./` (the repository root). Leave the framework preset and the build, output and install settings as they are: the root `vercel.json` defines the services. Do not add environment variables here. Click **Deploy**.

   This first deployment builds the production branch (`master`), which has no Services configuration and no variables. It may fail; ignore it (or cancel it), it is not part of the spike. If Vercel says Services are not enabled for the project, follow its message to enable them; if they cannot be enabled, record the message as S1 `FAIL`.
3. Project → Settings → Environment Variables: add these variables for the **Preview** environment only. They are dummy values, never real secrets:
   - `DATABASE_URL=postgresql://spike:spike@127.0.0.1:5432/spike`
   - `JWT_SECRET=spike-only-dummy-secret-0123456789abcdef`
   - `ACCESS_TOKEN_TTL_MINUTES=15`
   - `REFRESH_TOKEN_TTL_DAYS=7`
   - `CORS_ORIGIN=https://example.com`
   - `TRUST_PROXY=1`
   - `VITE_API_URL=https://example.com`

   Do **not** set `NODE_ENV`. Set at build time, it can make the install skip development dependencies. Whether the runtime sets it is check S2. Do not connect a Neon database or set `DATABASE_URL_UNPOOLED`: a preview build skips migrations.
4. Project → Deployments → **Create Deployment**: enter the branch `build/vercel-deployment` and create it. It is built as a Preview, because it is not the production branch, so it uses the Preview variables of step 3. If the dashboard offers no way to deploy that branch, tell the Manager. Note the deployment URL and open it in the browser where you are logged in to Vercel (previews are behind Vercel Authentication).
5. Run the checks S1–S10 and fill in the results table below. Report the table to the Manager, with the build log lines of S1 and the request log line of S9.
6. Delete the throwaway project (Settings → Delete Project). The Vercel GitHub app can stay installed: the real project uses it later.

**Checks:**

| # | Check | Expected (`PASS`) |
|---|---|---|
| S1 | Deployment → Build Logs | The build completes. The log shows the schemas build and `prisma generate` of the `api` service, no migration step, and the web's `vite build`. Record which file the log names as the API's entrypoint |
| S2 | `GET <url>/api/v1/docs-raw` | `200` with the OpenAPI JSON (`info.title` "Sondix API"). If not, Runtime Logs show why (e.g. `Invalid environment configuration` naming `NODE_ENV`, a missing `@survey-system/schemas` or `bcrypt` module). Record which source file the deployment's function (Deployment → Functions or Resources) is built from; the expected entry is `src/server.ts`, the entrypoint `vercel.json` declares |
| S3 | `GET <url>/api/v1/does-not-exist` | `404` `application/problem+json` whose `detail` names `/api/v1/does-not-exist` (the path reached Express unchanged), with no `stack` field (production mode, REQ-API-013) |
| S4 | `GET <url>/api/v1/docs/` | The Swagger UI page renders with its styles and the endpoint list (its JS/CSS files load) |
| S5 | `GET <url>/` and `GET <url>/surveys/spike-check` | Both return the web app (the `index.html` page, not a Vercel `404`) |
| S6 | `GET <url>/favicon.png` | The PNG icon (`image/png`), not `index.html` |
| S7 | Deployment → Functions (or Resources) | The API function's region is `iad1` |
| S8 | Deployment → Source (the files taken from Git) | No `.env` file other than `.env.example`, no `apps/api/src/generated`, and no `node_modules` or `dist` folder (REQ-DEVWF-013, REQ-ARCH-008) |
| S9 | Runtime Logs, the request log line of S2 | Informational: copy the values of `x-forwarded-for`, `x-real-ip` and `x-vercel-forwarded-for` and your own public IP; no pass/fail |
| S10 | Response headers of S2 | `RateLimit-*` headers and Helmet's security headers are present (the app's own middlewares run) |

**Results table** (filled in by the user): `| # | PASS / FAIL | Notes (error text, values) |`, one row per check.

**What the results decide:**

- S1, S2, S3, S5, S6, S7 or S8 `FAIL`: Services is not used as specified. The Specifier brings it back as a decision; the fallback the user already saw is two Vercel projects, with the web rewriting `/api/*` to the API project.
- S4 `FAIL`: Swagger UI is served only in development, and `/api/v1/docs-raw` stays everywhere (decided 2026-10-29; written into [API.md](API.md) after the spike, as a new deviation).
- S1 or S2 shows an entrypoint other than `src/server.ts` (e.g. `src/app.ts`, which also exports the Express app), although `vercel.json` declares it: the Specifier brings it back as a decision. That case contradicts REQ-DEVWF-011 (AC-DEVWF-011-4) and REQ-ARCH-003, because `src/app.ts` does not import `config/env` and `lib/zod-setup` first.
- S2 `FAIL` only because `NODE_ENV` is missing at runtime: the Specifier brings it back as a decision.
- S9 is input for the `TRUST_PROXY` measurement on the first real deployment (REQ-ANS-007).
- S10 `FAIL`: reported as a finding.

**Acceptance criteria**

- **AC-DEVWF-014-1**
  - **Given** the spike preview deployment made with the procedure above
  - **When** the user runs S1–S8 and S10
  - **Then** each has a `PASS` or `FAIL` result with notes, S1 and S2 name the API entrypoint the build and the function report, and S9 holds the three header values and the user's public IP
- **AC-DEVWF-014-2**
  - **Given** the results table reported by the user
  - **When** the next phase of this task starts
  - **Then** a summary of the results is recorded in that phase's notes in this module before its specs are written, and the throwaway project has been deleted

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-DEVWF-1 | Existing implementation (migrated) | Done | REQ-DEVWF-001, REQ-DEVWF-002, REQ-DEVWF-003, REQ-DEVWF-004, REQ-DEVWF-007, REQ-DEVWF-008, REQ-DEVWF-009 |
| PH-DEVWF-2 | Code comments cite existing docs | Planned | REQ-DEVWF-010 |
| PH-DEVWF-3 | Test database left empty (migrate deploy and truncate) | Done | REQ-DEVWF-002 |
| PH-DEVWF-4 | Vercel Services feasibility spike | Done | REQ-DEVWF-008, REQ-DEVWF-011, REQ-DEVWF-012, REQ-DEVWF-013, REQ-DEVWF-014, REQ-ARCH-008 |

PH-DEVWF-2 fixes the five comments that break REQ-DEVWF-010 once the legacy docs are removed:

- `apps/api/.env.example:1` and `apps/web/.env.example:1` point to `docs/sdd/05-configuration.md` (the web one also cites "CFG-09") → [CONFIGURATION.md](CONFIGURATION.md).
- `apps/api/Dockerfile:4` points to `docs/sdd/05-configuration.md` → [CONFIGURATION.md](CONFIGURATION.md).
- `apps/api/vitest.config.ts:5` points to `docs/sdd/30-dev-workflow.md` → [DEV_WORKFLOW.md](DEV_WORKFLOW.md) and [CONVENTIONS.md](CONVENTIONS.md) §Testing.
- `packages/schemas/src/userSchema.ts:58` says `userAccountSchema` is "Returned by signup and login (AUTH-12, AUTH-15)": signup no longer exists; it is returned by login and invitation acceptance (REQ-AUTH-015, REQ-AUTH-029).

PH-DEVWF-3 replaces `prisma migrate reset --force` in the `db` project's global setup (`apps/api/tests/db/globalSetup.ts`) with `prisma migrate deploy` plus emptying every application table before the run, and adds a global teardown that empties them again when the run ends (REQ-DEVWF-002, AC-DEVWF-002-3, AC-DEVWF-002-6; [DEVIATIONS.md](DEVIATIONS.md) DEV-002). The safety checks of AC-DEVWF-002-2 are kept. The comment on `TEST_DATABASE_URL` in `apps/api/.env.example`, which says the database is "rebuilt from the migrations on every run", is updated to the new behaviour.

PH-DEVWF-4 (Done 2026-10-29) adds only the files the spike needs:

- the root `vercel.json` (REQ-DEVWF-011);
- the `vercel-build` script in `apps/api/package.json` (REQ-DEVWF-012);
- the root `.vercelignore` and the `.vercel` line in `.gitignore` (REQ-DEVWF-013);
- a root `.gitignore` rule that ignores `apps/api/src/generated` (the old rule `src/generated` matched only `<root>/src/generated`), with the 13 tracked files under it removed from the index with `git rm --cached` and kept on disk (REQ-ARCH-008, DEV-009);

and it deletes `apps/web/vercel.json` (REQ-DEVWF-008). It changes no application code, no Dockerfile or compose file, and no configuration schema.

The order inside the phase is: the Implementer writes the files; the Reviewer reviews them and tests REQ-DEVWF-011 to REQ-DEVWF-013 (`scripts/tests/vercel-build.test.sh`, [CONVENTIONS.md](CONVENTIONS.md) §Testing); then STOP 2, the close and the commit. The Manager pushes the branch when the user asks. After that, the user runs the spike from the Vercel dashboard (REQ-DEVWF-014). The results summary is recorded at the start of the next phase of this task, and drives its specs: a failure becomes a decision, with two projects plus a rewrite as the fallback. The remaining deployment phases are specified after the results. At its close the spike itself had not run yet: its results are recorded at the start of the next phase.

The change of the API image to Node.js `24.22.1` (REQ-DEVWF-003, DEV-001) is implemented in [ENV.md](ENV.md) PH-ENV-1.
