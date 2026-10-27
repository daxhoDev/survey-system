← Back to [MAIN](MAIN.md)

# Deviations

This is the historical record of every user decision that contradicts an **already approved** spec. Edits to specs that are not yet approved are plain edits and are not recorded here. Every deviation is also propagated to all affected docs. Rules: [AGENTS.md](../../AGENTS.md) §6.6.

<!--
Entry template:

### DEV-NNN — <title>
- **Date:** YYYY-MM-DD
- **Spec said:** <what the approved spec said: spec file (relative to `docs/sdd/`), REQ-IDs and previous version, e.g. AUTH.md, REQ-AUTH-002, v1.1>
- **User decided:** <the decision>
- **Reason:** <reason>
- **Affected files:** <list>
- **CHANGELOG ref:** <entry reference>
-->

### DEV-001 — API image on Node.js 24.22.1
- **Date:** 2026-10-27
- **Spec said:** DEV_WORKFLOW.md, REQ-DEVWF-003 (AC-DEVWF-003-1), v1.0: the API image builds from `node:24.19.0-alpine`.
- **User decided:** the API image builds from `node:24.22.1-alpine`, the same version as the environment preflight's Node.js minimum.
- **Reason:** keep the production runtime aligned with the minimum version the development environment is checked against.
- **Affected files:** DEV_WORKFLOW.md, ENV.md, CONVENTIONS.md
- **CHANGELOG ref:** 2026-10-27 · DEV_WORKFLOW.md → v2.0 · task chore/sdd-bootstrap / PH-ENV-1 · DEV-001

### DEV-002 — Test database migrated and emptied instead of reset
- **Date:** 2026-10-27
- **Spec said:** DEV_WORKFLOW.md, REQ-DEVWF-002 (AC-DEVWF-002-3), v1.0: the `db` project's global setup rebuilds the test database with `prisma migrate reset --force` once per run. CONFIGURATION.md, v1.0: the `db` project "rebuilds" the test database.
- **User decided:** the global setup applies migrations with `prisma migrate deploy` and empties every application table before the run, and a global teardown empties them again after the run, so the test database is left empty. `prisma migrate reset` is no longer used. Running the `db` tests needs no consent, as long as the test database is left empty.
- **Reason:** Prisma refuses `migrate reset` when an AI agent runs it unless `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` holds the user's literal consent, and the user wants agents to be able to run the `db` tests without leaving data behind.
- **Affected files:** DEV_WORKFLOW.md, CONFIGURATION.md, CONVENTIONS.md
- **CHANGELOG ref:** 2026-10-27 · DEV_WORKFLOW.md v2.0 · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002; 2026-10-27 · CONFIGURATION.md → v1.1 · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002; 2026-10-27 · CONVENTIONS.md v0.2 (Testing: test database) · task chore/sdd-bootstrap / PH-DEVWF-3 · DEV-002
