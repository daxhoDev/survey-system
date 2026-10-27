# MAIN — SDD Documentation Index

This is the entry point of the project documentation. Every document below links back to this file.

Process rules (workflow, agents, git, documentation rules): [AGENTS.md](../../AGENTS.md)

## Project overview

**Sondix** (repository `survey-system`) is a university project: an enterprise system to create and manage employee surveys. Managers (registered users, all with the same permissions) build surveys in a web dashboard, share a public link, collect anonymous answers (one per IP per survey) and review answers and statistics. Accounts are created only from single-use invitation links or with the `create-user` command.

It is a pnpm monorepo with a REST API (`apps/api`: Express 5, Prisma 7, PostgreSQL), a web app (`apps/web`: React 19, Vite, Tailwind CSS 4, shadcn/ui) and shared Zod schemas (`packages/schemas`). The API runs as a Docker image on Render, the web on Vercel and PostgreSQL on Neon. Purpose, actors, scope and glossary: [OVERVIEW.md](OVERVIEW.md).

## Process docs

| Document | Purpose | Version |
|---|---|---|
| [CONVENTIONS.md](CONVENTIONS.md) | Project-wide conventions (stack, style, structure, testing, environment preflight, dependencies) | v0.2 |
| [CHANGELOG.md](CHANGELOG.md) | Change history, references only | — |
| [DEVIATIONS.md](DEVIATIONS.md) | Record of user decisions that contradict approved specs | — |
| [_TEMPLATE.md](_TEMPLATE.md) | Spec module template (template, not a module) | — |

## Modules

| Document | Code | Purpose | Version | Status |
|---|---|---|---|---|
| [OVERVIEW.md](OVERVIEW.md) | OV | Purpose, actors, scope, glossary and licensing of the product | v1.0 | Approved |
| [ARCHITECTURE.md](ARCHITECTURE.md) | ARCH | Monorepo layout, backend layers, request pipeline, shared schemas and contract flow | v1.0 | Approved |
| [DATA_MODEL.md](DATA_MODEL.md) | DATA | Database tables, JSON document shapes, soft delete and identifiers | v1.0 | Approved |
| [API.md](API.md) | API | API conventions: routing, response envelope, errors (RFC 9457), validation, rate limiting, logging, OpenAPI | v1.0 | Approved |
| [CONFIGURATION.md](CONFIGURATION.md) | CFG | API and web environment variables, their validation, and code generation configuration | v1.1 | Approved |
| [AUTH.md](AUTH.md) | AUTH | Sessions, cookies and tokens, invitations, `create-user`, login, logout, refresh, current user | v1.0 | Approved |
| [SURVEYS.md](SURVEYS.md) | SURV | Survey resource, lifecycle (activation and locking), CRUD and listing | v1.0 | Approved |
| [ANSWERS.md](ANSWERS.md) | ANS | Submitting and managing answers, validation rules, IP uniqueness | v1.0 | Approved |
| [STATS.md](STATS.md) | STAT | Per-survey statistics and the survey summary counters | v1.0 | Approved |
| [FRONTEND.md](FRONTEND.md) | FE | Web app stack, API client, routes, pages and UI conventions | v1.0 | Approved |
| [BRAND.md](BRAND.md) | BRAND | Sondix name, palette, themes, typography, shape, accessibility targets, logo and textures | v1.0 | Approved |
| [DEV_WORKFLOW.md](DEV_WORKFLOW.md) | DEVWF | Prerequisites, commands, code generation, migrations, testing setup and deployment | v2.0 | Approved |
| [ENV.md](ENV.md) | ENV | Environment preflight script: runtime checks, test-suite check, status summary and exit-code contract | v1.0 | Approved |
