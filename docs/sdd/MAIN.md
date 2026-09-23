# Survey System — Spec-Driven Development Index

> **The specs in `docs/sdd/` are the primary source of truth for this project.**
> Code, README, OpenAPI document and any other artifact must conform to them.
> When code and specs disagree, the specs win, and the gap must be tracked in
> [BACKLOG.md](BACKLOG.md) (planned work) or [DEVIATIONS.md](DEVIATIONS.md)
> (accepted/unplanned divergence).

This file is the single entry point. Every spec links back here, and every spec
is listed here. Start with the process document before touching anything.

## How to read these specs

- Specs describe the **target behavior** of the system.
- Each requirement has a stable ID (`AUTH-03`, `SURV-07`, …) and a status tag:
  - `[implemented]` — the code currently satisfies the requirement.
  - `[pending: BL-xx]` — decided but not yet implemented; see the backlog item.
  - `[open: OQ-xx]` — not decided yet; the owner must decide before implementing.
- Identifiers from code (files, functions, fields) are written in `monospace`.

## Index

| # | Spec | Covers |
|---|------|--------|
| 00 | [SDD process](00-sdd-process.md) | Mandatory workflow for any change, deviation and backlog rules |
| 01 | [Overview](01-overview.md) | Purpose, actors, scope, glossary |
| 02 | [Architecture](02-architecture.md) | Monorepo layout, backend layers, request pipeline, shared schemas |
| 03 | [Data model](03-data-model.md) | Database tables, JSON document shapes, soft delete, IDs |
| 04 | [API conventions](04-api-conventions.md) | Routing, response envelope, errors (RFC 9457), rate limiting, logging, OpenAPI |
| 05 | [Configuration](05-configuration.md) | Environment variables and their validation |
| 10 | [Authentication](10-auth.md) | Signup, login, logout, refresh, current user, cookies, tokens |
| 11 | [Surveys](11-surveys.md) | Survey CRUD, questions, activation and locking, listing |
| 12 | [Answers](12-answers.md) | Submitting and managing answers, validation rules, IP uniqueness |
| 13 | [Statistics](13-stats.md) | Survey statistics endpoint and its computation |
| 20 | [Frontend](20-frontend.md) | Web app routes, pages, API client, auth handling, UI conventions |
| 30 | [Development workflow](30-dev-workflow.md) | Tooling, commands, code generation, migrations, testing, deployment |
| — | [BACKLOG.md](BACKLOG.md) | Decided-but-pending work (`BL-xx`) and open questions (`OQ-xx`) |
| — | [DEVIATIONS.md](DEVIATIONS.md) | Registry of deviations from the specs |

## Related files outside `docs/sdd`

- [`/AGENTS.md`](../../AGENTS.md) — mandatory rules for agents (points here).
- [`/CLAUDE.md`](../../CLAUDE.md) — imports `AGENTS.md` for Claude Code.
- [`/README.md`](../../README.md) — visitor-facing summary; must stay in sync with these specs.
