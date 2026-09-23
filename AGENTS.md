# Survey System — Agent Instructions

These rules are **mandatory** for any agent (and human) working in this repository.

## 1. The specs are the source of truth

- The specifications in [`docs/sdd/`](docs/sdd/MAIN.md) are the **primary source of truth**.
  Start at [`docs/sdd/MAIN.md`](docs/sdd/MAIN.md), the index that links every spec.
- **Before implementing any change — feature, fix, refactor, dependency, config, docs —
  you must read and follow the relevant specs** and the process in
  [`docs/sdd/00-sdd-process.md`](docs/sdd/00-sdd-process.md).
- If code and specs disagree, the specs win. Planned gaps are tracked in
  [`docs/sdd/BACKLOG.md`](docs/sdd/BACKLOG.md).

## 2. Deviations

- Any deviation from the specs must be declared in
  [`docs/sdd/DEVIATIONS.md`](docs/sdd/DEVIATIONS.md) **and** documented in every
  spec where it is relevant.
- No deviation may be introduced without the owner's explicit approval.

## 3. Keep everything in sync

- Every change must be documented exhaustively **wherever it is mentioned**: the
  affected specs, cross-references, `BACKLOG.md`, `DEVIATIONS.md`, the OpenAPI
  registry (`apps/api/src/lib/openapi.ts`) and the root [`README.md`](README.md).
- The specs must **always** be synchronized and up to date. A change is not done
  until they are.
- `README.md` (repository root) is the only README and is aimed at visitors of the
  repository; keep it consistent with the specs.

## 4. Branches

- Branch from `development` and open every PR against `development`.
- **Never** open a PR against or merge into `master`: only the owner merges
  `development` into `master`, manually (see DEV-WF-05 in
  [`30-dev-workflow.md`](docs/sdd/30-dev-workflow.md)).

## 5. Never decide alone

- **Consult the owner before making any change.** Never take decisions on your own.
- Analyze the possible options, present them with trade-offs and a
  recommendation, and wait for an explicit decision.
- Ask every pertinent question so that no doubt is resolved by the agent.
  Items marked `[open: OQ-xx]` in the specs are undecided by definition.

## 6. Where to find things

| Topic | Spec |
|-------|------|
| Workflow, backlog and deviation rules | [00-sdd-process.md](docs/sdd/00-sdd-process.md) |
| Monorepo, backend layers, request pipeline | [02-architecture.md](docs/sdd/02-architecture.md) |
| Database and JSON documents | [03-data-model.md](docs/sdd/03-data-model.md) |
| Responses, errors (`AppError`, problem+json), rate limits, OpenAPI | [04-api-conventions.md](docs/sdd/04-api-conventions.md) |
| Environment variables | [05-configuration.md](docs/sdd/05-configuration.md) |
| Auth, surveys, answers, stats | [10](docs/sdd/10-auth.md) · [11](docs/sdd/11-surveys.md) · [12](docs/sdd/12-answers.md) · [13](docs/sdd/13-stats.md) |
| Web app | [20-frontend.md](docs/sdd/20-frontend.md) |
| Commands, codegen, migrations, testing, deployment | [30-dev-workflow.md](docs/sdd/30-dev-workflow.md) |
