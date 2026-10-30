← Back to [MAIN](MAIN.md)

# Architecture

- **Module:** Architecture
- **Module code:** ARCH
- **Version:** v2.0
- **Status:** Approved
- **Last updated:** 2026-10-29

## Description

Monorepo layout, backend layers, the API request pipeline, shared schemas and the API ⇄ web contract flow.

Requirement numbers keep the legacy IDs: legacy `ARCH-04` is `REQ-ARCH-004`. The legacy ID `ARCH-12` was used twice: the shared-schemas build is `REQ-ARCH-012` and the OpenAPI-matches-real-responses requirement is `REQ-ARCH-013`.

### 1. Monorepo

pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). The root `package.json` pins pnpm `11.5.3` through `devEngines`.

| Package | Path | Role |
|---------|------|------|
| `@survey-system/api` | `apps/api` | REST API — Express 5 + TypeScript, Prisma 7 (PostgreSQL) |
| `@survey-system/web` | `apps/web` | Web app — Vite + React 19 + Tailwind 4 + shadcn/ui |
| `@survey-system/schemas` | `packages/schemas` | Shared Zod 4 schemas (validation + OpenAPI metadata), TypeScript source in development, compiled to `dist/` for production (REQ-ARCH-012) |

### 2. Backend layers (`apps/api/src`)

```text
routes/        Express routers: wire middlewares + controller methods, instantiate dependencies
controllers/   HTTP concerns: read req, call service, shape response envelope, set cookies
services/      Business rules and validation (Zod safeParse + domain checks), throw AppError
repositories/  Data access with Prisma; map snake_case DB rows ⇄ camelCase domain objects
middlewares/   auth, error, logging, request context
lib/           prisma client, openapi registry/generator, zod setup
config/        env (validated configuration), pino logger, cookie options
context/       AsyncLocalStorage request context (per-request child logger)
utils/         AppError, rate limiter factory, BigInt-safe JSON serializer, email normalization
scripts/       command-line scripts (create-user)
types.ts       Domain types (inferred from Zod) and repository/service interfaces
generated/     Prisma client — GENERATED, never edit, git-ignored (REQ-ARCH-008)
```

### 3. Request pipeline (`apps/api/src/app.ts`)

Order is normative:

1. `loggingMiddleware` — pino-http; assigns `req.id` (UUID v4), redacts cookies.
2. `requestContextMiddleware` — runs the rest of the request inside `AsyncLocalStorage` with a child logger carrying `requestId`.
3. `express.json()`.
4. `cookieParser()`.
5. `cors({ credentials: true, origin })` — origin from configuration ([CONFIGURATION.md](CONFIGURATION.md), REQ-CFG-006).
6. `helmet()`.
7. Global rate limiter on `/api/` ([API.md](API.md), REQ-API-020).
8. Routers:
   - `/api/v1/surveys` → `surveyRouter` (nests `answerRouter` at `/:slug/answers` with `mergeParams`).
   - `/api/v1/stats` → `statsRouter` (REQ-STAT-008).
   - `/api/v1/users` → auth rate limiter + `userRouter`.
   - `/api/v1/invitations` → `invitationRouter` (its public token routes add the auth rate limiter per route, REQ-AUTH-030).
9. `/api/v1/docs` (Swagger UI) and `/api/v1/docs-raw` (OpenAPI JSON).
10. Catch-all `app.all("/*splat")` → `AppError` 404.
11. `ErrorMiddleware.handleGlobalError`.

Before the middlewares, `app.set("trust proxy", TRUST_PROXY)` is applied (REQ-ANS-007).

### 4. Frontend

See [FRONTEND.md](FRONTEND.md). The web app talks to the API only through the Orval-generated React Query client in `apps/web/src/lib/api`, which is generated from the API's OpenAPI document (`/api/v1/docs-raw`).

### 5. Contract flow

```text
packages/schemas (Zod) ──► apps/api validation (services/controllers)
          │
          └──► apps/api/src/lib/openapi.ts (registry) ──► GET /api/v1/docs-raw
                                                            │
                                                            ▼ orval (root: pnpm generate:api)
                                                apps/web/src/lib/api (generated hooks + types)
```

## Requirements

### REQ-ARCH-001 — pnpm for every dependency

Legacy ID: ARCH-01.

All dependencies are managed with `pnpm`, from the root or the relevant workspace.

**Acceptance criteria**

- **AC-ARCH-001-1**
  - **Given** the repository
  - **When** its lockfiles and workspace configuration are inspected
  - **Then** `pnpm-lock.yaml` and `pnpm-workspace.yaml` are the only dependency lockfile and workspace definition (no `package-lock.json` or `yarn.lock`)

### REQ-ARCH-002 — Shared request/response shapes

Legacy ID: ARCH-02.

Request/response shapes shared by API and web are defined once, in `packages/schemas`, and imported as `@survey-system/schemas`. Validation limits (`packages/schemas/src/limits.ts`: username, password, survey and question name lengths) are exported constants used by the API schemas and by the web's Spanish form schemas (REQ-FE-004).

**Acceptance criteria**

- **AC-ARCH-002-1**
  - **Given** a shape used by both the API and the web
  - **When** its definition is looked up
  - **Then** it is defined only in `packages/schemas` and imported from `@survey-system/schemas`
- **AC-ARCH-002-2**
  - **Given** the limits `USERNAME_MIN`, `USERNAME_MAX`, `PASSWORD_MIN`, `SURVEY_NAME_MIN`, `QUESTION_NAME_MIN`
  - **When** the API schemas and the web form schemas use a length limit
  - **Then** they import the constant from `packages/schemas/src/limits.ts` and never repeat the number

### REQ-ARCH-003 — Zod as single source for validation and OpenAPI

Legacy ID: ARCH-03.

Zod schemas are the single source for validation **and** OpenAPI documentation (via `@asteasolutions/zod-to-openapi`). `extendZodWithOpenApi(z)` runs in `packages/schemas/src/zod-setup.ts` and `apps/api/src/lib/zod-setup.ts`; `apps/api/src/server.ts` imports `config/env` first, then `lib/zod-setup`, then `app`.

**Acceptance criteria**

- **AC-ARCH-003-1**
  - **Given** `apps/api/src/server.ts`
  - **When** its imports are read
  - **Then** the order is `./config/env.js`, `./lib/zod-setup.js`, `./app.js`
- **AC-ARCH-003-2**
  - **Given** an endpoint body or response schema documented in OpenAPI
  - **When** its definition is looked up
  - **Then** the same Zod schema is used for validation and for the OpenAPI registration

### REQ-ARCH-004 — Strict layering

Legacy ID: ARCH-04.

Layering is strict: routes → controllers → services → repositories → Prisma. Controllers never touch Prisma; repositories contain no business rules.

**Acceptance criteria**

- **AC-ARCH-004-1**
  - **Given** the files in `apps/api/src/controllers`, `routes` and `services`
  - **When** their imports are inspected
  - **Then** none imports the Prisma client (`lib/prisma` or `generated/prisma`)
- **AC-ARCH-004-2**
  - **Given** a repository method
  - **When** it is inspected
  - **Then** it only reads/writes data and maps rows, throwing no `AppError` (unique violations are reported as `UniqueViolationError` for services to map)

### REQ-ARCH-005 — Constructor dependency injection

Legacy ID: ARCH-05.

Dependencies are injected via constructors (`new SurveyService(new SurveyRepository())`), wired in the router modules. Services and repositories implement the interfaces in `types.ts` (`ISurveyService`, `IAnswerRepository`, …).

**Acceptance criteria**

- **AC-ARCH-005-1**
  - **Given** a service or repository class
  - **When** it is inspected
  - **Then** it `implements` its interface from `types.ts` and receives its dependencies through the constructor, instantiated in a router module

### REQ-ARCH-006 — camelCase domain objects

Legacy ID: ARCH-06.

Repositories return camelCase domain objects (`Survey`, `Answer`, `User`, `RefreshToken`); snake_case column names never leak above the repository layer.

**Acceptance criteria**

- **AC-ARCH-006-1**
  - **Given** any API response or service return value
  - **When** its keys are inspected
  - **Then** they are camelCase (e.g. `isActive`, `createdAt`), never column names such as `is_active`

### REQ-ARCH-007 — Domain types inferred from Zod

Legacy ID: ARCH-07.

Domain types are derived from the shared Zod schemas with `z.infer` (`CreateSurveyData`, `Question`, `CreateAnswerData`, …).

**Acceptance criteria**

- **AC-ARCH-007-1**
  - **Given** `apps/api/src/types.ts`
  - **When** the domain input types are read
  - **Then** they are declared with `z.infer` of the shared schemas

### REQ-ARCH-008 — Generated Prisma client is never edited or committed

Legacy ID: ARCH-08.

`apps/api/src/generated/prisma` is generated by `prisma generate` and must never be edited manually. It is not versioned: the root `.gitignore` ignores `apps/api/src/generated`, and no file under it is tracked. Every place that needs the client generates it: developers after `pnpm install` (`pnpm exec prisma generate` in `apps/api`), the API image build (REQ-DEVWF-003) and the Vercel build (REQ-DEVWF-012). The environment preflight only checks that it exists ([ENV.md](ENV.md)). Until 2026-10-29 the client was committed ([DEVIATIONS.md](DEVIATIONS.md) DEV-009).

**Acceptance criteria**

- **AC-ARCH-008-1**
  - **Given** the repository
  - **When** `git ls-files apps/api/src/generated` runs
  - **Then** it lists nothing
- **AC-ARCH-008-2**
  - **Given** a checkout where `pnpm exec prisma generate` has run in `apps/api`
  - **When** `git status --porcelain --ignored apps/api/src/generated` runs
  - **Then** the generated files are reported as ignored (`!!`), not as untracked or modified

### REQ-ARCH-009 — Bound controllers, no try/catch

Legacy ID: ARCH-09.

Controllers are bound with `.bind(controller)` when registered on a router. Express 5 forwards errors thrown in async handlers to the error middleware, so handlers do not need try/catch.

**Acceptance criteria**

- **AC-ARCH-009-1**
  - **Given** a router module
  - **When** controller methods are registered
  - **Then** each is passed as `controller.method.bind(controller)`
- **AC-ARCH-009-2**
  - **Given** an async handler that throws an `AppError`
  - **When** the request is made
  - **Then** the error middleware produces the problem response without a try/catch in the handler

### REQ-ARCH-010 — userId in the request logger

Legacy ID: ARCH-10.

`AuthMiddleware.protect` and `AuthMiddleware.optionalAuth` (when a session is present) add `userId` to the request-scoped logger after authenticating ([AUTH.md](AUTH.md)).

**Acceptance criteria**

- **AC-ARCH-010-1**
  - **Given** a request with a valid `jwt` cookie to a protected or optional-auth route
  - **When** the handler logs through `getLogger()`
  - **Then** the log line carries `userId` and `requestId`

### REQ-ARCH-011 — getLogger for every log line

Legacy ID: ARCH-11.

Code obtains the logger with `getLogger()` (`context/requestContext.ts`) so every log line carries `requestId` (and `userId` when authenticated).

**Acceptance criteria**

- **AC-ARCH-011-1**
  - **Given** code running inside a request
  - **When** it logs through `getLogger()`
  - **Then** the line carries the request's `requestId`
- **AC-ARCH-011-2**
  - **Given** code running outside a request
  - **When** it calls `getLogger()`
  - **Then** it receives the base logger

### REQ-ARCH-012 — Shared schemas package build and `source` condition

Legacy ID: ARCH-12.

`packages/schemas` declares its own dependencies (`zod`, `@asteasolutions/zod-to-openapi`) and compiles with `pnpm build` (`tsc` → `dist/`). Its `exports` map has a custom `source` condition pointing to `src/index.ts`, followed by `types`/`default` pointing to `dist/`. Every development tool resolves the `source` condition, so no build of the package is needed while developing: the API and web TypeScript configs (`customConditions`), `tsx` (`--conditions=source` in the API `dev` and `create-user` scripts and the Prisma seed command), the API Vitest config (`ssr.resolve.conditions`) and the web Vite config (`resolve.conditions`). Plain Node (`node dist/server.js`, the Docker image) loads `dist/`.

**Acceptance criteria**

- **AC-ARCH-012-1**
  - **Given** `packages/schemas/package.json`
  - **When** it is read
  - **Then** it declares `zod` and `@asteasolutions/zod-to-openapi` as dependencies, a `build` script running `tsc`, and `exports["."]` with `source` → `./src/index.ts`, then `types` and `default` → `./dist/`
- **AC-ARCH-012-2**
  - **Given** a checkout where `packages/schemas/dist` does not exist
  - **When** `pnpm dev`, `pnpm test`, `pnpm create-user` or `pnpm seed` runs
  - **Then** `@survey-system/schemas` resolves to its TypeScript source and the command works
- **AC-ARCH-012-3**
  - **Given** the built API (`node dist/server.js`)
  - **When** it imports `@survey-system/schemas`
  - **Then** it loads `packages/schemas/dist`

### REQ-ARCH-013 — OpenAPI describes the real responses

Legacy ID: ARCH-12 (second use of the ID).

The OpenAPI document must describe the real responses (envelope, status codes, server URL, cookie auth), so the generated web client types match the actual payloads and the web code needs no response casts (REQ-FE-011).

**Acceptance criteria**

- **AC-ARCH-013-1**
  - **Given** any endpoint
  - **When** its real response is compared with its OpenAPI declaration
  - **Then** envelope, status codes and payload shape match (see REQ-API-031)
- **AC-ARCH-013-2**
  - **Given** the web code
  - **When** it reads API responses
  - **Then** it uses the generated types without `as any` or `as unknown as` casts

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-ARCH-1 | Existing implementation (migrated) | Done | REQ-ARCH-001, REQ-ARCH-002, REQ-ARCH-003, REQ-ARCH-004, REQ-ARCH-005, REQ-ARCH-006, REQ-ARCH-007, REQ-ARCH-008, REQ-ARCH-009, REQ-ARCH-010, REQ-ARCH-011, REQ-ARCH-012, REQ-ARCH-013 |
