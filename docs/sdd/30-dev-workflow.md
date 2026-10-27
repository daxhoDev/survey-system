# 30 — Development Workflow

[← Back to index](MAIN.md) · Related: [00 SDD process](00-sdd-process.md), [05 Configuration](05-configuration.md)

## 1. Prerequisites

- Node.js 24 (`engines` in `apps/api/package.json`; the Docker image pins `24.19.0`), pnpm `11.5.3` (root `devEngines`, auto-downloaded).
- PostgreSQL reachable through `DATABASE_URL`. For local work, `docker compose up -d` (root `docker-compose.yml`) starts `postgres:18-alpine` on `localhost:5432` (user and password `postgres`) with two databases: `survey_system` (development) and `survey_system_test` (tests), created by `docker/postgres/init.sql` the first time the volume is created. This compose file is for local use only, not for deployment (§5).

## 2. Commands

| Where | Command | Effect |
|-------|---------|--------|
| root | `pnpm install` | Install all workspaces |
| root | `pnpm dev` | Run `dev` of every workspace in parallel (API `tsx watch src/server.ts`, web `vite`) |
| root | `docker compose up -d` / `docker compose down` | Start / stop the local PostgreSQL (data kept in the `pgdata` volume) |
| root | `docker compose -f docker-compose.prod.yml up --build` | Build the API image and run it locally in `production` mode against its own PostgreSQL (DEV-WF-03) |
| root | `docker build -f apps/api/Dockerfile -t sondix-api .` | Build the API image only |
| root | `pnpm test` | Run the tests of every workspace (`pnpm -r test`) |
| root | `pnpm generate:api` | Run Orval: regenerate `apps/web/src/lib/api` from `http://localhost:3000/api/v1/docs-raw` (API must be running) |
| `apps/api` | `pnpm exec prisma migrate dev` | Create/apply migrations |
| `apps/api` | `pnpm seed` | Load the demo data into the development database (DEV-WF-01) |
| `apps/api` | `pnpm create-user` | Create an account interactively, e.g. the first one (AUTH-31) |
| `apps/api` | `DATABASE_URL=<url> pnpm exec prisma migrate deploy` | Apply pending migrations to a deployed database by hand (DEV-WF-07) |
| `apps/api` | `pnpm exec prisma generate` | Regenerate the Prisma client in `src/generated/prisma` |
| `apps/api` | `pnpm build` / `pnpm start` | `tsc` → `dist/`, run `node dist/server.js` |
| `apps/api` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest: one run / watch mode / one run with a v8 coverage report (`coverage/`) |
| `packages/schemas` | `pnpm build` | `tsc` → `dist/`, used only by the production image (ARCH-12) |
| `apps/web` | `pnpm build` / `pnpm preview` / `pnpm lint` | `tsc -b && vite build`, preview, ESLint |
| `apps/web` | `pnpm test` / `pnpm test:watch` | Vitest: one run / watch mode |

Dev URLs: API `http://localhost:3000` (Swagger at `/api/v1/docs`), web `http://localhost:5173`.

- **DEV-WF-01** `[implemented]` `pnpm seed` in `apps/api` (`prisma db seed`, which runs `apps/api/prisma/seed.ts`) fills the **development** database with demo data: the user `demo@example.com` / `demo12345` (username `demo`), three surveys (an active one with a few answers, an inactive locked one, and an unlocked draft). It is idempotent (running it again changes nothing), uses the same validated configuration as the API (`DATABASE_URL`) and refuses to run with `NODE_ENV=production`. There is no `generate:api` script in `apps/web`: the client is generated with the root `pnpm generate:api` (Orval).

- **DEV-WF-04** `[implemented]` `pnpm build` in `apps/api` must typecheck with zero errors (it also typechecks the `packages/schemas` source, ARCH-12).

## 3. Changing things

- **API contract change**: update Zod schemas in `packages/schemas` → service/controller → `apps/api/src/lib/openapi.ts` → run the API → `pnpm generate:api` → adapt the web → update specs [04](04-api-conventions.md) and the domain spec.
- **Schema change**: edit `apps/api/prisma/schema.prisma` → `prisma migrate dev --name <name>` → `prisma generate` → update repositories' mapping → update [03-data-model.md](03-data-model.md).
- **Environment variable**: update the env schema (`apps/api/src/config/env.ts`), `apps/api/.env.example`, [05-configuration.md](05-configuration.md) and the README.
- Never edit `apps/api/src/generated/prisma` or the Orval output (except `mutator/customInstance.ts`).

## 4. Testing

- **DEV-WF-02** `[implemented]` Tests use **Vitest** in both apps. Test files live outside `src` (`apps/api/tests`, `apps/web/tests`) and name the requirement IDs they cover.
  - **API, `unit` project** (`apps/api/tests/unit`, no database): services with fake repositories; middlewares and the error handler on a small Express app with Supertest; `config/env.ts`; HTTP tests of the real `app` with the repository modules replaced by in-memory fakes (`vi.mock`, `tests/helpers/fakeRepositories.ts`). Rate limiters are mocked out except in `rateLimit.test.ts`.
  - **API, `db` project** (`apps/api/tests/db`, real PostgreSQL): repositories, full HTTP flows and the command-line scripts (seed, `create-user`) against `TEST_DATABASE_URL`. A global setup rebuilds that database with `prisma migrate reset --force` once per run and refuses to run unless the database name contains `test` and differs from `DATABASE_URL`; every test starts from truncated tables. Without `TEST_DATABASE_URL` the `db` project is skipped with a warning. Files run one at a time because they share the database.
  - **Web** (`apps/web/tests`, jsdom + Testing Library): components and pages rendered with a fresh `QueryClient` and `MemoryRouter`; `fetch` is replaced by a route table (`tests/helpers.tsx`). Covered today: `ConfirmationDialog`, `LockedBadge`, `DashboardHeader`, `SurveyAnsweringPage`, `InvitationsPage`, `AcceptInvitationPage`, the login form, `customInstance` and the web configuration (`env`).
  - Tests set their own configuration (`NODE_ENV=development`, `LOG_LEVEL=silent`, test secrets); `.env` is only read for `TEST_DATABASE_URL`.
  - Coverage is reported (`pnpm test:coverage` in `apps/api`) without a minimum threshold. There is no CI: tests run locally.
- **DEV-WF-06** `[implemented]` Every change of behavior adds or updates the tests that cover it, in the same change, and `pnpm test` must pass (with the `db` project enabled) before the PR is merged.

## 5. Deployment

Target: API as a Docker image on **Render** (free web service), web on **Vercel** (Hobby), PostgreSQL on **Neon** (free). All free tiers; decided 2026-10-12.

- **DEV-WF-03** `[implemented]` `apps/api/Dockerfile` builds the API image with the repository root as context (root `.dockerignore`): `node:24.19.0-alpine`, pnpm `11.5.3`, the workspace manifests and lockfile (`--frozen-lockfile`, filtered to the API and `packages/schemas`). A build stage compiles `packages/schemas`, generates the Prisma client and compiles the API; the final stage holds only production dependencies, `dist/` of both packages, `prisma/` and `prisma.config.ts`, and runs as the `node` user with `NODE_ENV=production`. No `.env` is copied: configuration comes from the environment (CFG-10). `docker-compose.prod.yml` runs the image locally against its own PostgreSQL to try it before deploying.
- **DEV-WF-07** `[implemented]` Migrations: the image's `CMD` runs `prisma migrate deploy` (applies only pending migrations, so it is safe on every start) and then `exec node dist/server.js`; if a migration fails the container does not start. They can also be applied by hand from a development machine with `DATABASE_URL=<Neon URL> pnpm exec prisma migrate deploy` in `apps/api`. `prisma` is a production dependency of the API for this reason.
- **DEV-WF-08** `[implemented]` The web is a Vercel project rooted at `apps/web`. `apps/web/vercel.json` rewrites `/api/*` to the Render service (`https://sondix-api.onrender.com`) and every other path to `index.html` (client-side routing). The browser therefore talks only to the Vercel origin: the session cookies (AUTH-01) are first-party and requests are same-origin. `VITE_API_URL` and `CORS_ORIGIN` are the Vercel URL (CFG-10, CFG-11); `TRUST_PROXY` is set in Render to the measured number of proxies (ANS-07). There are no preview deployments.
- **DEV-WF-09** Known limitation of the free tiers: Render stops the API after about 15 minutes without traffic and the next request waits for it to start (around a minute), which can exceed the time Vercel waits for the rewrite; Neon also suspends its compute when idle. No keep-alive is used (decided 2026-10-12).

## 6. Git

- Default branch: `master`. Integration branch: `development`.
- **DEV-WF-05** `[implemented]` Every change is developed on a branch created from `development` and merged through a PR whose base is `development`. Only the owner merges `development` into `master`, manually; agents never open PRs against or merge into `master`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, …) as in the existing history.
