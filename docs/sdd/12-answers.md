# 12 — Answers

[← Back to index](MAIN.md) · Related: [03 Data model](03-data-model.md), [04 API conventions](04-api-conventions.md), [11 Surveys](11-surveys.md), [13 Statistics](13-stats.md), [20 Frontend](20-frontend.md)

Code: `apps/api/src/routes/answerRouter.ts` (mounted at `/api/v1/surveys/:slug/answers`, `mergeParams: true`),
`controllers/answerController.ts`, `services/answerService.ts`, `repositories/answerRepository.ts`.
Schema: `packages/schemas/src/answerSchema.ts`.

## 1. Answer resource

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

## 2. Endpoints

### POST `/api/v1/surveys/:slug/answers` — public

Body (`createAnswerSchema`, strict): `{ responses: Response[] }` where each response is
`{ id: int, content: string (min 2) | number[] (non-empty) }`.

Processing order (target):

- **ANS-01** `[implemented]` Body shape validated → `422` on failure.
- **ANS-02** `[implemented]` Unknown or deleted survey → `404 Not found`.
- **ANS-03** `[implemented]` If an answer from the same IP already exists **for this survey** → `403 You already submitted an answer` ("Your IP already submitted an answer for this survey"). Answers from the same IP to other surveys are allowed. Enforced both in the service and by the DB composite unique `(survey_id, origin_ip)` (DATA-07). The check runs after resolving the survey (ANS-02).
- **ANS-04** `[open: OQ-12]` Whether soft-deleted answers still count for the IP uniqueness check (currently they do, since the DB unique index includes them).
- **ANS-05** `[implemented]` Inactive surveys (`isActive = false`) reject answers with `404`, **identical** to the not-found response of ANS-02: for a respondent an inactive survey does not exist (consistent with SURV-12).
- **ANS-06** `[implemented]` Semantic validation against the survey (`AnswerService.validateAnswerCreation`), each failing with `400 Validation error`:
  1. `required ≤ responses.length ≤ questions.length` — "There are missing or exceeding responses".
  2. Every response `id` matches a question id — "Each response id must match a question id".
  3. Every required question has a response — "All required questions must be answered".
  4. No duplicated response ids — "Each response id must be unique".
  5. By question type:
     - `SINGLE_SELECT`: `content` is an array whose **first** element is a valid option id. (Extra elements are not rejected.)
     - `MULTI_SELECT`: `content` is an array and every element is a valid option id.
     - `TEXT_ANSWER`: `content` is a string.
- **ANS-07** `[implemented]` The origin IP is `req.ip` (empty string if unavailable). `[pending: BL-02]` Behind a reverse proxy, `app.set('trust proxy', TRUST_PROXY)` makes `req.ip` the client IP from `X-Forwarded-For`; `TRUST_PROXY` is the number of trusted proxy hops (default `0`, never trust the header), `1` in the production compose file. This also keys the rate limiters (API-20, API-21) per real client.
- **ANS-12** `[implemented]` Response `201 { data: Answer }`.

### GET `/api/v1/surveys/:slug/answers` — authenticated

- **ANS-09** `[implemented]` Returns non-deleted answers of the survey: `200 { data: Answer[], meta: { results } }`. No pagination.

### GET `/api/v1/surveys/:slug/answers/:id` — authenticated

- **ANS-10** `[implemented]` Returns `200 { data: Answer & { surveys: { name, questions } } }`.

### DELETE `/api/v1/surveys/:slug/answers/:id` — authenticated

- **ANS-11** `[implemented]` Soft delete (`deleted_at = now`), `204`.

## 3. Survey scoping

- **ANS-08** `[implemented]` On `/:id` routes, an id that is not a UUID is rejected with `422` before anything else (API-34). Every answer route resolves the survey by `:slug` among **non-deleted** surveys first → `404` if not found. For `/:id` routes, the answer must exist, be non-deleted **and belong to that survey**; otherwise `404`. Details: survey not found → `Not found` / "The requested survey doesn't exist"; answer not found → `Not found` / "The requested answer doesn't exist".
