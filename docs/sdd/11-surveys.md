# 11 — Surveys

[← Back to index](MAIN.md) · Related: [03 Data model](03-data-model.md), [04 API conventions](04-api-conventions.md), [12 Answers](12-answers.md), [13 Statistics](13-stats.md), [20 Frontend](20-frontend.md)

Code: `apps/api/src/routes/surveyRouter.ts`, `controllers/surveyController.ts`,
`services/surveyService.ts`, `repositories/surveyRepository.ts`.
Schemas: `packages/schemas/src/surveySchema.ts`, `queryStringsSchema.ts`.

## 1. Survey resource

```jsonc
{
  "id": "0192…",              // UUID v7
  "name": "Employee Satisfaction Survey",
  "slug": "employee-satisfaction-survey",
  "questions": [ /* Question, see 03-data-model.md §3 */ ],
  "isActive": false,
  "isLocked": false,
  "activatedAt": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": null,
  "deletedAt": null
}
```

## 2. Lifecycle

```
            create                activate (isActive=true)
  (none) ─────────► DRAFT ───────────────────────────────► ACTIVE (locked)
                    editable                                  │   ▲
                                          deactivate          │   │ activate
                                       (isActive=false)       ▼   │
                                                          INACTIVE (locked)
  any state ── delete ──► DELETED (soft)
```

- **SURV-01** `[implemented]` New surveys are inactive (`isActive = false`).
- **SURV-02** `[implemented]` The first activation sets `isLocked = true`. `isLocked` never returns to `false`.
- **SURV-03** `[implemented]` A locked survey cannot be edited: its `name` and `questions` are immutable. Only `isActive` may change.
- **SURV-04** `[implemented]` Only active surveys should be answerable; enforcement is in [12-answers.md](12-answers.md) (ANS-05).

## 3. Endpoints

### GET `/api/v1/surveys` — authenticated

Query string (`queryStringSchema`; all optional, all received as strings):

| Param | Format | Effect |
|-------|--------|--------|
| `search` | string | `name` contains value, case-insensitive |
| `active` | `true` \| `false` | filter by `is_active` |
| `date` | `DD/MM/YYYY` | surveys created on that day (server local time, `[date, date+1)`) |
| `page` | positive number | page number, default 1 |
| `limit` | positive number | page size, default 10 |
| `sort` | `name` \| `-name` \| `creation` \| `-creation` | `name` asc/desc (tie-break `created_at` desc); `creation` = `created_at` asc/desc (tie-break `name` asc). Default `-creation` (SURV-20) |

- **SURV-05** `[implemented]` Deleted surveys are excluded. Invalid query params → `422`.
- **SURV-06** `[implemented]` Offset is `(page - 1) * limit`.
- **SURV-07** `[implemented]` Response `200 { data: Survey[], meta: { results, total, page, limit } }` where `results` is the number of items in this page and `total` the number of non-deleted surveys matching the same filters across all pages (one `COUNT` in the same transaction as the page query).
- **SURV-20** `[implemented]` Without `sort`, the list is ordered by `created_at` descending, tie-break `name` ascending (same as `-creation`), so pages are stable. Decided 2026-10-09 (OQ-14).

### POST `/api/v1/surveys` — authenticated

Body (`createSurveySchema`, strict): `name` (string, min 5), `questions` (non-empty array of Question).

- **SURV-08** `[implemented]` `slug = slugify(name, { lower: true, strict: true })`. If a non-deleted survey has that slug → `409 Conflict` ("This survey name is not avaliable"). Deleted surveys do not reserve their name or slug (DATA-06). If the DB unique index rejects the insert (concurrent creation), the response is the same `409`.
- **SURV-09** `[implemented]` Select questions (`SINGLE_SELECT`, `MULTI_SELECT`) must have non-empty `options`; `TEXT_ANSWER` must not have `options` → `422`.
- **SURV-10** `[implemented]` Response `201 { data: Survey }`.

### GET `/api/v1/surveys/:slug` — public, optional session

- **SURV-11** `[implemented]` Unknown or deleted slug → `404 Not found`.
- **SURV-12** `[implemented]` Uses `optionalAuth` (AUTH-22). With a valid session, any non-deleted survey is returned. Without one, only **active** surveys are returned and an inactive survey returns `404`, the same response as not found. Exception: if the access token is **expired** and the survey is inactive → `401 Token Error` ("This token expired, please log in again"), so the web client silently refreshes the session and retries (FE-09). Respondents send no cookie and are unaffected.
- **SURV-13** `[implemented]` Response `200 { data: Survey }`.

### PATCH `/api/v1/surveys/:slug` — authenticated

Body (`updateSurveySchema`, non-strict): `name?`, `questions?`, `isActive?` (boolean).

- **SURV-14** `[implemented]` Rules, in order:
  1. Unknown or deleted slug → `404`.
  2. If the survey is locked and the body contains `name` or `questions` → `400 Survey already activated` ("This survey was already activated, it can't be modified anymore").
  3. Body validated with `updateSurveySchema` → `422` on failure.
  4. If `name` changes the slug and the new slug is taken by a non-deleted survey → `409 Conflict` (API-17), also when the DB unique index rejects the update (concurrent rename).
  5. `isActive: true` → `is_active = true`, `activated_at = now`, `is_locked = true`.
     `isActive: false` → `is_active = false`, `activated_at = null`.
     `isActive` absent → `is_active`, `activated_at`, `is_locked` unchanged.
  6. `updated_at = now`; slug recalculated from `name` if provided.

- **SURV-15** `[implemented]` Renaming changes the slug, which changes the public URL (`/surveys/:slug`); previously shared links stop working.
- **SURV-16** `[implemented]` Response `200 { data: Survey }`.

### DELETE `/api/v1/surveys/:slug` — authenticated

- **SURV-17** `[implemented]` Unknown or deleted slug → `404`. Otherwise, in a single update: `is_active = false`, `deleted_at = now`; `activated_at` and `is_locked` are kept for auditing. Response `204`.
- **SURV-18** `[implemented]` Answers of a deleted survey are kept (not soft-deleted) but are unreachable through the API: every answer route first resolves a **non-deleted** survey by slug and returns `404` otherwise (ANS-08).
- **SURV-19** `[implemented]` Any survey may be deleted, including active and locked ones; an active survey is deactivated as part of the deletion (SURV-17). There is no restore: if one is ever added, it must reject with `409 Conflict` when a non-deleted survey holds the same slug.

### GET `/api/v1/surveys/:slug/stats`

See [13-stats.md](13-stats.md).
