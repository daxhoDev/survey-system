← Back to [MAIN](MAIN.md)

# Overview

- **Module:** Overview
- **Module code:** OV
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Purpose, actors, scope, glossary and licensing of the product.

Requirement numbers keep the legacy IDs: legacy `OV-01` is `REQ-OV-001`.

### Purpose

**Sondix** (repository `survey-system`) is a university project: an enterprise system to create and manage employee surveys, share them through a public link, collect anonymous answers and review results and statistics.

### Actors

| Actor | Description | Authenticated |
|-------|-------------|---------------|
| **Manager** | Registered user that creates, edits, activates/deactivates and deletes surveys, and reviews answers and statistics. All registered users have the same permissions (no roles). | Yes (cookie JWT) |
| **Respondent** | Employee who opens a survey's public link and submits one answer. Identified only by origin IP. | No |

### Scope

In scope:

- User accounts created by invitation (or the `create-user` command) and cookie-based session management — [AUTH.md](AUTH.md).
- Survey authoring with three question types — [SURVEYS.md](SURVEYS.md).
- Survey lifecycle: draft → active ⇄ inactive, locking after first activation — [SURVEYS.md](SURVEYS.md).
- Anonymous answer collection, one answer per IP per survey — [ANSWERS.md](ANSWERS.md).
- Per-survey statistics — [STATS.md](STATS.md).
- Web dashboard for managers and a public answering page — [FRONTEND.md](FRONTEND.md).

Deployment: API as a Docker image on Render, web on Vercel, PostgreSQL on Neon — [DEV_WORKFLOW.md](DEV_WORKFLOW.md).

Out of scope: roles/permissions, multi-tenancy, respondent accounts, email notifications, survey templates, exports.

### Glossary

| Term | Meaning |
|------|---------|
| **Survey** | A named, ordered list of questions, identified publicly by its `slug`. |
| **Slug** | URL-safe, lowercase identifier derived from the survey name (`slugify`, strict). Unique among non-deleted surveys. |
| **Question** | Element of a survey: `id`, `name`, `type`, `isRequired`, optional `options`. |
| **Question type** | `TEXT_ANSWER`, `SINGLE_SELECT` or `MULTI_SELECT`. `TEXT_ANSWER` is the canonical name for free-text questions. |
| **Option** | Choice of a select question: `id`, `content`. |
| **Answer** | One respondent's submission to a survey: list of responses. |
| **Response** | Element of an answer: `id` (the question id) and `content`. |
| **Active** | Survey accepts answers (`isActive = true`). |
| **Locked** | Survey can no longer be edited (`isLocked = true`); becomes true on first activation and never reverts. |
| **Soft delete** | Rows are never physically deleted; `deleted_at` is set instead. |

## Requirements

### REQ-OV-001 — MIT License

Legacy ID: OV-01.

The project is licensed under the **MIT License**: `LICENSE` at the repository root, copyright "2026 Dayron Alexis Díaz Rodríguez (Daxho)"; `"license": "MIT"` in every `package.json`.

**Acceptance criteria**

- **AC-OV-001-1**
  - **Given** the repository root
  - **When** `LICENSE` is read
  - **Then** it is the MIT License with copyright "2026 Dayron Alexis Díaz Rodríguez (Daxho)"
- **AC-OV-001-2**
  - **Given** every `package.json` in the repository (root, `apps/api`, `apps/web`, `packages/schemas`)
  - **When** its `license` field is read
  - **Then** it is `"MIT"`

### REQ-OV-002 — Author credit

Legacy ID: OV-02.

The author is credited as "Dayron Alexis Díaz Rodríguez (Daxho)" in `LICENSE`, the `author` field of the `package.json` files that declare one, and the README.

**Acceptance criteria**

- **AC-OV-002-1**
  - **Given** `LICENSE`, `README.md` and every `package.json` with a non-empty `author` field
  - **When** the author credit is read
  - **Then** it is "Dayron Alexis Díaz Rodríguez (Daxho)"

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-OV-1 | Existing implementation (migrated) | Done | REQ-OV-001, REQ-OV-002 |
