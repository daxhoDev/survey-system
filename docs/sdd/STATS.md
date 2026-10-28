← Back to [MAIN](MAIN.md)

# Statistics

- **Module:** Statistics
- **Module code:** STAT
- **Version:** v1.1
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

The per-survey statistics endpoint and its computation, the survey counters summary, and the statistics of the most recently activated active surveys.

Requirement numbers keep the legacy IDs: legacy `STAT-04` is `REQ-STAT-004`.

Related: [SURVEYS.md](SURVEYS.md), [ANSWERS.md](ANSWERS.md), [FRONTEND.md](FRONTEND.md).

### `GET /api/v1/surveys/:slug/stats` — authenticated

Code: `SurveyController.getStatsBySlug`, `SurveyService.getStatsBySlug`, `SurveyRepository.getSurveyStatsBySlug` and `getResponsesOptionsStatsBySlug` (raw SQL). Schema: `surveyStatsSchema`, `optionStatsSchema` in `packages/schemas/src/surveySchema.ts`.

`SurveyStats` payload:

```jsonc
{
  "totalAnswers": 100,        // non-deleted answers of the survey
  "completedAnswers": 80,     // answers with responses.length == questions.length
  "incompleteAnswers": 20,    // answers with responses.length <  questions.length
  "questionCount": 15,        // questions.length
  "optionStats": [            // one entry per SELECT question (ordered by question id)
    {
      "questionId": 1,
      "questionName": "Favorite Color?",
      "options": [ { "optionContent": "Red", "responseCount": 10 } ]   // every option, count may be 0
    }
  ]
}
```

### `GET /api/v1/stats/surveys` — authenticated

Code: `routes/statsRouter.ts` (mounted at `/api/v1/stats`), `SurveyController.getSummary`, `SurveyService.getSummary`, `SurveyRepository.getSummary`. Schema: `surveySummarySchema` (`SurveySummary`) in `packages/schemas/src/surveySchema.ts`. Operation `getSurveySummary`.

### `GET /api/v1/stats/surveys/active` — authenticated

Code: `routes/statsRouter.ts`, `SurveyController.getActiveSurveyStats`, `SurveyService.getActiveSurveyStats`, `SurveyRepository.getActiveSurveyStats` (raw SQL). Schema: `activeSurveyStatsSchema` (`ActiveSurveyStats`) in `packages/schemas/src/surveySchema.ts`. Operation `getActiveSurveyStats`. It feeds the dashboard small multiples (REQ-FE-032).

```jsonc
{
  "data": [                     // at most 8 items, most recently activated first
    {
      "slug": "clima-laboral-2026",
      "name": "Clima laboral 2026",
      "totalAnswers": 83,       // non-deleted answers of the survey
      "completedAnswers": 71,   // as in SurveyStats
      "incompleteAnswers": 12   // as in SurveyStats
    }
  ]
}
```

## Requirements

### REQ-STAT-001 — Unknown or deleted survey

Legacy ID: STAT-01.

`GET /api/v1/surveys/:slug/stats` with an unknown or deleted slug → `404 Not found`.

**Acceptance criteria**

- **AC-STAT-001-1**
  - **Given** an authenticated user and a slug that does not exist or belongs to a soft-deleted survey
  - **When** its statistics are requested
  - **Then** the response is `404 Not found`

### REQ-STAT-002 — Statistics response

Legacy ID: STAT-02.

Response `200 { data: SurveyStats }` with the shape described above: `totalAnswers` (non-deleted answers of the survey), `completedAnswers` (answers with `responses.length == questions.length`), `incompleteAnswers` (answers with `responses.length < questions.length`), `questionCount` (`questions.length`) and `optionStats` (one entry per select question, ordered by question id, each with every option and its `responseCount`, which may be `0`).

**Acceptance criteria**

- **AC-STAT-002-1**
  - **Given** a survey with 3 questions and two answers, one answering all 3 questions and one answering 2
  - **When** an authenticated user requests its statistics
  - **Then** the response is `200` with `totalAnswers: 2`, `completedAnswers: 1`, `incompleteAnswers: 1`, `questionCount: 3`
- **AC-STAT-002-2**
  - **Given** no `jwt` cookie
  - **When** the statistics are requested
  - **Then** the response is `401`

### REQ-STAT-003 — Computed in PostgreSQL

Legacy ID: STAT-03.

Counts are computed in PostgreSQL with `jsonb_array_length` / `jsonb_array_elements`; aggregates come back as `BigInt` and are serialized as numbers (REQ-API-004).

**Acceptance criteria**

- **AC-STAT-003-1**
  - **Given** a survey with answers
  - **When** its statistics are requested
  - **Then** every count in the JSON body is a JSON number (not a string), and the counts are produced by the raw SQL queries of `SurveyRepository`

### REQ-STAT-004 — Option statistics

Legacy ID: STAT-04.

`optionStats` counts, for each option of each select question, how many answers selected it (`MULTI_SELECT` answers count once per selected option). `TEXT_ANSWER` questions do not appear. Options are grouped by option id (two options with the same text are counted apart) and come in the order they have in the survey (`ORDER BY` question id, then option id).

**Acceptance criteria**

- **AC-STAT-004-1**
  - **Given** a `MULTI_SELECT` question with options 1, 2, 3 and two answers selecting `[1, 3]` and `[1]`
  - **When** the statistics are requested
  - **Then** its entry lists option 1 with `responseCount: 2`, option 2 with `0` and option 3 with `1`, in that order
- **AC-STAT-004-2**
  - **Given** a survey with a `TEXT_ANSWER` question
  - **When** the statistics are requested
  - **Then** `optionStats` has no entry for it
- **AC-STAT-004-3**
  - **Given** a select question with two options that have the same `content`
  - **When** answers select only one of them
  - **Then** both options appear separately, with their own counts
- **AC-STAT-004-4**
  - **Given** select questions with ids 2 and 1
  - **When** the statistics are requested
  - **Then** `optionStats` lists question 1 before question 2, each with its options ordered by option id

### REQ-STAT-005 — Integer ids in SQL

Legacy ID: STAT-05.

Question and option ids are cast to `int` in SQL; they must be integers (REQ-DATA-009, REQ-DATA-010).

**Acceptance criteria**

- **AC-STAT-005-1**
  - **Given** a survey whose question and option ids are integers ≥ 1
  - **When** its statistics are requested
  - **Then** the response is `200` and `questionId` values are integers

### REQ-STAT-006 — Soft deletes ignored

Legacy ID: STAT-06.

Every count, `optionStats` included, ignores soft-deleted answers and only considers the non-deleted survey with that slug.

**Acceptance criteria**

- **AC-STAT-006-1**
  - **Given** a survey with one soft-deleted answer selecting option 1 and one non-deleted answer
  - **When** the statistics are requested
  - **Then** `totalAnswers` is `1` and the deleted answer adds nothing to any `responseCount`
- **AC-STAT-006-2**
  - **Given** a soft-deleted survey with slug `s` that has answers, and a new survey with the same slug `s`
  - **When** the statistics of `s` are requested
  - **Then** only the new survey's answers are counted

### REQ-STAT-007 — No answers

Legacy ID: STAT-07.

With no answers, all counts are `0` and every option has `responseCount: 0`.

**Acceptance criteria**

- **AC-STAT-007-1**
  - **Given** a survey with select questions and no answers
  - **When** the statistics are requested
  - **Then** `totalAnswers`, `completedAnswers` and `incompleteAnswers` are `0` and every option of every select question is listed with `responseCount: 0`

### REQ-STAT-008 — Survey counters summary

Legacy ID: STAT-08.

`GET /api/v1/stats/surveys` (authenticated) responds `200 { data: { all, active } }`: `all` is the number of non-deleted surveys and `active` how many of them are active. It ignores the list filters of `GET /surveys` (it feeds the dashboard counters, REQ-FE-017). The path lives outside `/surveys` so it can never clash with a survey slug (decided 2026-10-09, legacy OQ-14).

**Acceptance criteria**

- **AC-STAT-008-1**
  - **Given** 3 non-deleted surveys (2 active) and 1 soft-deleted active survey
  - **When** an authenticated user calls `GET /api/v1/stats/surveys`
  - **Then** the response is `200 { data: { all: 3, active: 2 } }`
- **AC-STAT-008-2**
  - **Given** the same data
  - **When** the request carries query parameters such as `search` or `active`
  - **Then** the result is the same
- **AC-STAT-008-3**
  - **Given** no `jwt` cookie
  - **When** the summary is requested
  - **Then** the response is `401`

### REQ-STAT-009 — Statistics of the most recently activated surveys

`GET /api/v1/stats/surveys/active` (authenticated) responds `200 { data: ActiveSurveyStats[] }` with the 8 most recently activated active surveys: non-deleted surveys with `is_active = true`, ordered by `activated_at` descending (the time of the latest activation, REQ-SURV-014), tie-break `name` ascending, at most 8 items. Each item holds `slug`, `name`, `totalAnswers`, `completedAnswers` and `incompleteAnswers`, with the same definitions as REQ-STAT-002 and ignoring soft-deleted answers (REQ-STAT-006); a survey without answers has `0` in every count. Everything is computed in one PostgreSQL query (REQ-STAT-003) and counts are JSON numbers. Query parameters are ignored. With no active survey, `data` is `[]`. Like `GET /stats/surveys`, the path lives outside `/surveys` so it can never clash with a survey slug. The endpoint is registered in the OpenAPI document and the web client is regenerated (REQ-API-029, REQ-API-032).

**Acceptance criteria**

- **AC-STAT-009-1**
  - **Given** 10 active surveys activated at different times, 1 inactive survey and 1 soft-deleted active survey
  - **When** an authenticated user calls `GET /api/v1/stats/surveys/active`
  - **Then** the response is `200` with the 8 most recently activated active surveys, newest activation first, and neither the inactive nor the deleted survey
- **AC-STAT-009-2**
  - **Given** an active survey with 3 questions and three non-deleted answers (two answering 3 questions, one answering 2) plus one soft-deleted answer
  - **When** the endpoint is called
  - **Then** its item is `{ slug, name, totalAnswers: 3, completedAnswers: 2, incompleteAnswers: 1 }`, with every count a JSON number
- **AC-STAT-009-3**
  - **Given** an active survey with no answers
  - **When** the endpoint is called
  - **Then** its item has `0` in every count
- **AC-STAT-009-4**
  - **Given** two active surveys with the same `activated_at`
  - **When** the endpoint is called
  - **Then** they come in ascending name order
- **AC-STAT-009-5**
  - **Given** no active survey
  - **When** the endpoint is called
  - **Then** the response is `200 { data: [] }`
- **AC-STAT-009-6**
  - **Given** no `jwt` cookie
  - **When** the endpoint is called
  - **Then** the response is `401`
- **AC-STAT-009-7**
  - **Given** the OpenAPI document (`/api/v1/docs-raw`) and the web's generated client
  - **When** they are read
  - **Then** they include `GET /api/v1/stats/surveys/active` with operation `getActiveSurveyStats` and its response schema

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-STAT-1 | Existing implementation (migrated) | Done | REQ-STAT-001, REQ-STAT-002, REQ-STAT-003, REQ-STAT-004, REQ-STAT-005, REQ-STAT-006, REQ-STAT-007, REQ-STAT-008 |
| PH-STAT-2 | Web redesign, API additions: active-survey statistics and answer counts in the survey list | Done | REQ-STAT-009, REQ-SURV-007, REQ-SURV-021 |

PH-STAT-2 is the first phase of the redesign task `feat/web-redesign` (phase order in [BRAND.md](BRAND.md), Implementation phases). It changes the API, the shared schemas, the OpenAPI document and the generated web client only; no page uses the new data until PH-FE-3.
