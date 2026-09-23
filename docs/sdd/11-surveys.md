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
  "isLocked": false,          // [pending: BL-04]
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
- **SURV-02** `[pending: BL-04]` The first activation sets `isLocked = true`. `isLocked` never returns to `false`.
- **SURV-03** `[pending: BL-04]` A locked survey cannot be edited: its `name` and `questions` are immutable. Only `isActive` may change.
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
| `sort` | `name` \| `-name` \| `creation` \| `-creation` | `name` asc/desc (tie-break `created_at` desc); `creation` = `created_at` asc/desc (tie-break `name` asc). No default order |

- **SURV-05** `[implemented]` Deleted surveys are excluded. Invalid query params → `422`.
- **SURV-06** `[pending: BL-11]` Offset is `(page - 1) * limit`. (Currently `(page - 1) * 10` regardless of `limit`.)
- **SURV-07** `[implemented]` Response `200 { data: Survey[], meta: { results, page, limit } }` where `results` is the number of items in this page (not the total).

### POST `/api/v1/surveys` — authenticated

Body (`createSurveySchema`, strict): `name` (string, min 5), `questions` (non-empty array of Question).

- **SURV-08** `[implemented]` `slug = slugify(name, { lower: true, strict: true })`. If a non-deleted survey has that slug → `409 Conflict` ("This survey name is not avaliable"). See also OQ-05 (deleted surveys) and OQ-04 (status code).
- **SURV-09** `[implemented]` Select questions (`SINGLE_SELECT`, `MULTI_SELECT`) must have non-empty `options`; `TEXT_ANSWER` must not have `options` → `422`.
- **SURV-10** `[implemented]` Response `201 { data: Survey }`.

### GET `/api/v1/surveys/:slug` — public, optional session

- **SURV-11** `[implemented]` Unknown or deleted slug → `404 Not found`.
- **SURV-12** `[pending: BL-08]` Without a valid session, only **active** surveys are returned; an inactive survey returns `404` (same response as not found). With a valid session, any non-deleted survey is returned. This requires an optional-authentication middleware that never fails the request. (Currently inactive surveys are returned to anyone.)
- **SURV-13** `[implemented]` Response `200 { data: Survey }`.

### PATCH `/api/v1/surveys/:slug` — authenticated

Body (`updateSurveySchema`, non-strict): `name?`, `questions?`, `isActive?` (boolean).

- **SURV-14** `[pending: BL-04]` Rules, in order:
  1. Unknown or deleted slug → `404`.
  2. If the survey is locked and the body contains `name` or `questions` → `400 Survey already activated` ("This survey was already activated, it can't be modified anymore").
  3. Body validated with `updateSurveySchema` → `422` on failure.
  4. If `name` changes the slug and the new slug is taken by a non-deleted survey → `400 Conflict` (OQ-04).
  5. `isActive: true` → `is_active = true`, `activated_at = now`, `is_locked = true`.
     `isActive: false` → `is_active = false`, `activated_at = null`.
     `isActive` absent → `is_active`, `activated_at`, `is_locked` unchanged.
  6. `updated_at = now`; slug recalculated from `name` if provided.

  Current code deviates: the lock check is based on `activated_at` and on the *first* key of the body (a body like `{ "name": "…" }` passes on an activated survey), and `activated_at` is set to `null` whenever `isActive` is absent.
- **SURV-15** `[implemented]` Renaming changes the slug, which changes the public URL (`/surveys/:slug`); previously shared links stop working.
- **SURV-16** `[implemented]` Response `200 { data: Survey }`.

### DELETE `/api/v1/surveys/:slug` — authenticated

- **SURV-17** `[implemented]` Unknown or deleted slug → `404`. Otherwise soft delete (`deleted_at = now`), `204`.
- **SURV-18** `[pending: BL-13]` Answers of a deleted survey are kept (not soft-deleted) but are unreachable through the API: every answer route first resolves a **non-deleted** survey by slug and returns `404` otherwise (ANS-08). (Currently `GET …/answers` filters by slug without checking the survey's `deleted_at`, and `GET/DELETE …/answers/:id` ignore the slug.)
- **SURV-19** `[open: OQ-08]` Whether locked/active surveys may be deleted is undecided (currently allowed).

### GET `/api/v1/surveys/:slug/stats`

See [13-stats.md](13-stats.md).
