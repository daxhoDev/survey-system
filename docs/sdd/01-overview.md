# 01 — Overview

[← Back to index](MAIN.md)

## Purpose

Survey System is a university project: an enterprise system to create and manage
employee surveys, share them through a public link, collect anonymous answers
and review results and statistics.

## Actors

| Actor | Description | Authenticated |
|-------|-------------|---------------|
| **Manager** | Registered user that creates, edits, activates/deactivates and deletes surveys, and reviews answers and statistics. All registered users have the same permissions (no roles). | Yes (cookie JWT) |
| **Respondent** | Employee who opens a survey's public link and submits one answer. Identified only by origin IP. | No |

## Scope

In scope:

- User accounts created by invitation (or the `create-user` command) and cookie-based session management — [10-auth.md](10-auth.md).
- Survey authoring with three question types — [11-surveys.md](11-surveys.md).
- Survey lifecycle: draft → active ⇄ inactive, locking after first activation — [11-surveys.md](11-surveys.md).
- Anonymous answer collection, one answer per IP per survey — [12-answers.md](12-answers.md).
- Per-survey statistics — [13-stats.md](13-stats.md).
- Web dashboard for managers and a public answering page — [20-frontend.md](20-frontend.md).

Planned (see [BACKLOG.md](BACKLOG.md)):

- Web UI for invitations: management page and invitation acceptance page (BL-03, see 20-frontend FE-27, FE-28; the API is implemented).
- Containerized deployment (BL-02).

Out of scope: roles/permissions, multi-tenancy, respondent accounts, email
notifications, survey templates, exports.

## Glossary

| Term | Meaning |
|------|---------|
| **Survey** | A named, ordered list of questions, identified publicly by its `slug`. |
| **Slug** | URL-safe, lowercase identifier derived from the survey name (`slugify`, strict). Unique. |
| **Question** | Element of a survey: `id`, `name`, `type`, `isRequired`, optional `options`. |
| **Question type** | `TEXT_ANSWER`, `SINGLE_SELECT` or `MULTI_SELECT`. `TEXT_ANSWER` is the canonical name for free-text questions. |
| **Option** | Choice of a select question: `id`, `content`. |
| **Answer** | One respondent's submission to a survey: list of responses. |
| **Response** | Element of an answer: `id` (the question id) and `content`. |
| **Active** | Survey accepts answers (`isActive = true`). |
| **Locked** | Survey can no longer be edited (`isLocked = true`); becomes true on first activation and never reverts. |
| **Soft delete** | Rows are never physically deleted; `deleted_at` is set instead. |

## License

- **OV-01** `[implemented]` The project is licensed under the **MIT License**: `LICENSE` at the repository root, copyright "2026 Dayron Alexis Díaz Rodríguez (Daxho)"; `"license": "MIT"` in every `package.json`.
- **OV-02** `[implemented]` The author is credited as "Dayron Alexis Díaz Rodríguez (Daxho)" in `LICENSE`, the `author` field of `package.json` files that declare one, and the README.
