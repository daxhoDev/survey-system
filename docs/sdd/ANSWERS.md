← Back to [MAIN](MAIN.md)

# Answers

- **Module:** Answers
- **Module code:** ANS
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Submitting and managing survey answers: validation rules, IP uniqueness and survey scoping.

Requirement numbers keep the legacy IDs: legacy `ANS-07` is `REQ-ANS-007`.

Related: [DATA_MODEL.md](DATA_MODEL.md), [API.md](API.md), [SURVEYS.md](SURVEYS.md), [STATS.md](STATS.md), [FRONTEND.md](FRONTEND.md).

Code: `apps/api/src/routes/answerRouter.ts` (mounted at `/api/v1/surveys/:slug/answers`, `mergeParams: true`), `controllers/answerController.ts`, `services/answerService.ts`, `repositories/answerRepository.ts`. Schema: `packages/schemas/src/answerSchema.ts`.

### Answer resource

```jsonc
{
  "id": "0192…",            // UUID v7
  "surveyId": "0192…",
  "responses": [ { "id": 1, "content": "Some text" }, { "id": 2, "content": [1, 3] } ],
  "originIp": "203.0.113.7",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "deletedAt": null
}
```

### Endpoints

| Method | Path | Auth | Requirements |
|--------|------|------|--------------|
| POST | `/api/v1/surveys/:slug/answers` | public | REQ-ANS-001 … REQ-ANS-007, REQ-ANS-012 |
| GET | `/api/v1/surveys/:slug/answers` | required | REQ-ANS-009 |
| GET | `/api/v1/surveys/:slug/answers/:id` | required | REQ-ANS-010 |
| DELETE | `/api/v1/surveys/:slug/answers/:id` | required | REQ-ANS-011 |

`POST` body (`createAnswerSchema`, strict): `{ responses: Response[] }` where each response is `{ id: int, content: string (min 2) | number[] (non-empty) }` ([DATA_MODEL.md](DATA_MODEL.md), JSON documents). Processing order: body shape (REQ-ANS-001), survey resolution (REQ-ANS-002, REQ-ANS-005), IP uniqueness (REQ-ANS-003, REQ-ANS-004), semantic validation (REQ-ANS-006), insert, response (REQ-ANS-012).

## Requirements

### REQ-ANS-001 — Body shape validated

Legacy ID: ANS-01.

The answer body shape is validated with `createAnswerSchema` → `422` on failure.

**Acceptance criteria**

- **AC-ANS-001-1**
  - **Given** an active survey
  - **When** `POST /api/v1/surveys/:slug/answers` is sent with a body that is not `{ responses: Response[] }` (e.g. an unknown key, a text `content` of 1 character, an empty `content` array)
  - **Then** the response is `422 Validation Error` and nothing is stored

### REQ-ANS-002 — Unknown or deleted survey

Legacy ID: ANS-02.

Unknown or deleted survey → `404 Not found`.

**Acceptance criteria**

- **AC-ANS-002-1**
  - **Given** a slug that does not exist or belongs to a soft-deleted survey
  - **When** a valid answer is posted to it
  - **Then** the response is `404 Not found` and nothing is stored

### REQ-ANS-003 — One answer per IP per survey

Legacy ID: ANS-03.

If an answer from the same IP already exists **for this survey** → `403 You already submitted an answer` ("Your IP already submitted an answer for this survey"). Answers from the same IP to other surveys are allowed. Enforced both in the service and by the DB partial composite unique `(survey_id, origin_ip)` (REQ-DATA-007); if the DB index rejects the insert (concurrent submission), the response is the same `403`. The check runs after resolving the survey (REQ-ANS-002).

**Acceptance criteria**

- **AC-ANS-003-1**
  - **Given** a non-deleted answer from IP X for active survey S
  - **When** IP X posts another valid answer to S
  - **Then** the response is `403` with title "You already submitted an answer" and detail "Your IP already submitted an answer for this survey"
- **AC-ANS-003-2**
  - **Given** an answer from IP X for survey S
  - **When** IP X posts a valid answer to another active survey T
  - **Then** the answer is stored (`201`)
- **AC-ANS-003-3**
  - **Given** two concurrent submissions from IP X to S where the service check passes for both
  - **When** the database unique index rejects the second insert
  - **Then** the second response is the same `403`
- **AC-ANS-003-4**
  - **Given** a slug that does not resolve to an active, non-deleted survey
  - **When** an IP that already answered posts to it
  - **Then** the response is the `404` of REQ-ANS-002, not `403`

### REQ-ANS-004 — Soft-deleted answers do not block the IP

Legacy ID: ANS-04.

Soft-deleted answers do not count for the IP uniqueness check: once its answer is deleted, the same IP may answer the survey again (REQ-DATA-007).

**Acceptance criteria**

- **AC-ANS-004-1**
  - **Given** IP X's answer to survey S was deleted
  - **When** IP X posts a valid answer to S
  - **Then** it is stored (`201`)

### REQ-ANS-005 — Inactive surveys reject answers as not found

Legacy ID: ANS-05.

Inactive surveys (`isActive = false`) reject answers with `404`, **identical** to the not-found response of REQ-ANS-002: for a respondent an inactive survey does not exist (consistent with REQ-SURV-012).

**Acceptance criteria**

- **AC-ANS-005-1**
  - **Given** an inactive, non-deleted survey
  - **When** a valid answer is posted to it
  - **Then** the response (status, title and detail) is identical to the one for an unknown slug, and nothing is stored

### REQ-ANS-006 — Semantic validation against the survey

Legacy ID: ANS-06.

Semantic validation against the survey (`AnswerService.validateAnswerCreation`), each failing with `400 Validation error`:

1. `required ≤ responses.length ≤ questions.length` — "There are missing or exceeding responses".
2. Every response `id` matches a question id — "Each response id must match a question id".
3. Every required question has a response — "All required questions must be answered".
4. No duplicated response ids — "Each response id must be unique".
5. By question type:
   - `SINGLE_SELECT`: `content` is an array whose **first** element is a valid option id. (Extra elements are not rejected.)
   - `MULTI_SELECT`: `content` is an array and every element is a valid option id.
   - `TEXT_ANSWER`: `content` is a string.

**Acceptance criteria**

- **AC-ANS-006-1**
  - **Given** an active survey with 3 questions, 2 of them required
  - **When** an answer with 1 response, or with 4 responses, is posted
  - **Then** the response is `400 Validation error` with detail "There are missing or exceeding responses"
- **AC-ANS-006-2**
  - **Given** an active survey
  - **When** a response's `id` matches no question id
  - **Then** the response is `400` with detail "Each response id must match a question id"
- **AC-ANS-006-3**
  - **Given** an active survey with a required question
  - **When** the answer has enough responses but none for that question
  - **Then** the response is `400` with detail "All required questions must be answered"
- **AC-ANS-006-4**
  - **Given** an active survey
  - **When** two responses carry the same `id`
  - **Then** the response is `400` with detail "Each response id must be unique"
- **AC-ANS-006-5**
  - **Given** a `SINGLE_SELECT` question
  - **When** its response `content` is a string, or an array whose first element is not an option id of that question
  - **Then** the response is `400 Validation error`; an array whose first element is valid is accepted even with extra elements
- **AC-ANS-006-6**
  - **Given** a `MULTI_SELECT` question
  - **When** its response `content` is a string or contains an id that is not one of its options
  - **Then** the response is `400 Validation error`
- **AC-ANS-006-7**
  - **Given** a `TEXT_ANSWER` question
  - **When** its response `content` is an array
  - **Then** the response is `400 Validation error`

### REQ-ANS-007 — Origin IP and trusted proxies

Legacy ID: ANS-07.

The origin IP is `req.ip` (empty string if unavailable). Behind reverse proxies, `app.set('trust proxy', TRUST_PROXY)` (`apps/api/src/app.ts`) makes `req.ip` the client IP from `X-Forwarded-For`; `TRUST_PROXY` is the number of trusted proxy hops (default `0`, never trust the header; `0` in `docker-compose.prod.yml`, which has no proxy). In the deployment (Vercel rewrite → Render) it must equal the number of proxies actually in front of the API, measured from `X-Forwarded-For` on the first deployment (REQ-DEVWF-008). This also keys the rate limiters (REQ-API-020, REQ-API-021) per real client: a value that is too low makes every user share the proxies' IP and limits.

**Acceptance criteria**

- **AC-ANS-007-1**
  - **Given** `TRUST_PROXY=0`
  - **When** an answer is posted with an `X-Forwarded-For` header
  - **Then** the stored `originIp` is the socket address, not the header value
- **AC-ANS-007-2**
  - **Given** `TRUST_PROXY=1`
  - **When** an answer is posted through one proxy with `X-Forwarded-For: <client>`
  - **Then** the stored `originIp` is `<client>`, and the rate limiters count requests per `<client>`

### REQ-ANS-008 — Survey scoping of answer routes

Legacy ID: ANS-08.

On `/:id` routes, an id that is not a UUID is rejected with `422` before anything else (REQ-API-034). Every answer route resolves the survey by `:slug` among **non-deleted** surveys first → `404` if not found. For `/:id` routes, the answer must exist, be non-deleted **and belong to that survey**; otherwise `404`. Details: survey not found → `Not found` / "The requested survey doesn't exist"; answer not found → `Not found` / "The requested answer doesn't exist".

**Acceptance criteria**

- **AC-ANS-008-1**
  - **Given** an authenticated user
  - **When** `GET` or `DELETE /api/v1/surveys/:slug/answers/abc` is called
  - **Then** the response is `422 Validation Error` with `errors: [{ field: "id", message: "Must be a valid UUID" }]`
- **AC-ANS-008-2**
  - **Given** an unknown or soft-deleted survey slug
  - **When** any authenticated answer route is called on it
  - **Then** the response is `404 Not found` with detail "The requested survey doesn't exist"
- **AC-ANS-008-3**
  - **Given** an answer that belongs to survey A
  - **When** it is requested or deleted through survey B's slug, or it is soft-deleted, or the id does not exist
  - **Then** the response is `404 Not found` with detail "The requested answer doesn't exist"

### REQ-ANS-009 — List answers of a survey

Legacy ID: ANS-09.

`GET /api/v1/surveys/:slug/answers` (authenticated) returns the non-deleted answers of the survey: `200 { data: Answer[], meta: { results } }`. No pagination.

**Acceptance criteria**

- **AC-ANS-009-1**
  - **Given** a survey with 3 answers, one of them soft-deleted
  - **When** an authenticated user lists its answers
  - **Then** the response is `200` with the 2 non-deleted answers in `data` and `meta.results: 2`
- **AC-ANS-009-2**
  - **Given** no `jwt` cookie
  - **When** the list is requested
  - **Then** the response is `401`

### REQ-ANS-010 — Get one answer

Legacy ID: ANS-10.

`GET /api/v1/surveys/:slug/answers/:id` (authenticated) returns `200 { data: Answer & { surveys: { name, questions } } }`.

**Acceptance criteria**

- **AC-ANS-010-1**
  - **Given** a non-deleted answer of survey S
  - **When** an authenticated user requests it through S's slug
  - **Then** the response is `200` with the answer fields plus `surveys: { name, questions }` of S

### REQ-ANS-011 — Delete an answer

Legacy ID: ANS-11.

`DELETE /api/v1/surveys/:slug/answers/:id` (authenticated) soft-deletes the answer (`deleted_at = now`) and responds `204`.

**Acceptance criteria**

- **AC-ANS-011-1**
  - **Given** a non-deleted answer of survey S
  - **When** an authenticated user deletes it through S's slug
  - **Then** the response is `204`, the row is kept with `deleted_at` set, and it no longer appears in the list, the detail or the statistics

### REQ-ANS-012 — Create answer response

Legacy ID: ANS-12.

A successful submission responds `201 { data: Answer }`.

**Acceptance criteria**

- **AC-ANS-012-1**
  - **Given** an active survey and a valid answer from a new IP
  - **When** it is posted
  - **Then** the response is `201` with `{ data: Answer }` holding `id` (UUID v7), `surveyId`, `responses`, `originIp`, `createdAt` and `deletedAt: null`

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-ANS-1 | Existing implementation (migrated) | Done | REQ-ANS-001, REQ-ANS-002, REQ-ANS-003, REQ-ANS-004, REQ-ANS-005, REQ-ANS-006, REQ-ANS-007, REQ-ANS-008, REQ-ANS-009, REQ-ANS-010, REQ-ANS-011, REQ-ANS-012 |
