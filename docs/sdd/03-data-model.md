# 03 — Data Model

[← Back to index](MAIN.md)

Source of truth for the physical schema: `apps/api/prisma/schema.prisma` plus
migrations in `apps/api/prisma/migrations`. This spec describes the **target**
model; differences with the current schema are tagged.

## 1. General rules

- **DATA-01** `[implemented]` Primary keys are UUID v7 generated in the application (`uuid.v7()`), not by the database.
- **DATA-02** `[implemented]` Timestamps are `TIMESTAMPTZ(6)`. `created_at` defaults to `now()`.
- **DATA-03** `[implemented]` Soft delete: `surveys`, `answers` and `users` have a nullable `deleted_at`. Rows with `deleted_at IS NOT NULL` are treated as non-existent by every read path. `refresh_tokens` are hard-deleted.
- **DATA-04** `[implemented]` Schema changes are made exclusively through Prisma migrations (`prisma migrate dev`), never by editing the database by hand.
- **DATA-05** `[implemented]` Column names are snake_case; the repository layer maps them to camelCase (ARCH-06).

## 2. Tables

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `username` | VARCHAR(50) | Unique among non-deleted users (enforced in service, not DB) |
| `email` | TEXT | Unique among non-deleted users (enforced in service, not DB) |
| `password` | TEXT | bcrypt hash (cost 10). Never returned by the API |
| `created_at` | TIMESTAMPTZ | default now |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

### `refresh_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `user_id` | UUID UNIQUE FK → users.id | `ON DELETE CASCADE`. Unique ⇒ at most one active refresh token (session) per user |
| `token_hash` | TEXT UNIQUE | SHA-256 hex of the raw token; the raw token is only sent in the cookie |
| `created_at` | TIMESTAMPTZ | default now |
| `expires_at` | TIMESTAMPTZ | now + `REFRESH_TOKEN_TTL_DAYS` days |

### `invitations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `email` | TEXT | invited email; the account is created with it |
| `token_hash` | TEXT UNIQUE | SHA-256 hex of the raw token (AUTH-23) |
| `invited_by` | UUID? FK → users.id | `ON DELETE SET NULL` |
| `created_at` | TIMESTAMPTZ | default now |
| `expires_at` | TIMESTAMPTZ | created_at + 48 h |
| `accepted_at` | TIMESTAMPTZ? | set when the account is created |
| `revoked_at` | TIMESTAMPTZ? | set when revoked or replaced |

### `surveys`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `name` | TEXT | min 5 chars |
| `slug` | TEXT | derived from name; unique among non-deleted surveys (partial unique index `is_unique`, DATA-06) |
| `questions` | JSONB | array of Question documents (§3) |
| `is_active` | BOOLEAN | default false |
| `is_locked` | BOOLEAN | NOT NULL, default false; set on first activation, never reset (SURV-02). Migration `20260923220000_survey_is_locked` |
| `activated_at` | TIMESTAMPTZ? | time of the **latest** activation; null while inactive, except on deleted surveys, which keep it for auditing (SURV-14, SURV-19) |
| `created_at` | TIMESTAMPTZ | default now |
| `updated_at` | TIMESTAMPTZ? | set on every update |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

- **DATA-06** `[implemented]` `slug` is unique only among **non-deleted** surveys: partial unique index `is_unique` on `(slug) WHERE deleted_at IS NULL` (Prisma preview feature `partialIndexes`, migration `20260930120000_soft_delete_partial_uniques`). Deleting a survey frees its name and slug; the deleted row is kept. Every query that resolves a survey by slug filters `deleted_at IS NULL`.

### `answers`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | v7 |
| `survey_id` | UUID? FK → surveys.id | `ON DELETE SET NULL` |
| `responses` | JSONB | array of Response documents (§3) |
| `origin_ip` | INET | respondent IP |
| `created_at` | TIMESTAMPTZ | default now |
| `deleted_at` | TIMESTAMPTZ? | soft delete |

- **DATA-07** `[implemented]` `origin_ip` must be unique **per survey among non-deleted answers**: partial composite unique `(survey_id, origin_ip) WHERE deleted_at IS NULL` (index `answers_survey_id_origin_ip_key`, migrations `20260923190000_answers_ip_unique_per_survey` and `20260930120000_soft_delete_partial_uniques`). A soft-deleted answer does not block its IP (ANS-04).

### Question types

- **DATA-08** `[implemented]` There is no DB enum for question types: they live inside the `questions` JSONB and are validated by the shared schemas (§3, canonical values `TEXT_ANSWER`, `SINGLE_SELECT`, `MULTI_SELECT`). The unused and inconsistent enum `answer_type` was dropped in migration `20260930120000_soft_delete_partial_uniques`.

## 3. JSON documents

Validated by `packages/schemas/src/surveySchema.ts` and `answerSchema.ts`.

### Question (element of `surveys.questions`)

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

- **DATA-09** `[implemented]` Objects are strict (unknown keys rejected). The questions array must be non-empty.
- **DATA-10** `[implemented]` Question and option ids are assigned by the client. The web app numbers them sequentially from 1 (see [20-frontend.md](20-frontend.md)). Uniqueness of ids within a survey is not validated by the API.

### Response (element of `answers.responses`)

```jsonc
{ "id": 1, "content": "Some text" }   // TEXT_ANSWER: string (min 2 chars)
{ "id": 2, "content": [1] }           // SINGLE_SELECT: array with one option id
{ "id": 3, "content": [1, 3] }        // MULTI_SELECT: non-empty array of option ids
```

`id` is the id of the answered question. Semantic rules are in [12-answers.md](12-answers.md).

## 4. Entity relationships

```
users 1 ── 0..1 refresh_tokens
surveys 1 ── 0..* answers
```

Surveys are not owned by users: every authenticated user can manage every survey.
