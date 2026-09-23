# 30 — Development Workflow

[← Back to index](MAIN.md) · Related: [00 SDD process](00-sdd-process.md), [05 Configuration](05-configuration.md)

## 1. Prerequisites

- Node.js (version not pinned — see BL-02), pnpm `11.5.3` (root `devEngines`, auto-downloaded).
- PostgreSQL reachable through `DATABASE_URL`. For local work, `docker compose up -d` (root `docker-compose.yml`) starts `postgres:18-alpine` on `localhost:5432` (user and password `postgres`) with two databases: `survey_system` (development) and `survey_system_test` (tests), created by `docker/postgres/init.sql` the first time the volume is created. This compose file is for local use only, not for deployment (BL-02).

## 2. Commands

| Where | Command | Effect |
|-------|---------|--------|
| root | `pnpm install` | Install all workspaces |
| root | `pnpm dev` | Run `dev` of every workspace in parallel (API `tsx watch src/server.ts`, web `vite`) |
| root | `docker compose up -d` / `docker compose down` | Start / stop the local PostgreSQL (data kept in the `pgdata` volume) |
| root | `pnpm test` | Run the tests of every workspace (`pnpm -r test`) |
| root | `pnpm generate:api` | Run Orval: regenerate `apps/web/src/lib/api` from `http://localhost:3000/api/v1/docs-raw` (API must be running) |
| `apps/api` | `pnpm exec prisma migrate dev` | Create/apply migrations |
| `apps/api` | `pnpm seed` | Load the demo data into the development database (DEV-WF-01) |
| `apps/api` | `pnpm exec prisma generate` | Regenerate the Prisma client in `src/generated/prisma` |
| `apps/api` | `pnpm build` / `pnpm start` | `tsc` → `dist/`, run `node dist/server.js` |
| `apps/api` | `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Vitest: one run / watch mode / one run with a v8 coverage report (`coverage/`) |
| `apps/web` | `pnpm build` / `pnpm preview` / `pnpm lint` | `tsc -b && vite build`, preview, ESLint |
| `apps/web` | `pnpm test` / `pnpm test:watch` | Vitest: one run / watch mode |

Dev URLs: API `http://localhost:3000` (Swagger at `/api/v1/docs`), web `http://localhost:5173`.

- **DEV-WF-01** `[implemented]` `pnpm seed` in `apps/api` (`prisma db seed`, which runs `apps/api/prisma/seed.ts`) fills the **development** database with demo data: the user `demo@example.com` / `demo12345` (username `demo`), three surveys (an active one with a few answers, an inactive locked one, and an unlocked draft). It is idempotent (running it again changes nothing), uses the same validated configuration as the API (`DATABASE_URL`) and refuses to run with `NODE_ENV=production`. There is no `generate:api` script in `apps/web`: the client is generated with the root `pnpm generate:api` (Orval).

- **DEV-WF-04** `[implemented]` `pnpm build` in `apps/api` must typecheck with zero errors (it also compiles `packages/schemas`).

## 3. Changing things

- **API contract change**: update Zod schemas in `packages/schemas` → service/controller → `apps/api/src/lib/openapi.ts` → run the API → `pnpm generate:api` → adapt the web → update specs [04](04-api-conventions.md) and the domain spec.
- **Schema change**: edit `apps/api/prisma/schema.prisma` → `prisma migrate dev --name <name>` → `prisma generate` → update repositories' mapping → update [03-data-model.md](03-data-model.md).
- **Environment variable**: update the env schema (`apps/api/src/config/env.ts`), `apps/api/.env.example`, [05-configuration.md](05-configuration.md) and the README.
- Never edit `apps/api/src/generated/prisma` or the Orval output (except `mutator/customInstance.ts`).

## 4. Testing

- **DEV-WF-02** `[implemented]` Tests use **Vitest** in both apps. Test files live outside `src` (`apps/api/tests`, `apps/web/tests`) and name the requirement IDs they cover.
  - **API, `unit` project** (`apps/api/tests/unit`, no database): services with fake repositories; middlewares and the error handler on a small Express app with Supertest; `config/env.ts`; HTTP tests of the real `app` with the repository modules replaced by in-memory fakes (`vi.mock`, `tests/helpers/fakeRepositories.ts`). Rate limiters are mocked out except in `rateLimit.test.ts`.
  - **API, `db` project** (`apps/api/tests/db`, real PostgreSQL): repositories and full HTTP flows against `TEST_DATABASE_URL`. A global setup rebuilds that database with `prisma migrate reset --force` once per run and refuses to run unless the database name contains `test` and differs from `DATABASE_URL`; every test starts from truncated tables. Without `TEST_DATABASE_URL` the `db` project is skipped with a warning. Files run one at a time because they share the database.
  - **Web** (`apps/web/tests`, jsdom + Testing Library): components and pages rendered with a fresh `QueryClient` and `MemoryRouter`; `fetch` is replaced by a route table (`tests/helpers.tsx`). Covered today: `ConfirmationDialog`, `SurveyAnsweringPage`, the login form and `customInstance`.
  - Tests set their own configuration (`NODE_ENV=development`, `LOG_LEVEL=silent`, test secrets); `.env` is only read for `TEST_DATABASE_URL`.
  - Coverage is reported (`pnpm test:coverage` in `apps/api`) without a minimum threshold. There is no CI: tests run locally.
- **DEV-WF-06** `[implemented]` Every change of behavior adds or updates the tests that cover it, in the same change, and `pnpm test` must pass (with the `db` project enabled) before the PR is merged.

## 5. Deployment

- **DEV-WF-03** `[pending: BL-02]` The API `Dockerfile` is not built yet and is not functional (no pnpm in the image, copies `.env` into the image, `CMD` uses single quotes, does not include the workspace `packages/schemas`). Containerization is pending.

## 6. Git

- Default branch: `master`. Integration branch: `development`.
- **DEV-WF-05** `[implemented]` Every change is developed on a branch created from `development` and merged through a PR whose base is `development`. Only the owner merges `development` into `master`, manually; agents never open PRs against or merge into `master`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, …) as in the existing history.
