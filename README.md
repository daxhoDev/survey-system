# Sondix

*La información comienza escuchando.*

Sondix (repository `survey-system`) is a university project: an enterprise system to create and manage employee surveys.
Managers build surveys in a web dashboard, share a public link, collect anonymous
answers (one per IP per survey) and review answers and statistics.

> This project follows **spec-driven development**. The full, authoritative
> documentation lives in [`docs/sdd/`](docs/sdd/MAIN.md) — start at
> [`docs/sdd/MAIN.md`](docs/sdd/MAIN.md).

## Features

- Cookie-based authentication with short-lived access JWT and rotating refresh token.
- No public signup: accounts are created from single-use invitation links (48 h) or with the `create-user` command.
- Surveys with free-text, single-choice and multiple-choice questions, required or optional.
- Survey lifecycle: draft → active ⇄ inactive; a survey is locked for editing once activated.
- Public answering page; answers validated against the survey's questions.
- Survey list with search by name, status filter, sortable columns and pagination.
- Per-survey statistics (completed/incomplete answers, votes per option) with charts.
- Interactive API documentation (Swagger UI).
- Sondix brand identity: light and dark themes (Claro / Oscuro / Sistema), brand palette, Manrope and Inter typography.

Planned work is tracked in [`docs/sdd/BACKLOG.md`](docs/sdd/BACKLOG.md).

## Tech stack

| Part | Location | Technologies |
|------|----------|--------------|
| API | [`apps/api`](apps/api) | Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod, JWT + bcrypt, pino, Helmet, rate limiting |
| Web | [`apps/web`](apps/web) | React 19, Vite, Tailwind CSS 4, shadcn/ui, React Router, TanStack Query, Orval-generated client |
| Shared schemas | [`packages/schemas`](packages/schemas) | Zod schemas used for validation and OpenAPI generation |

pnpm workspaces monorepo.

## Getting started

Prerequisites: Node.js 24, [pnpm](https://pnpm.io) and Docker (or your own PostgreSQL).

```bash
pnpm install

# API configuration: copy apps/api/.env.example to apps/api/.env and adjust it
# (variables documented in docs/sdd/05-configuration.md)
cp apps/api/.env.example apps/api/.env

# Database: local PostgreSQL with a development and a test database
docker compose up -d
cd apps/api
pnpm exec prisma migrate dev
pnpm exec prisma generate
pnpm seed          # optional demo data: log in as demo@example.com / demo12345
pnpm create-user   # or create your own first account (asks email, username, password)
cd ../..

# Run API (http://localhost:3000) and web (http://localhost:5173)
pnpm dev
```

API documentation: <http://localhost:3000/api/v1/docs> (raw OpenAPI at `/api/v1/docs-raw`).

After changing the API contract, regenerate the web client with `pnpm generate:api`
(the API must be running).

## Tests

```bash
pnpm test   # API and web (Vitest)
```

API tests that need a database use `TEST_DATABASE_URL` (see `apps/api/.env.example`);
without it they are skipped. See [`docs/sdd/30-dev-workflow.md`](docs/sdd/30-dev-workflow.md) §4.

## Configuration

The API reads its configuration from `apps/api/.env` (template: `apps/api/.env.example`)
and validates it at startup: if anything is missing or invalid it lists every problem
and exits. Required: `DATABASE_URL`, `NODE_ENV` (`development` | `production`),
`JWT_SECRET` (≥ 32 characters), `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`,
and `CORS_ORIGIN` in production. Optional: `PORT` (default `3000`), `LOG_LEVEL`
(default `info`), `TRUST_PROXY` (number of reverse proxies in front of the API,
default `0`). See [`docs/sdd/05-configuration.md`](docs/sdd/05-configuration.md).

The web reads `VITE_API_URL` (template: `apps/web/.env.example`), the API base URL.
It defaults to `http://localhost:3000` in development and is required when building
for production.

## Deployment

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
about a minute. See [`docs/sdd/30-dev-workflow.md`](docs/sdd/30-dev-workflow.md) §5.

## Documentation

| | |
|---|---|
| Specs index | [`docs/sdd/MAIN.md`](docs/sdd/MAIN.md) |
| Contributing / agents | [`AGENTS.md`](AGENTS.md) |
| Backlog & open questions | [`docs/sdd/BACKLOG.md`](docs/sdd/BACKLOG.md) |

## Author

**Dayron Alexis Díaz Rodríguez** (Daxho)

## License

[MIT](LICENSE) © 2026 Dayron Alexis Díaz Rodríguez (Daxho)
