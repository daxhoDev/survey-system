# 05 — Configuration

[← Back to index](MAIN.md)

## 1. API environment variables (`apps/api/.env`)

Loaded with `dotenv/config`. `.env` files are git-ignored; `.env.example` is
allowed by `.gitignore`.

### 1.1 Variables `[implemented]`

| Variable | Required | Default | Format / values | Meaning |
|----------|----------|---------|-----------------|---------|
| `DATABASE_URL` | yes | — | PostgreSQL connection string | Database |
| `PORT` | no | `3000` | positive integer | HTTP port |
| `NODE_ENV` | yes | — | `development` \| `production` | Environment. Deliberately no default: defaulting to `development` would expose stack traces (API-13) on a misconfigured deployment |
| `JWT_SECRET` | yes | — | string, **≥ 32 characters** | HMAC secret to sign access JWTs |
| `ACCESS_TOKEN_TTL_MINUTES` | yes | — | positive integer (minutes) | Lifetime of the access JWT **and** `maxAge` of the `jwt` cookie |
| `REFRESH_TOKEN_TTL_DAYS` | yes | — | positive integer (days) | Lifetime of the refresh token (`expires_at`) **and** `maxAge` of the `refresh` cookie |
| `CORS_ORIGIN` | in `production` | `http://localhost:5173` in `development` | single URL | Allowed CORS origin (one origin only) |
| `LOG_LEVEL` | no | `info` | pino level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) | Logger level |

### 1.2 Requirements

- **CFG-01** `[implemented]` The schema lives in `apps/api/src/config/env.ts` (API-only; not in `packages/schemas`). It is validated at startup, before `app` is imported and before the server listens.
- **CFG-02** `[implemented]` On validation failure the process prints **every** issue (variable + message) to stderr with `console.error` (the only exception to API-33) and exits with code `1`. Secret values are never printed.
- **CFG-03** `[implemented]` Code reads configuration only from the exported, typed config object — never from `process.env` directly (no `as string` casts). Numeric values are coerced (`z.coerce.number().int().positive()`).
- **CFG-04** `[implemented]` `NODE_ENV` accepts only `development` or `production` (API-15).
- **CFG-05** `[implemented]` `apps/api/.env.example` documents every variable with safe example values and is kept in sync with the schema.
- **CFG-06** `[implemented]` The CORS origin comes from `CORS_ORIGIN` (API-24); in `production` it is required, in `development` it defaults to `http://localhost:5173`.
- **CFG-08** `[implemented]` `apps/api/prisma.config.ts` is executed by the Prisma CLI and keeps reading `DATABASE_URL` from `process.env`; it is outside the runtime schema.

## 2. Web configuration

| Variable | Meaning | Status |
|----------|---------|--------|
| `VITE_API_URL` | Base URL of the API used by the generated client | `[pending: BL-14]` |

- **CFG-07** `[pending: BL-14]` The API base URL used by the web app is configurable (`VITE_API_URL`) instead of being hardcoded as `http://localhost:3000` in the generated client (`orval.config.ts` `baseUrl`) and empty `baseURL` in `apps/web/src/lib/api/mutator/customInstance.ts`.
- **CFG-09** `[open: OQ-17]` How `VITE_API_URL` is applied and validated (e.g. Orval generating relative paths and `customInstance` prefixing `VITE_API_URL`; Zod validation of `import.meta.env` in the web).

## 3. Code generation configuration

- `orval.config.ts` (root): input `http://localhost:3000/api/v1/docs-raw`, output `apps/web/src/lib/api`, mode `tags-split`, client `react-query`, http client `fetch`, mutator `customInstance`. See [30-dev-workflow.md](30-dev-workflow.md).
- `apps/api/prisma.config.ts`: schema `prisma/schema.prisma`, migrations `prisma/migrations`, seed command `tsx prisma/seed.ts` (file does not exist — BL-17).
