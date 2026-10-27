← Back to [MAIN](MAIN.md)

# Data model

- **Module:** Data model
- **Module code:** DATA
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Database tables, JSON document shapes, soft delete and identifiers.

Source of truth for the physical schema: `apps/api/prisma/schema.prisma` plus the migrations in `apps/api/prisma/migrations`. This spec describes the **target** model.

Requirement numbers keep the legacy IDs: legacy `DATA-06` is `REQ-DATA-006`.

### Tables

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `username` | VARCHAR(50) | Unique among non-deleted users (enforced in service, not DB) |
| `email` | TEXT | Unique among non-deleted users (enforced in service, not DB) |
| `password` | TEXT | bcrypt hash (cost 10). Never returned by the API |
| `created_at` | TIMESTAMPTZ | default now |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

#### `refresh_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `user_id` | UUID UNIQUE FK → users.id | `ON DELETE CASCADE`. Unique ⇒ at most one active refresh token (session) per user |
| `token_hash` | TEXT UNIQUE | SHA-256 hex of the raw token; the raw token is only sent in the cookie |
| `created_at` | TIMESTAMPTZ | default now |
| `expires_at` | TIMESTAMPTZ | now + `REFRESH_TOKEN_TTL_DAYS` days |

#### `invitations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `email` | TEXT | invited email; the account is created with it |
| `token_hash` | TEXT UNIQUE | SHA-256 hex of the raw token (REQ-AUTH-023) |
| `invited_by` | UUID? FK → users.id | `ON DELETE SET NULL` |
| `created_at` | TIMESTAMPTZ | default now |
| `expires_at` | TIMESTAMPTZ | created_at + 48 h |
| `accepted_at` | TIMESTAMPTZ? | set when the account is created |
| `revoked_at` | TIMESTAMPTZ? | set when revoked or replaced |

#### `surveys`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `name` | TEXT | min 5 chars |
| `slug` | TEXT | derived from name; unique among non-deleted surveys (partial unique index `is_unique`, REQ-DATA-006) |
| `questions` | JSONB | array of Question documents (see JSON documents) |
| `is_active` | BOOLEAN | default false |
| `is_locked` | BOOLEAN | NOT NULL, default false; set on first activation, never reset (REQ-SURV-002). Migration `20260923220000_survey_is_locked` |
| `activated_at` | TIMESTAMPTZ? | time of the **latest** activation; null while inactive, except on deleted surveys, which keep it for auditing (REQ-SURV-014, REQ-SURV-019) |
| `created_at` | TIMESTAMPTZ | default now |
| `updated_at` | TIMESTAMPTZ? | set on every update |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

#### `answers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `survey_id` | UUID? FK → surveys.id | `ON DELETE SET NULL` |
| `responses` | JSONB | array of Response documents (see JSON documents) |
| `origin_ip` | INET | respondent IP |
| `created_at` | TIMESTAMPTZ | default now |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

### JSON documents

Validated by `packages/schemas/src/surveySchema.ts` and `answerSchema.ts`.

Question (element of `surveys.questions`):

```jsonc
{
  "id": 1,                     // integer ≥ 1, unique within the survey
  "name": "Are you happy?",    // string, min 5
  "type": "SINGLE_SELECT",     // "TEXT_ANSWER" | "SINGLE_SELECT" | "MULTI_SELECT"
  "options": [                 // required and non-empty for *_SELECT, forbidden for TEXT_ANSWER
    { "id": 1, "content": "Yes" },  // id integer ≥ 1; content non-empty string
    { "id": 2, "content": "No" }
  ],
  "isRequired": true
}
```

Response (element of `answers.responses`):

```jsonc
{ "id": 1, "content": "Some text" }   // TEXT_ANSWER: string (min 2 chars)
{ "id": 2, "content": [1] }           // SINGLE_SELECT: array with one option id
{ "id": 3, "content": [1, 3] }        // MULTI_SELECT: non-empty array of option ids
```

`id` is the id of the answered question. Semantic rules are in [ANSWERS.md](ANSWERS.md).

### Entity relationships

```text
users 1 ── 0..1 refresh_tokens
users 1 ── 0..* invitations (invited_by)
surveys 1 ── 0..* answers
```

Surveys are not owned by users: every authenticated user can manage every survey.

## Requirements

### REQ-DATA-001 — Application-generated UUID v7 keys

Legacy ID: DATA-01.

Primary keys are UUID v7 generated in the application (`uuid.v7()`), not by the database.

**Acceptance criteria**

- **AC-DATA-001-1**
  - **Given** any row created through the API or the scripts
  - **When** its `id` is inspected
  - **Then** it is a UUID version 7 set by the application (the schema has no database default for `id`)

### REQ-DATA-002 — Timestamps

Legacy ID: DATA-02.

Timestamps are `TIMESTAMPTZ(6)`. `created_at` defaults to `now()`.

**Acceptance criteria**

- **AC-DATA-002-1**
  - **Given** `schema.prisma`
  - **When** the timestamp columns are read
  - **Then** they are `@db.Timestamptz(6)` and every `created_at` has `@default(now())`

### REQ-DATA-003 — Soft delete

Legacy ID: DATA-03.

Soft delete: `surveys`, `answers` and `users` have a nullable `deleted_at`. Rows with `deleted_at IS NOT NULL` are treated as non-existent by every read path, including the refresh-token lookup (a soft-deleted user's refresh token is rejected, REQ-AUTH-019) and the inviter of an invitation (`invitedBy` is `null` for a soft-deleted inviter, REQ-AUTH-025). `refresh_tokens` are hard-deleted.

**Acceptance criteria**

- **AC-DATA-003-1**
  - **Given** a soft-deleted survey, answer or user
  - **When** any API read path would return or use it
  - **Then** it behaves as if the row did not exist
- **AC-DATA-003-2**
  - **Given** a refresh token whose user is soft-deleted
  - **When** `POST /api/v1/users/refresh` is called with it
  - **Then** the response is `401 Invalid token`
- **AC-DATA-003-3**
  - **Given** an invitation whose inviter is soft-deleted
  - **When** `GET /api/v1/invitations` is called
  - **Then** that invitation's `invitedBy` is `null`
- **AC-DATA-003-4**
  - **Given** a user who logs out or refreshes
  - **When** the used refresh token is removed
  - **Then** its row is physically deleted

### REQ-DATA-004 — Schema changes only through migrations

Legacy ID: DATA-04.

Schema changes are made exclusively through Prisma migrations (`prisma migrate dev`), never by editing the database by hand.

**Acceptance criteria**

- **AC-DATA-004-1**
  - **Given** an empty database
  - **When** `prisma migrate deploy` applies `apps/api/prisma/migrations`
  - **Then** the resulting schema matches `schema.prisma` (no drift reported by `prisma migrate diff`)

### REQ-DATA-005 — snake_case columns

Legacy ID: DATA-05.

Column names are snake_case; the repository layer maps them to camelCase (REQ-ARCH-006).

**Acceptance criteria**

- **AC-DATA-005-1**
  - **Given** `schema.prisma`
  - **When** column names are read
  - **Then** every multi-word column is snake_case (e.g. `created_at`, `is_active`)

### REQ-DATA-006 — Slug unique among non-deleted surveys

Legacy ID: DATA-06.

`slug` is unique only among **non-deleted** surveys: partial unique index `is_unique` on `(slug) WHERE deleted_at IS NULL` (Prisma preview feature `partialIndexes`, migration `20260930120000_soft_delete_partial_uniques`). Deleting a survey frees its name and slug; the deleted row is kept. Every query that resolves a survey by slug filters `deleted_at IS NULL`.

**Acceptance criteria**

- **AC-DATA-006-1**
  - **Given** two non-deleted surveys
  - **When** an insert or update would give them the same slug
  - **Then** the database rejects it
- **AC-DATA-006-2**
  - **Given** a soft-deleted survey with slug `s`
  - **When** a new survey whose name yields slug `s` is created
  - **Then** it is created, and the deleted row is still present

### REQ-DATA-007 — One answer per IP per survey among non-deleted answers

Legacy ID: DATA-07.

`origin_ip` must be unique **per survey among non-deleted answers**: partial composite unique `(survey_id, origin_ip) WHERE deleted_at IS NULL` (index `answers_survey_id_origin_ip_key`, migrations `20260923190000_answers_ip_unique_per_survey` and `20260930120000_soft_delete_partial_uniques`). A soft-deleted answer does not block its IP (REQ-ANS-004).

**Acceptance criteria**

- **AC-DATA-007-1**
  - **Given** a non-deleted answer for survey S from IP X
  - **When** another answer for S from X is inserted
  - **Then** the database rejects it
- **AC-DATA-007-2**
  - **Given** a soft-deleted answer for survey S from IP X
  - **When** a new answer for S from X is inserted
  - **Then** it is stored

### REQ-DATA-008 — No database enum for question types

Legacy ID: DATA-08.

There is no DB enum for question types: they live inside the `questions` JSONB and are validated by the shared schemas (canonical values `TEXT_ANSWER`, `SINGLE_SELECT`, `MULTI_SELECT`). The unused and inconsistent enum `answer_type` was dropped in migration `20260930120000_soft_delete_partial_uniques`.

**Acceptance criteria**

- **AC-DATA-008-1**
  - **Given** the migrated database
  - **When** its types are listed
  - **Then** there is no `answer_type` enum, and a question type outside the three canonical values is rejected with `422`

### REQ-DATA-009 — Strict JSON documents with integer ids

Legacy ID: DATA-09.

Question, option and response objects are strict (unknown keys rejected). The questions array must be non-empty. Question ids and option ids must be integers ≥ 1: a non-integer or smaller id is rejected with `422 Validation Error`.

**Acceptance criteria**

- **AC-DATA-009-1**
  - **Given** a create-survey body with a question or option holding an unknown key
  - **When** it is submitted
  - **Then** the response is `422`
- **AC-DATA-009-2**
  - **Given** a create-survey body with an empty `questions` array
  - **When** it is submitted
  - **Then** the response is `422`
- **AC-DATA-009-3**
  - **Given** a create-survey or update-survey body with a question id `1.5` (or an option id `1.5`)
  - **When** it is submitted
  - **Then** the response is `422 Validation Error` and nothing is stored
- **AC-DATA-009-4**
  - **Given** a question id or option id `0`
  - **When** it is submitted
  - **Then** the response is `422`

### REQ-DATA-010 — Client-assigned ids

Legacy ID: DATA-10.

Question and option ids are assigned by the client. The web app numbers them sequentially from 1 ([FRONTEND.md](FRONTEND.md), REQ-FE-019). Uniqueness of ids within a survey is not validated by the API.

**Acceptance criteria**

- **AC-DATA-010-1**
  - **Given** a create-survey body with two questions sharing id `1`
  - **When** it is submitted
  - **Then** the API accepts it (no uniqueness check)

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-DATA-1 | Existing implementation (migrated) | Done | REQ-DATA-001, REQ-DATA-002, REQ-DATA-004, REQ-DATA-005, REQ-DATA-006, REQ-DATA-007, REQ-DATA-008, REQ-DATA-010 |
| PH-DATA-2 | Question ids must be integers | Planned | REQ-DATA-009 |

REQ-DATA-003 (soft-deleted users in the refresh and invitation read paths) is covered by PH-AUTH-2 in [AUTH.md](AUTH.md).
