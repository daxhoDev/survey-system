# Sondix

An enterprise system to create and manage employee surveys. *La información comienza escuchando.*

## Overview

Sondix (repository `survey-system`) is a university project: an enterprise system to create and manage employee surveys.
Managers build surveys in a web dashboard, share a public link, collect anonymous
answers (one per IP per survey) and review answers and statistics.

The full specification lives in [`docs/sdd/`](docs/sdd/MAIN.md); start at
[`docs/sdd/MAIN.md`](docs/sdd/MAIN.md).

### Features

- Cookie-based authentication with short-lived access JWT and rotating refresh token.
- No public signup: accounts are created from single-use invitation links (48 h) or with the `create-user` command.
- Surveys with free-text, single-choice and multiple-choice questions, required or optional.
- Survey lifecycle: draft → active ⇄ inactive; a survey is locked for editing once activated.
- Public answering page, designed mobile-first as a single-column questionnaire sheet: numbered questions, large tap targets for options, a running "answered" count with a progress bar (kept at the top of the screen on mobile), required questions checked before sending, and a thank-you confirmation. Answers are validated against the survey's questions.
- Dashboard with survey counters (total, active, inactive) and the most recently activated active surveys side by side: answer totals with completed/incomplete bars on a common scale.
- Survey list with each survey's answer and completed counts, search by name, status filter, sortable columns and pagination.
- Per-survey statistics: a summary line (answers, completed, incomplete, questions), a completed/incomplete bar with percentages, and one small chart per choice question with each option's votes and share of respondents, all on a common scale.
- Interactive API documentation (Swagger UI).
- Sondix visual identity: light and dark themes (Claro / Oscuro / Sistema), a sober palette with tabular figures in Work Sans, dense ruled tables and a top navigation bar.

### Tech stack

| Part | Location | Technologies |
|------|----------|--------------|
| API | [`apps/api`](apps/api) | Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod, JWT + bcrypt, pino, Helmet, rate limiting |
| Web | [`apps/web`](apps/web) | React 19, Vite, Tailwind CSS 4, shadcn/ui, React Router, TanStack Query, Orval-generated client |
| Shared schemas | [`packages/schemas`](packages/schemas) | Zod schemas used for validation and OpenAPI generation |

pnpm workspaces monorepo.

## Requirements

- Node.js 24 (24.22.1 or later)
- [pnpm](https://pnpm.io) (the root `package.json` pins version 11.5.3, downloaded automatically)
- Docker (or your own PostgreSQL)

## Installation

```bash
pnpm install

# API configuration: copy apps/api/.env.example to apps/api/.env and adjust it
# (variables documented in docs/sdd/CONFIGURATION.md)
cp apps/api/.env.example apps/api/.env

# Database: local PostgreSQL with a development and a test database
docker compose up -d
cd apps/api
pnpm exec prisma migrate dev
pnpm exec prisma generate
pnpm seed          # optional demo data: log in as demo@example.com / demo12345
pnpm create-user   # or create your own first account (asks email, username, password)
cd ../..
```

## Usage

```bash
# Run API (http://localhost:3000) and web (http://localhost:5173)
pnpm dev
```

API documentation: <http://localhost:3000/api/v1/docs> (raw OpenAPI at `/api/v1/docs-raw`).

## Configuration

The API reads its configuration from `apps/api/.env` (template: `apps/api/.env.example`)
and validates it at startup: if anything is missing or invalid it lists every problem
and exits. Required: `DATABASE_URL`, `NODE_ENV` (`development` | `production`),
`JWT_SECRET` (≥ 32 characters), `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`,
and `CORS_ORIGIN` in production. Optional: `PORT` (default `3000`), `LOG_LEVEL`
(default `info`), `TRUST_PROXY` (number of reverse proxies in front of the API,
default `0`). See [`docs/sdd/CONFIGURATION.md`](docs/sdd/CONFIGURATION.md).

The web reads `VITE_API_URL` (template: `apps/web/.env.example`), the API base URL.
It defaults to `http://localhost:3000` in development and is required when building
for production.

## Development

### Tests

```bash
pnpm test   # API and web (Vitest)
```

API tests that need a database use `TEST_DATABASE_URL` (see `apps/api/.env.example`);
without it they are skipped. It must be a dedicated database whose name contains `test`
(the local `docker compose` creates `survey_system_test`). Each run applies pending
migrations and empties every table before the tests and again when they finish, so the
test database is left empty; it is never dropped or reset.
See [`docs/sdd/DEV_WORKFLOW.md`](docs/sdd/DEV_WORKFLOW.md).

### Environment check

```bash
bash scripts/preflight.sh
```

Checks that Node.js (24.22.1 or later, below 25) and pnpm 11.5.3 are installed, then
runs the tests without the database tests, and prints a summary. It exits `0` only if
everything passed. It installs nothing: run `pnpm install` and
`pnpm exec prisma generate` (in `apps/api`) first. Its own tests:
`bash scripts/tests/preflight.test.sh`.

### API client

After changing the API contract, regenerate the web client with `pnpm generate:api`
(the API must be running).

### Deployment

Free tiers: the API runs as a Docker image on [Render](https://render.com), the web on
[Vercel](https://vercel.com) and PostgreSQL on [Neon](https://neon.tech).

- **API image**: `apps/api/Dockerfile`, built from the repository root. It applies pending
  migrations (`prisma migrate deploy`) every time it starts. Try it locally with
  `docker compose -f docker-compose.prod.yml up --build`.
- **Render**: Docker web service with Dockerfile path `apps/api/Dockerfile` and the
  repository root as build context. Environment: `NODE_ENV=production`, `DATABASE_URL`
  (the direct Neon connection string), `JWT_SECRET`, `ACCESS_TOKEN_TTL_MINUTES`,
  `REFRESH_TOKEN_TTL_DAYS`, `CORS_ORIGIN` (the Vercel URL) and `TRUST_PROXY`.
- **Vercel**: project with root directory `apps/web` and `VITE_API_URL` set to the
  project's own Vercel URL. `apps/web/vercel.json` forwards `/api/*` to Render, so the
  browser only talks to Vercel and the session cookies work.
- **Migrations by hand**: `DATABASE_URL=<Neon URL> pnpm exec prisma migrate deploy` in
  `apps/api`.

On the free plan Render stops the API when idle: the first request afterwards can take
about a minute. See [`docs/sdd/DEV_WORKFLOW.md`](docs/sdd/DEV_WORKFLOW.md).

### Documentation

| | |
|---|---|
| Specification index | [`docs/sdd/MAIN.md`](docs/sdd/MAIN.md) |
| Contributing / agents | [`AGENTS.md`](AGENTS.md) |

## Author

**Dayron Alexis Díaz Rodríguez** (Daxho)

## License

[MIT](LICENSE) © 2026 Dayron Alexis Díaz Rodríguez (Daxho)
