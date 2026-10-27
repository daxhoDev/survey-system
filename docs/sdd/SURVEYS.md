← Back to [MAIN](MAIN.md)

# Surveys

- **Module:** Surveys
- **Module code:** SURV
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Survey CRUD, questions, activation and locking, and the survey list.

Requirement numbers keep the legacy IDs: legacy `SURV-07` is `REQ-SURV-007`.

Related: [DATA_MODEL.md](DATA_MODEL.md), [API.md](API.md), [ANSWERS.md](ANSWERS.md), [STATS.md](STATS.md), [FRONTEND.md](FRONTEND.md).

### Code

`apps/api/src/routes/surveyRouter.ts`, `controllers/surveyController.ts`, `services/surveyService.ts`, `repositories/surveyRepository.ts`. Schemas: `packages/schemas/src/surveySchema.ts`, `queryStringsSchema.ts`.

### Survey resource

```jsonc
{
  "id": "0192…",              // UUID v7
  "name": "Employee Satisfaction Survey",
  "slug": "employee-satisfaction-survey",
  "questions": [ /* Question, see DATA_MODEL.md, JSON documents */ ],
  "isActive": false,
  "isLocked": false,
  "activatedAt": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": null,
  "deletedAt": null
}
```

### Lifecycle

```text
            create                activate (isActive=true)
  (none) ─────────► DRAFT ───────────────────────────────► ACTIVE (locked)
                    editable                                  │   ▲
                                          deactivate          │   │ activate
                                       (isActive=false)       ▼   │
                                                          INACTIVE (locked)
  any state ── delete ──► DELETED (soft)
```

### Endpoints

| Method | Path | Access | Requirements |
|--------|------|--------|--------------|
| GET | `/api/v1/surveys` | authenticated | REQ-SURV-005, REQ-SURV-006, REQ-SURV-007, REQ-SURV-020 |
| POST | `/api/v1/surveys` | authenticated | REQ-SURV-008, REQ-SURV-009, REQ-SURV-010 |
| GET | `/api/v1/surveys/:slug` | public, optional session | REQ-SURV-011, REQ-SURV-012, REQ-SURV-013 |
| PATCH | `/api/v1/surveys/:slug` | authenticated | REQ-SURV-014, REQ-SURV-015, REQ-SURV-016 |
| DELETE | `/api/v1/surveys/:slug` | authenticated | REQ-SURV-017, REQ-SURV-018, REQ-SURV-019 |
| GET | `/api/v1/surveys/:slug/stats` | authenticated | see [STATS.md](STATS.md) |

### List query string

`GET /api/v1/surveys` query string (`queryStringSchema`; all optional, all received as strings):

| Param | Format | Effect |
|-------|--------|--------|
| `search` | string | `name` contains value, case-insensitive |
| `active` | `true` \| `false` | filter by `is_active` |
| `date` | `DD/MM/YYYY` | surveys created on that day (server local time, `[date, date+1)`) |
| `page` | positive integer | page number, default 1 |
| `limit` | positive integer | page size, default 10 |
| `sort` | `name` \| `-name` \| `creation` \| `-creation` | `name` asc/desc (tie-break `created_at` desc); `creation` = `created_at` asc/desc (tie-break `name` asc). Default `-creation` (REQ-SURV-020) |

### Bodies

- Create (`createSurveySchema`, strict): `name` (string, min 5), `questions` (non-empty array of Question).
- Update (`updateSurveySchema`, non-strict): `name?`, `questions?`, `isActive?` (boolean).

## Requirements

### REQ-SURV-001 — New surveys are inactive

Legacy ID: SURV-01.

New surveys are inactive (`isActive = false`).

**Acceptance criteria**

- **AC-SURV-001-1**
  - **Given** a valid create body
  - **When** `POST /api/v1/surveys` succeeds
  - **Then** the survey has `isActive: false`, `isLocked: false` and `activatedAt: null`

### REQ-SURV-002 — First activation locks the survey

Legacy ID: SURV-02.

The first activation sets `isLocked = true`. `isLocked` never returns to `false`.

**Acceptance criteria**

- **AC-SURV-002-1**
  - **Given** an unlocked survey
  - **When** it is updated with `isActive: true`
  - **Then** `isLocked` is `true`
- **AC-SURV-002-2**
  - **Given** a locked survey
  - **When** it is deactivated, reactivated or deleted
  - **Then** `isLocked` stays `true`

### REQ-SURV-003 — Locked surveys cannot be edited

Legacy ID: SURV-03.

A locked survey cannot be edited: its `name` and `questions` are immutable. Only `isActive` may change.

**Acceptance criteria**

- **AC-SURV-003-1**
  - **Given** a locked survey
  - **When** it is updated with `isActive` only
  - **Then** the update succeeds (see REQ-SURV-014 for the rejection of `name`/`questions`)

### REQ-SURV-004 — Only active surveys are answerable

Legacy ID: SURV-04.

Only active surveys should be answerable; enforcement is in [ANSWERS.md](ANSWERS.md) (REQ-ANS-005).

**Acceptance criteria**

- **AC-SURV-004-1**
  - **Given** an inactive survey
  - **When** an answer is submitted to it
  - **Then** it is rejected as specified in REQ-ANS-005

### REQ-SURV-005 — List excludes deleted surveys and validates the query

Legacy ID: SURV-05.

`GET /api/v1/surveys` excludes deleted surveys. Invalid query params → `422`. `page` and `limit` accept only positive integers: any other value (e.g. `0`, `-1`, `1.5`, `abc`) → `422`.

**Acceptance criteria**

- **AC-SURV-005-1**
  - **Given** a soft-deleted survey
  - **When** `GET /api/v1/surveys` is called with any filters
  - **Then** it is not in `data` and not counted in `meta.total`
- **AC-SURV-005-2**
  - **Given** `active=yes`, `date=2026-01-01` or `sort=date`
  - **When** `GET /api/v1/surveys` is called
  - **Then** the response is `422`
- **AC-SURV-005-3**
  - **Given** `page` or `limit` equal to `0`, `-1`, `1.5` or `abc`
  - **When** `GET /api/v1/surveys` is called
  - **Then** the response is `422 Validation Error`
- **AC-SURV-005-4**
  - **Given** `page=2&limit=5`
  - **When** `GET /api/v1/surveys` is called
  - **Then** the response is `200` with `meta.page = 2` and `meta.limit = 5`

### REQ-SURV-006 — Offset pagination

Legacy ID: SURV-06.

Offset is `(page - 1) * limit`.

**Acceptance criteria**

- **AC-SURV-006-1**
  - **Given** 12 matching surveys in the default order
  - **When** `GET /api/v1/surveys?page=2&limit=5` is called
  - **Then** `data` holds the 6th to 10th surveys of that order

### REQ-SURV-007 — List response

Legacy ID: SURV-07.

Response `200 { data: Survey[], meta: { results, total, page, limit } }` where `results` is the number of items in this page and `total` the number of non-deleted surveys matching the same filters across all pages (one `COUNT` in the same transaction as the page query).

**Acceptance criteria**

- **AC-SURV-007-1**
  - **Given** 12 non-deleted surveys matching the filters
  - **When** `GET /api/v1/surveys?page=3&limit=5` is called
  - **Then** the response is `200` with 2 items and `meta = { results: 2, total: 12, page: 3, limit: 5 }`
- **AC-SURV-007-2**
  - **Given** no `page` or `limit`
  - **When** the list is requested
  - **Then** `meta.page` is `1` and `meta.limit` is `10`

### REQ-SURV-008 — Slug from name, unique among non-deleted surveys

Legacy ID: SURV-08.

`slug = slugify(name, { lower: true, strict: true })`. If a non-deleted survey has that slug → `409 Conflict` ("This survey name is not avaliable"). Deleted surveys do not reserve their name or slug (REQ-DATA-006). If the DB unique index rejects the insert (concurrent creation), the response is the same `409`.

**Acceptance criteria**

- **AC-SURV-008-1**
  - **Given** the name "Employee Satisfaction Survey"
  - **When** the survey is created
  - **Then** its slug is `employee-satisfaction-survey`
- **AC-SURV-008-2**
  - **Given** a non-deleted survey with slug `s`
  - **When** a survey whose name yields `s` is created
  - **Then** the response is `409 Conflict` with detail "This survey name is not avaliable"
- **AC-SURV-008-3**
  - **Given** only a soft-deleted survey with slug `s`
  - **When** a survey whose name yields `s` is created
  - **Then** it is created (`201`)
- **AC-SURV-008-4**
  - **Given** the repository reports a unique violation on insert
  - **When** the survey is created
  - **Then** the response is the same `409 Conflict`

### REQ-SURV-009 — Options by question type

Legacy ID: SURV-09.

Select questions (`SINGLE_SELECT`, `MULTI_SELECT`) must have non-empty `options`; `TEXT_ANSWER` must not have `options` → `422`.

**Acceptance criteria**

- **AC-SURV-009-1**
  - **Given** a `SINGLE_SELECT` or `MULTI_SELECT` question without `options` or with an empty `options` array
  - **When** the survey is created
  - **Then** the response is `422`
- **AC-SURV-009-2**
  - **Given** a `TEXT_ANSWER` question with `options`
  - **When** the survey is created
  - **Then** the response is `422`

### REQ-SURV-010 — Create response

Legacy ID: SURV-10.

Response `201 { data: Survey }`.

**Acceptance criteria**

- **AC-SURV-010-1**
  - **Given** a valid create body
  - **When** `POST /api/v1/surveys` is called
  - **Then** the response is `201 { data: Survey }` with the survey resource fields
- **AC-SURV-010-2**
  - **Given** a create body with a name shorter than 5 characters or an unknown key
  - **When** it is submitted
  - **Then** the response is `422`

### REQ-SURV-011 — Unknown or deleted slug

Legacy ID: SURV-11.

`GET /api/v1/surveys/:slug`: unknown or deleted slug → `404 Not found`.

**Acceptance criteria**

- **AC-SURV-011-1**
  - **Given** a slug with no survey, or of a soft-deleted survey
  - **When** `GET /api/v1/surveys/:slug` is called with a valid session
  - **Then** the response is `404 Not found`

### REQ-SURV-012 — Public read with optional session

Legacy ID: SURV-12.

`GET /api/v1/surveys/:slug` uses `optionalAuth` (REQ-AUTH-022). With a valid session, any non-deleted survey is returned. Without one, only **active** surveys are returned and an inactive survey returns `404`, the same response as not found. Exception: if the access token is **expired** and the survey is inactive → `401 Token Error` ("This token expired, please log in again"), so the web client silently refreshes the session and retries (REQ-FE-009). Respondents send no cookie and are unaffected.

**Acceptance criteria**

- **AC-SURV-012-1**
  - **Given** an inactive survey and a valid session
  - **When** it is requested
  - **Then** the response is `200 { data: Survey }`
- **AC-SURV-012-2**
  - **Given** an inactive survey and no `jwt` cookie (or a malformed one)
  - **When** it is requested
  - **Then** the response is identical to the `404` of an unknown slug
- **AC-SURV-012-3**
  - **Given** an active survey and no `jwt` cookie
  - **When** it is requested
  - **Then** the response is `200 { data: Survey }`
- **AC-SURV-012-4**
  - **Given** an inactive survey and an expired `jwt` cookie
  - **When** it is requested
  - **Then** the response is `401 Token Error` with detail "This token expired, please log in again"
- **AC-SURV-012-5**
  - **Given** an active survey and an expired `jwt` cookie
  - **When** it is requested
  - **Then** the response is `200 { data: Survey }`

### REQ-SURV-013 — Read response

Legacy ID: SURV-13.

Response `200 { data: Survey }`.

**Acceptance criteria**

- **AC-SURV-013-1**
  - **Given** a survey the caller may read (REQ-SURV-012)
  - **When** `GET /api/v1/surveys/:slug` is called
  - **Then** the response is `200 { data: Survey }`

### REQ-SURV-014 — Update rules

Legacy ID: SURV-14.

`PATCH /api/v1/surveys/:slug` applies these rules, in order:

1. Unknown or deleted slug → `404`.
2. If the survey is locked and the body contains `name` or `questions` → `400 Survey already activated` ("This survey was already activated, it can't be modified anymore").
3. Body validated with `updateSurveySchema` → `422` on failure.
4. If `name` changes the slug and the new slug is taken by a non-deleted survey → `409 Conflict` (REQ-API-017), also when the DB unique index rejects the update (concurrent rename).
5. `isActive: true` → `is_active = true`, `activated_at = now`, `is_locked = true`. `isActive: false` → `is_active = false`, `activated_at = null`. `isActive` absent → `is_active`, `activated_at`, `is_locked` unchanged.
6. `updated_at = now`; slug recalculated from `name` if provided.

**Acceptance criteria**

- **AC-SURV-014-1**
  - **Given** an unknown or soft-deleted slug
  - **When** it is patched
  - **Then** the response is `404`
- **AC-SURV-014-2**
  - **Given** a locked survey
  - **When** it is patched with `name` or `questions` (valid or not)
  - **Then** the response is `400` with title `Survey already activated` and detail "This survey was already activated, it can't be modified anymore", and nothing changes
- **AC-SURV-014-3**
  - **Given** an unlocked survey
  - **When** it is patched with an invalid body (e.g. a name shorter than 5 characters or `isActive: "yes"`)
  - **Then** the response is `422`
- **AC-SURV-014-4**
  - **Given** an unlocked survey and a new name whose slug belongs to another non-deleted survey
  - **When** it is patched
  - **Then** the response is `409 Conflict`
- **AC-SURV-014-5**
  - **Given** a survey
  - **When** it is patched with `isActive: true`
  - **Then** `isActive` is `true`, `activatedAt` is the update time and `isLocked` is `true`
- **AC-SURV-014-6**
  - **Given** an active survey
  - **When** it is patched with `isActive: false`
  - **Then** `isActive` is `false` and `activatedAt` is `null`
- **AC-SURV-014-7**
  - **Given** an unlocked survey
  - **When** it is patched with a new `name` only
  - **Then** `isActive`, `activatedAt` and `isLocked` are unchanged, the slug is recalculated from the new name, and `updatedAt` is set
- **AC-SURV-014-8**
  - **Given** an update body with an unknown key
  - **When** it is submitted
  - **Then** the key is stripped and the update succeeds (REQ-API-019)

### REQ-SURV-015 — Renaming changes the public URL

Legacy ID: SURV-15.

Renaming changes the slug, which changes the public URL (`/surveys/:slug`); previously shared links stop working.

**Acceptance criteria**

- **AC-SURV-015-1**
  - **Given** an unlocked survey renamed from slug `a` to slug `b`
  - **When** `GET /api/v1/surveys/a` and `GET /api/v1/surveys/b` are called with a session
  - **Then** `a` returns `404` and `b` returns the survey

### REQ-SURV-016 — Update response

Legacy ID: SURV-16.

Response `200 { data: Survey }`.

**Acceptance criteria**

- **AC-SURV-016-1**
  - **Given** a valid update
  - **When** `PATCH /api/v1/surveys/:slug` succeeds
  - **Then** the response is `200 { data: Survey }` with the updated survey

### REQ-SURV-017 — Soft delete

Legacy ID: SURV-17.

`DELETE /api/v1/surveys/:slug`: unknown or deleted slug → `404`. Otherwise, in a single update: `is_active = false`, `deleted_at = now`; `activated_at` and `is_locked` are kept for auditing. Response `204`.

**Acceptance criteria**

- **AC-SURV-017-1**
  - **Given** an unknown or already deleted slug
  - **When** it is deleted
  - **Then** the response is `404`
- **AC-SURV-017-2**
  - **Given** an active, locked survey
  - **When** it is deleted
  - **Then** the response is `204`, and its row has `is_active = false`, `deleted_at` set, and unchanged `activated_at` and `is_locked`

### REQ-SURV-018 — Answers of deleted surveys are unreachable

Legacy ID: SURV-18.

Answers of a deleted survey are kept (not soft-deleted) but are unreachable through the API: every answer route first resolves a **non-deleted** survey by slug and returns `404` otherwise (REQ-ANS-008).

**Acceptance criteria**

- **AC-SURV-018-1**
  - **Given** a survey with answers that is then deleted
  - **When** its answer rows are read and `GET /api/v1/surveys/:slug/answers` is called
  - **Then** the rows still exist with `deleted_at` null, and the route returns `404`

### REQ-SURV-019 — Any survey may be deleted; no restore

Legacy ID: SURV-19.

Any survey may be deleted, including active and locked ones; an active survey is deactivated as part of the deletion (REQ-SURV-017). There is no restore: if one is ever added, it must reject with `409 Conflict` when a non-deleted survey holds the same slug.

**Acceptance criteria**

- **AC-SURV-019-1**
  - **Given** a draft, an active and an inactive locked survey
  - **When** each is deleted
  - **Then** every deletion returns `204`
- **AC-SURV-019-2**
  - **Given** the API
  - **When** its routes are listed
  - **Then** there is no route to restore a deleted survey

### REQ-SURV-020 — Default list order

Legacy ID: SURV-20.

Without `sort`, the list is ordered by `created_at` descending, tie-break `name` ascending (same as `-creation`), so pages are stable. Decided 2026-10-09 (legacy OQ-14).

**Acceptance criteria**

- **AC-SURV-020-1**
  - **Given** surveys created at different times, two of them at the same time
  - **When** `GET /api/v1/surveys` is called without `sort`
  - **Then** they come newest first, and the two with the same `created_at` come in ascending name order
- **AC-SURV-020-2**
  - **Given** `sort=name`, `-name`, `creation` or `-creation`
  - **When** the list is requested
  - **Then** it is ordered as in the list query string table, with its tie-break

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-SURV-1 | Existing implementation (migrated) | Done | REQ-SURV-001, REQ-SURV-002, REQ-SURV-003, REQ-SURV-004, REQ-SURV-006, REQ-SURV-007, REQ-SURV-008, REQ-SURV-009, REQ-SURV-010, REQ-SURV-011, REQ-SURV-012, REQ-SURV-013, REQ-SURV-014, REQ-SURV-015, REQ-SURV-016, REQ-SURV-017, REQ-SURV-018, REQ-SURV-019, REQ-SURV-020 |
| PH-SURV-2 | Integer page and limit | Planned | REQ-SURV-005 |
