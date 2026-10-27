← Back to [MAIN](MAIN.md)

# Environment preflight

- **Module:** Environment preflight
- **Module code:** ENV
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

The environment preflight script: a health check that keeps work from starting on a broken environment ([AGENTS.md](../../AGENTS.md) golden rule 9, §4.6). It checks that the runtimes are installed and within the required versions, runs the test suite, and prints a status summary. Its exit code tells the caller whether the environment is usable.

The parameters (script path and name, variant, runtimes, version ranges, test command) are defined only in [CONVENTIONS.md](CONVENTIONS.md) §Environment preflight. This module refers to them and does not repeat their values. The only variant is the Bash script; there is no PowerShell variant.

How the script is used (the Manager's gate before each phase, the Reviewer's run in every review) is defined in [AGENTS.md](../../AGENTS.md) §4.6, not here. Where the script's own tests live and how they run is defined in [CONVENTIONS.md](CONVENTIONS.md) §Testing.

Related: [DEV_WORKFLOW.md](DEV_WORKFLOW.md) (commands, test setup, API image), [CONVENTIONS.md](CONVENTIONS.md) §Testing.

## Requirements

### REQ-ENV-001 — Runtimes installed (check 1)

For each runtime listed in CONVENTIONS.md §Environment preflight (Node.js, then pnpm), the script checks that its command is available. The check passes only when every listed runtime is found. When one is missing, the summary names it.

**Acceptance criteria**

- **AC-ENV-001-1**
  - **Given** `node` and `pnpm` are both available
  - **When** the script runs from the repository root
  - **Then** check 1 is reported `PASS`
- **AC-ENV-001-2**
  - **Given** `node` is not available
  - **When** the script runs
  - **Then** check 1 is reported `FAIL`, the reason names Node.js, and the script exits non-zero
- **AC-ENV-001-3**
  - **Given** `node` is available and `pnpm` is not
  - **When** the script runs
  - **Then** check 1 is reported `FAIL`, the reason names pnpm, and the script exits non-zero

### REQ-ENV-002 — Runtime versions (check 2)

For each runtime, the script compares the reported version with the range in CONVENTIONS.md §Environment preflight:

- Node.js: the version reported by `node --version` must be at least the minimum and below the ceiling.
- pnpm: `pnpm --version`, run from the repository root, must report exactly the pinned version. Because the root `devEngines` makes pnpm download and run that version, this checks the pnpm that will actually run the tests. A first run may download it (network access as a side effect).

The check passes only when every runtime is in range. When one is not, the summary names it with the version found and the version required.

**Acceptance criteria**

- **AC-ENV-002-1**
  - **Given** Node.js at the minimum version, or any version above it and below the ceiling, and pnpm reporting the pinned version
  - **When** the script runs
  - **Then** check 2 is reported `PASS`
- **AC-ENV-002-2**
  - **Given** Node.js below the minimum version (e.g. `24.22.0`)
  - **When** the script runs
  - **Then** check 2 is reported `FAIL` with the version found and the version required, and the script exits non-zero
- **AC-ENV-002-3**
  - **Given** Node.js at or above the ceiling (e.g. `25.0.0`)
  - **When** the script runs
  - **Then** check 2 is reported `FAIL` with the version found and the version required, and the script exits non-zero
- **AC-ENV-002-4**
  - **Given** `pnpm --version` at the repository root reports a version other than the pinned one
  - **When** the script runs
  - **Then** check 2 is reported `FAIL` with the version found and the version required, and the script exits non-zero
- **AC-ENV-002-5**
  - **Given** Node.js `24.22.1` and Node.js `24.100.0`
  - **When** the script compares each with the range
  - **Then** both pass: versions are compared numerically by major, minor and patch, not as text

### REQ-ENV-003 — Test suite (check 3)

The script runs the test command in CONVENTIONS.md §Environment preflight from the repository root. That command runs every workspace's tests with the API `db` project disabled for that run (`TEST_DATABASE_URL` set to empty), whatever `apps/api/.env` says. Check 3 therefore never connects to a database and needs no PostgreSQL. The check passes when the command exits `0`.

The script installs and generates nothing. Before running the tests it checks that the dependencies are installed (root `node_modules`) and that the Prisma client is generated (`apps/api/src/generated/prisma`). If either is missing, check 3 is `FAIL` with a one-line hint naming the command that fixes it (`pnpm install` at the root; `pnpm exec prisma generate` in `apps/api`), and the tests are not run.

If the repository has no test suite (no workspace defines a `test` script), check 3 is `SKIPPED`, and a skipped check does not fail the run.

**Acceptance criteria**

- **AC-ENV-003-1**
  - **Given** checks 1 and 2 passed, the dependencies are installed, the Prisma client is generated and every test passes
  - **When** the script runs
  - **Then** check 3 is reported `PASS`
- **AC-ENV-003-2**
  - **Given** a failing test
  - **When** the script runs
  - **Then** check 3 is reported `FAIL` and the script exits non-zero
- **AC-ENV-003-3**
  - **Given** `apps/api/.env` sets `TEST_DATABASE_URL` and no PostgreSQL is running
  - **When** the script runs
  - **Then** the API `db` project does not run, no database is contacted, and check 3 depends only on the other tests
- **AC-ENV-003-4**
  - **Given** the root `node_modules` is missing
  - **When** the script runs
  - **Then** check 3 is reported `FAIL` with a hint to run `pnpm install`, the tests are not run, and nothing is installed
- **AC-ENV-003-5**
  - **Given** the dependencies are installed and `apps/api/src/generated/prisma` is missing
  - **When** the script runs
  - **Then** check 3 is reported `FAIL` with a hint to run `pnpm exec prisma generate` in `apps/api`, the tests are not run, and nothing is generated
- **AC-ENV-003-6**
  - **Given** no workspace defines a `test` script
  - **When** the script runs with checks 1 and 2 passing
  - **Then** check 3 is reported `SKIPPED` and the script exits `0`
- **AC-ENV-003-7**
  - **Given** any run of the script
  - **When** it finishes
  - **Then** no tracked file has changed and no file has been created outside ignored test output

### REQ-ENV-004 — Status summary (check 4)

The script ends by printing a summary with one line per check, `Check <n> (<name>): PASS|FAIL|SKIPPED`, and a short reason on every `FAIL` or `SKIPPED` line. The last line is `Result: PASS` or `Result: FAIL`. When check 1 or 2 fails, the later checks are not run and are reported `SKIPPED` with the reason "an earlier check failed".

**Acceptance criteria**

- **AC-ENV-004-1**
  - **Given** any run of the script
  - **When** it finishes
  - **Then** the output ends with one line for each of checks 1–3, in order, each stating `PASS`, `FAIL` or `SKIPPED`, followed by a `Result:` line
- **AC-ENV-004-2**
  - **Given** check 1 fails
  - **When** the script finishes
  - **Then** checks 2 and 3 are reported `SKIPPED` with the reason "an earlier check failed", no tests are run, and the result is `FAIL`
- **AC-ENV-004-3**
  - **Given** check 1 passes and check 2 fails
  - **When** the script finishes
  - **Then** check 3 is reported `SKIPPED` with the reason "an earlier check failed", no tests are run, and the result is `FAIL`

### REQ-ENV-005 — Exit-code contract

The script exits `0` only when every check passed (a skipped test suite, AC-ENV-003-6, still passes). It exits `1` if any of checks 1–3 failed.

**Acceptance criteria**

- **AC-ENV-005-1**
  - **Given** checks 1–3 all pass
  - **When** the script finishes
  - **Then** it exits `0` and the summary ends with `Result: PASS`
- **AC-ENV-005-2**
  - **Given** any one of checks 1–3 fails
  - **When** the script finishes
  - **Then** it exits `1` and the summary ends with `Result: FAIL`

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-ENV-1 | Preflight script and production Node alignment | Done | REQ-ENV-001, REQ-ENV-002, REQ-ENV-003, REQ-ENV-004, REQ-ENV-005, REQ-DEVWF-003 |

PH-ENV-1 creates the script at the path in CONVENTIONS.md §Environment preflight. It also moves the API image to the same Node.js version as the preflight minimum: `apps/api/Dockerfile` `ARG NODE_VERSION` goes from `24.19.0` to `24.22.1` (REQ-DEVWF-003, [DEVIATIONS.md](DEVIATIONS.md) DEV-001).
