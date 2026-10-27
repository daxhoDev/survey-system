← Back to [MAIN](MAIN.md)

# Configuration

- **Module:** Configuration
- **Module code:** CFG
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Environment variables of the API and the web app, their validation, their values in the deployment, and the configuration of the code generators.

Requirement numbers keep the legacy IDs: legacy `CFG-06` is `REQ-CFG-006`. Legacy numbering has no `CFG-12` or above.

### 1. API environment variables (`apps/api/.env`)

Loaded with `dotenv/config`. `.env` files are git-ignored; `.env.example` is allowed by `.gitignore`.

| Variable | Required | Default | Format / values | Meaning |
|----------|----------|---------|-----------------|---------|
| `DATABASE_URL` | yes | — | PostgreSQL connection string | Database |
| `PORT` | no | `3000` | positive integer | HTTP port |
| `NODE_ENV` | yes | — | `development` \| `production` | Environment. Deliberately no default: defaulting to `development` would expose stack traces (REQ-API-013) on a misconfigured deployment |
| `JWT_SECRET` | yes | — | string, **≥ 32 characters** | HMAC secret to sign access JWTs |
| `ACCESS_TOKEN_TTL_MINUTES` | yes | — | positive integer (minutes) | Lifetime of the access JWT **and** `maxAge` of the `jwt` cookie |
| `REFRESH_TOKEN_TTL_DAYS` | yes | — | positive integer (days) | Lifetime of the refresh token (`expires_at`) **and** `maxAge` of the `refresh` cookie |
| `CORS_ORIGIN` | in `production` | `http://localhost:5173` in `development` | single URL | Allowed CORS origin (one origin only) |
| `LOG_LEVEL` | no | `info` | pino level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) | Logger level |
| `TRUST_PROXY` | no | `0` | integer ≥ 0 | Number of reverse proxies in front of the API whose `X-Forwarded-For` is trusted (REQ-ANS-007) |

`TEST_DATABASE_URL` is read only by the API tests (not by the runtime schema): the database the `db` test project rebuilds and uses (REQ-DEVWF-002; test locations in [CONVENTIONS.md](CONVENTIONS.md) §Testing). It must be a dedicated database whose name contains `test`.

### 2. Web configuration

| Variable | Meaning |
|----------|---------|
| `VITE_API_URL` | Base URL of the API used by the generated client |

### 3. Code generation configuration

- `orval.config.ts` (root): input `http://localhost:3000/api/v1/docs-raw`, output `apps/web/src/lib/api`, mode `tags-split`, client `react-query`, http client `fetch`, mutator `customInstance`. See [DEV_WORKFLOW.md](DEV_WORKFLOW.md).
- `apps/api/prisma.config.ts`: schema `prisma/schema.prisma`, migrations `prisma/migrations`, seed command `tsx --conditions=source prisma/seed.ts` (REQ-DEVWF-001, REQ-ARCH-012).

## Requirements

### REQ-CFG-001 — API configuration schema validated at startup

Legacy ID: CFG-01.

The schema lives in `apps/api/src/config/env.ts` (API-only; not in `packages/schemas`). It is validated at startup, before `app` is imported and before the server listens.

**Acceptance criteria**

- **AC-CFG-001-1**
  - **Given** `apps/api/src/server.ts`
  - **When** its imports are read
  - **Then** `./config/env.js` is imported before `./app.js` (REQ-ARCH-003)
- **AC-CFG-001-2**
  - **Given** an invalid configuration
  - **When** the API starts
  - **Then** it exits before listening on any port

### REQ-CFG-002 — Every issue reported, exit code 1

Legacy ID: CFG-02.

On validation failure the process prints **every** issue (variable + message) to stderr with `console.error` (the only exception to REQ-API-033) and exits with code `1`. Secret values are never printed.

**Acceptance criteria**

- **AC-CFG-002-1**
  - **Given** a configuration with two invalid variables (e.g. `JWT_SECRET` too short and `NODE_ENV` missing)
  - **When** the API starts
  - **Then** stderr lists both variables with their messages and the process exits with code `1`
- **AC-CFG-002-2**
  - **Given** an invalid `JWT_SECRET` value
  - **When** the errors are printed
  - **Then** the value itself does not appear in the output

### REQ-CFG-003 — Typed config object only

Legacy ID: CFG-03.

Code reads configuration only from the exported, typed config object — never from `process.env` directly (no `as string` casts). Numeric values are coerced (`z.coerce.number().int().positive()`).

**Acceptance criteria**

- **AC-CFG-003-1**
  - **Given** the files in `apps/api/src`
  - **When** they are searched for `process.env`
  - **Then** the only read is the one in `apps/api/src/config/env.ts`
- **AC-CFG-003-2**
  - **Given** `PORT=3001` (a string in the environment)
  - **When** the configuration is loaded
  - **Then** `env.PORT` is the number `3001`; `PORT=0` or `PORT=1.5` is rejected

### REQ-CFG-004 — NODE_ENV values

Legacy ID: CFG-04.

`NODE_ENV` accepts only `development` or `production` (REQ-API-015).

**Acceptance criteria**

- **AC-CFG-004-1**
  - **Given** `NODE_ENV=test` or no `NODE_ENV`
  - **When** the configuration is validated
  - **Then** validation fails (REQ-CFG-002)

### REQ-CFG-005 — .env.example in sync

Legacy ID: CFG-05.

`apps/api/.env.example` documents every variable with safe example values and is kept in sync with the schema.

**Acceptance criteria**

- **AC-CFG-005-1**
  - **Given** `apps/api/.env.example` and the schema in `apps/api/src/config/env.ts`
  - **When** their variables are compared
  - **Then** every schema variable is in `.env.example` with a comment and a non-secret example value

### REQ-CFG-006 — CORS origin

Legacy ID: CFG-06.

The CORS origin comes from `CORS_ORIGIN` (REQ-API-024); in `production` it is required, in `development` it defaults to `http://localhost:5173`.

**Acceptance criteria**

- **AC-CFG-006-1**
  - **Given** `NODE_ENV=production` without `CORS_ORIGIN`
  - **When** the configuration is validated
  - **Then** it fails with an issue on `CORS_ORIGIN`
- **AC-CFG-006-2**
  - **Given** `NODE_ENV=development` without `CORS_ORIGIN`
  - **When** the configuration is loaded
  - **Then** `CORS_ORIGIN` is `http://localhost:5173`

### REQ-CFG-008 — Prisma CLI configuration outside the runtime schema

Legacy ID: CFG-08.

`apps/api/prisma.config.ts` is executed by the Prisma CLI and keeps reading `DATABASE_URL` from `process.env`; it is outside the runtime schema.

**Acceptance criteria**

- **AC-CFG-008-1**
  - **Given** `apps/api/prisma.config.ts`
  - **When** it is read
  - **Then** it takes the datasource URL from `process.env["DATABASE_URL"]` and does not import `src/config/env.ts`

### REQ-CFG-010 — API configuration in the deployment

Legacy ID: CFG-10.

In the deployment the API variables are set in the Render service (the image contains no `.env`, REQ-DEVWF-003). `DATABASE_URL` is the **direct** (non-pooled) Neon connection string, used both by the API and by the migrations: the API is a long-lived process with its own `pg` pool, so the Neon pooler is not needed. `CORS_ORIGIN` is the Vercel URL of the web app.

**Acceptance criteria**

- **AC-CFG-010-1**
  - **Given** the API image built from `apps/api/Dockerfile`
  - **When** its contents are listed
  - **Then** it holds no `.env` file

### REQ-CFG-007 — Configurable API base URL in the web

Legacy ID: CFG-07.

The API base URL used by the web app is configurable (`VITE_API_URL`, template in `apps/web/.env.example`); nothing in the web hardcodes the API host.

**Acceptance criteria**

- **AC-CFG-007-1**
  - **Given** the files in `apps/web/src`
  - **When** they are searched for an API host
  - **Then** the only one is the development default in `apps/web/src/config/env.ts`, and `apps/web/.env.example` documents `VITE_API_URL`

### REQ-CFG-011 — Web API URL in the deployment

Legacy ID: CFG-11.

In the deployment `VITE_API_URL` (set in the Vercel project, read at build time) is the web app's own Vercel URL, never the Render URL: the web reaches the API through the Vercel rewrite, so the session cookies stay first-party (REQ-DEVWF-008).

**Acceptance criteria**

- **AC-CFG-011-1**
  - **Given** the deployed web app
  - **When** it calls the API
  - **Then** the requests go to its own Vercel origin under `/api/`, never to the Render host

### REQ-CFG-009 — Hostless generated paths and validated web config

Legacy ID: CFG-09.

Orval generates paths without a host (`/api/v1/...`) and `customInstance` prefixes them with `VITE_API_URL`. The web validates `import.meta.env` with Zod when it starts (`apps/web/src/config/env.ts`): `VITE_API_URL` must be a URL; it defaults to `http://localhost:3000` in development and is required in a production build.

**Acceptance criteria**

- **AC-CFG-009-1**
  - **Given** the generated client in `apps/web/src/lib/api`
  - **When** its request URLs are read
  - **Then** they start with `/api/v1/` and contain no host
- **AC-CFG-009-2**
  - **Given** `VITE_API_URL=https://example.com/` and a generated path `/api/v1/surveys`
  - **When** `customInstance` builds the request URL
  - **Then** it is `https://example.com/api/v1/surveys`
- **AC-CFG-009-3**
  - **Given** `VITE_API_URL` set to a value that is not a URL
  - **When** the web starts
  - **Then** the configuration validation throws
- **AC-CFG-009-4**
  - **Given** no `VITE_API_URL`
  - **When** the web runs in development, or a production build runs
  - **Then** development uses `http://localhost:3000`, and production throws `VITE_API_URL is required in production builds`

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-CFG-1 | Existing implementation (migrated) | Done | REQ-CFG-001, REQ-CFG-002, REQ-CFG-003, REQ-CFG-004, REQ-CFG-005, REQ-CFG-006, REQ-CFG-007, REQ-CFG-008, REQ-CFG-009, REQ-CFG-010, REQ-CFG-011 |
