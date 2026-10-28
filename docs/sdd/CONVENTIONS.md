← Back to [MAIN](MAIN.md)

# Conventions

**Version:** v0.3

Project-wide conventions, filled in as the user decides them.

## Process

Language and git rules (branches, commits, merges) are defined in [AGENTS.md](../../AGENTS.md) (§5 Git, §8 Language).

## Docs language

English ([AGENTS.md](../../AGENTS.md) §8).

## Stack

pnpm workspaces monorepo (details: [ARCHITECTURE.md](ARCHITECTURE.md)).

| Part | Location | Technologies |
|------|----------|--------------|
| API | `apps/api` | Node.js 24, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod 4 + `@asteasolutions/zod-to-openapi`, JWT (`jsonwebtoken`) + bcrypt, pino, Helmet, `express-rate-limit`, Swagger UI |
| Web | `apps/web` | Vite 8, React 19 (React Compiler), TypeScript, Tailwind CSS 4, shadcn/ui (`radix-ui`), React Router 7, TanStack Query 5, `react-hook-form`, Orval-generated client ([FRONTEND.md](FRONTEND.md), REQ-FE-001) |
| Shared schemas | `packages/schemas` | Zod schemas used for validation and OpenAPI generation (REQ-ARCH-002, REQ-ARCH-012) |
| Database | — | PostgreSQL (local: `postgres:18-alpine` through Docker Compose; deployed: Neon) |
| Tooling | root | pnpm `11.5.3` (root `devEngines`), Vitest, Orval, Docker |
| Deployment | — | API as a Docker image on Render, web on Vercel, PostgreSQL on Neon, all free tiers ([DEV_WORKFLOW.md](DEV_WORKFLOW.md)) |

## Code style

- TypeScript everywhere, ES modules (`"type": "module"`). `tsconfig.base.json` enables `strict`; the API also enables `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- The web app is linted with ESLint (`apps/web/eslint.config.js`, `pnpm lint` in `apps/web`).
- Identifiers, code comments and API messages are in English; the web UI copy is in Spanish ([FRONTEND.md](FRONTEND.md), REQ-FE-006; [BRAND.md](BRAND.md), REQ-BRAND-024).
- Database columns are snake_case and domain objects camelCase (REQ-DATA-005, REQ-ARCH-006).
- Generated code is never edited by hand: the Prisma client in `apps/api/src/generated/prisma` (REQ-ARCH-008) and the Orval output in `apps/web/src/lib/api`, except the hand-written `mutator/customInstance.ts` (REQ-FE-008, REQ-FE-009).

## Project structure

```text
apps/api            REST API (layers: ARCHITECTURE.md §2)
  prisma/           schema.prisma, migrations, seed.ts
  src/              server code
  tests/            API tests (see Testing)
apps/web            Web app
  src/              app code (components, pages, lib, styles, assets)
  tests/            web tests (see Testing)
packages/schemas    shared Zod schemas (src/, compiled to dist/)
docker/             local PostgreSQL init script
scripts/            developer scripts (environment preflight: preflight.sh; PNG icon generator: brand-icons.ts)
  tests/            script tests (see Testing)
docs/sdd/           specification (this folder)
docs/brand/         brand reference artwork
```

## Testing

- **Runner:** Vitest in both apps; `pnpm test` at the root runs every workspace ([DEV_WORKFLOW.md](DEV_WORKFLOW.md), REQ-DEVWF-002). Developer scripts in `scripts/` are tested with plain Bash test scripts, with no test framework or new dependency (see Scripts below). Developer scripts are Bash (`.sh`) or TypeScript run directly by Node.js (`node scripts/<name>.ts`, erasable syntax only, Node.js built-in modules only).
- **Locations:** test files live outside `src`:
  - API: `apps/api/tests/unit` (Vitest project `unit`, no database), `apps/api/tests/db` (Vitest project `db`, real PostgreSQL through `TEST_DATABASE_URL`) and shared helpers in `apps/api/tests/helpers`.
  - Web: `apps/web/tests` (jsdom + Testing Library), shared helpers in `apps/web/tests/helpers.tsx` and `apps/web/tests/setup.ts`.
  - Scripts: `scripts/tests`. Each test script runs the script under test and checks its output and exit code: with stub executables (e.g. fake `node` and `pnpm`) placed first on a temporary `PATH` when the script calls other tools (e.g. the preflight's summary lines), or for real into a temporary directory when it only writes files (e.g. `brand-icons.test.sh` compares the generated icons byte-for-byte with the committed ones and checks the PNG sizes). Run from the repository root, e.g. `bash scripts/tests/preflight.test.sh`; it exits `0` only if every case passed. These tests are not part of `pnpm test`, so the preflight (whose check 3 runs `pnpm test`) never runs its own tests.
- **Naming:** `<Subject>.test.ts` or `<Subject>.test.tsx`, named after the unit, component or page under test (e.g. `authService.test.ts`, `LoginPage.test.tsx`). Script tests: `<script>.test.sh`, named after the script under test without its extension (e.g. `preflight.test.sh` for `scripts/preflight.sh`, `brand-icons.test.sh` for `scripts/brand-icons.ts`).
- **Test database:** the API `db` project leaves the test database (`TEST_DATABASE_URL`) empty when it finishes, whether its tests passed or failed. It applies migrations with `prisma migrate deploy` and never uses `prisma migrate reset` ([DEV_WORKFLOW.md](DEV_WORKFLOW.md), REQ-DEVWF-002).
- **Requirement references:** each test names the requirement IDs it covers. Existing tests use the legacy IDs (e.g. `AUTH-30`), which resolve through the "Legacy ID" line of each requirement; new tests use `REQ-<CODE>-NNN` / `AC-<CODE>-NNN-k`.

## Environment preflight

Parameters of the environment preflight script. Its behaviour is specified in [ENV.md](ENV.md); how it is used is defined in [AGENTS.md](../../AGENTS.md) §4.6.

| Parameter | Value |
|-----------|-------|
| Script | `scripts/preflight.sh`, run from the repository root as `bash scripts/preflight.sh` |
| Variant(s) | Bash only (`preflight.sh`); no PowerShell variant |
| Runtime 1 | Node.js: at least `24.22.1`, below `25.0.0` (`node --version`) |
| Runtime 2 | pnpm: exactly `11.5.3` (`pnpm --version` run from the repository root; pinned by the root `devEngines`) |
| Test command | `TEST_DATABASE_URL= pnpm test` from the repository root: every workspace's tests, with the API `db` project disabled for that run whatever `apps/api/.env` says |
| Preconditions of check 3 | root `node_modules` and `apps/api/src/generated/prisma` exist; the script installs and generates nothing |

## Dependencies

- Every dependency is managed with `pnpm`, from the root or the relevant workspace (REQ-ARCH-001).
- `packages/schemas` declares its own dependencies (REQ-ARCH-012).
- `prisma` is a production dependency of the API, because the image applies migrations on start (REQ-DEVWF-007).

## Other

- Product name: **Sondix**; the repository, workspace packages (`@survey-system/*`) and code identifiers keep the name `survey-system` (REQ-BRAND-001).
- Licence: MIT (REQ-OV-001).
- `README.md` at the repository root is the only README, written for visitors of the repository; workspaces (`apps/*`, `packages/*`) have none.
