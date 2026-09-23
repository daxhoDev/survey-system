# 30 — Development Workflow

[← Back to index](MAIN.md) · Related: [00 SDD process](00-sdd-process.md), [05 Configuration](05-configuration.md)

## 1. Prerequisites

- Node.js (version not pinned — see BL-02), pnpm `11.5.3` (root `devEngines`, auto-downloaded).
- PostgreSQL reachable through `DATABASE_URL`.

## 2. Commands

| Where | Command | Effect |
|-------|---------|--------|
| root | `pnpm install` | Install all workspaces |
| root | `pnpm dev` | Run `dev` of every workspace in parallel (API `tsx watch src/server.ts`, web `vite`) |
| root | `pnpm generate:api` | Run Orval: regenerate `apps/web/src/lib/api` from `http://localhost:3000/api/v1/docs-raw` (API must be running) |
| `apps/api` | `pnpm exec prisma migrate dev` | Create/apply migrations |
| `apps/api` | `pnpm exec prisma generate` | Regenerate the Prisma client in `src/generated/prisma` |
| `apps/api` | `pnpm build` / `pnpm start` | `tsc` → `dist/`, run `node dist/server.js` |
| `apps/web` | `pnpm build` / `pnpm preview` / `pnpm lint` | `tsc -b && vite build`, preview, ESLint |

Dev URLs: API `http://localhost:3000` (Swagger at `/api/v1/docs`), web `http://localhost:5173`.

- **DEV-WF-01** `[pending: BL-17]` `apps/api` script `seed` (`tsx src/scripts/seed.ts`) and Prisma's seed (`tsx prisma/seed.ts`) point to files that do not exist. `apps/web` script `generate:api` uses `openapi-typescript`, which is not installed and is superseded by the root Orval command.

- **DEV-WF-04** `[pending: BL-20]` `pnpm build` in `apps/api` must typecheck with zero errors (it also compiles `packages/schemas`). (Currently `tsc` reports 10 errors: 8 in `packages/schemas`, 1 in `apps/api/src/repositories/surveyRepository.ts` and 1 in `apps/api/src/lib/openapi.ts`.)

## 3. Changing things

- **API contract change**: update Zod schemas in `packages/schemas` → service/controller → `apps/api/src/lib/openapi.ts` → run the API → `pnpm generate:api` → adapt the web → update specs [04](04-api-conventions.md) and the domain spec.
- **Schema change**: edit `apps/api/prisma/schema.prisma` → `prisma migrate dev --name <name>` → `prisma generate` → update repositories' mapping → update [03-data-model.md](03-data-model.md).
- **Environment variable**: update the env schema (BL-05), `.env.example`, [05-configuration.md](05-configuration.md) and the README.
- Never edit `apps/api/src/generated/prisma` or the Orval output (except `mutator/customInstance.ts`).

## 4. Testing

- **DEV-WF-02** `[pending: BL-18]` There are no automated tests (`apps/api` `test` script is a placeholder). A testing strategy (framework, scope, minimum coverage) must be defined with the owner and then specified here.

## 5. Deployment

- **DEV-WF-03** `[pending: BL-02]` The API `Dockerfile` is not built yet and is not functional (no pnpm in the image, copies `.env` into the image, `CMD` uses single quotes, does not include the workspace `packages/schemas`). Containerization is pending.

## 6. Git

- Default branch: `master`. Commit messages follow Conventional Commits (`feat:`, `fix:`, …) as in the existing history.
