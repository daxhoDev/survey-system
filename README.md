# survey-system

University project: an enterprise system to create and manage employee surveys.
Managers build surveys in a web dashboard, share a public link, collect anonymous
answers (one per IP per survey) and review answers and statistics.

> This project follows **spec-driven development**. The full, authoritative
> documentation lives in [`docs/sdd/`](docs/sdd/MAIN.md) — start at
> [`docs/sdd/MAIN.md`](docs/sdd/MAIN.md).

## Features

- Cookie-based authentication with short-lived access JWT and rotating refresh token.
- Surveys with free-text, single-choice and multiple-choice questions, required or optional.
- Survey lifecycle: draft → active ⇄ inactive; a survey is locked for editing once activated.
- Public answering page; answers validated against the survey's questions.
- Per-survey statistics (completed/incomplete answers, votes per option) with charts.
- Interactive API documentation (Swagger UI).

Planned work (invitation-based accounts, Docker deployment, and more) is tracked in
[`docs/sdd/BACKLOG.md`](docs/sdd/BACKLOG.md).

## Tech stack

| Part | Location | Technologies |
|------|----------|--------------|
| API | [`apps/api`](apps/api) | Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL, Zod, JWT + bcrypt, pino, Helmet, rate limiting |
| Web | [`apps/web`](apps/web) | React 19, Vite, Tailwind CSS 4, shadcn/ui, React Router, TanStack Query, Orval-generated client |
| Shared schemas | [`packages/schemas`](packages/schemas) | Zod schemas used for validation and OpenAPI generation |

pnpm workspaces monorepo.

## Getting started

Prerequisites: Node.js, [pnpm](https://pnpm.io) and a PostgreSQL database.

```bash
pnpm install

# API configuration: copy apps/api/.env.example to apps/api/.env and adjust it
# (variables documented in docs/sdd/05-configuration.md)
cp apps/api/.env.example apps/api/.env

# Database
cd apps/api
pnpm exec prisma migrate dev
pnpm exec prisma generate
cd ../..

# Run API (http://localhost:3000) and web (http://localhost:5173)
pnpm dev
```

API documentation: <http://localhost:3000/api/v1/docs> (raw OpenAPI at `/api/v1/docs-raw`).

After changing the API contract, regenerate the web client with `pnpm generate:api`
(the API must be running).

## Configuration

The API reads its configuration from `apps/api/.env` (template: `apps/api/.env.example`)
and validates it at startup: if anything is missing or invalid it lists every problem
and exits. Required: `DATABASE_URL`, `NODE_ENV` (`development` | `production`),
`JWT_SECRET` (≥ 32 characters), `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`,
and `CORS_ORIGIN` in production. Optional: `PORT` (default `3000`), `LOG_LEVEL`
(default `info`). See [`docs/sdd/05-configuration.md`](docs/sdd/05-configuration.md).

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
