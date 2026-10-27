← Back to [MAIN](MAIN.md)

# API conventions

- **Module:** API conventions
- **Module code:** API
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Routing and endpoint index, response envelope, errors (RFC 9457 Problem Details), validation, rate limiting, security headers and CORS, logging and the OpenAPI document of the REST API (`apps/api`).

Requirement numbers keep the legacy IDs: legacy `API-04` is `REQ-API-004`.

### Endpoints

All endpoints live under `/api/v1` (REQ-API-001).

| Method | Path | Auth | Spec |
|--------|------|------|------|
| POST | `/api/v1/users/login` | public | [AUTH](AUTH.md) |
| POST | `/api/v1/users/logout` | required | [AUTH](AUTH.md) |
| POST | `/api/v1/users/refresh` | refresh cookie | [AUTH](AUTH.md) |
| GET | `/api/v1/users/me` | required | [AUTH](AUTH.md) |
| POST | `/api/v1/invitations` | required | [AUTH](AUTH.md) |
| GET | `/api/v1/invitations` | required | [AUTH](AUTH.md) |
| DELETE | `/api/v1/invitations/:id` | required | [AUTH](AUTH.md) |
| GET | `/api/v1/invitations/token/:token` | public | [AUTH](AUTH.md) |
| POST | `/api/v1/invitations/token/:token/accept` | public | [AUTH](AUTH.md) |
| GET | `/api/v1/surveys` | required | [SURV](SURVEYS.md) |
| POST | `/api/v1/surveys` | required | [SURV](SURVEYS.md) |
| GET | `/api/v1/surveys/:slug` | public (optional session) | [SURV](SURVEYS.md) |
| PATCH | `/api/v1/surveys/:slug` | required | [SURV](SURVEYS.md) |
| DELETE | `/api/v1/surveys/:slug` | required | [SURV](SURVEYS.md) |
| GET | `/api/v1/surveys/:slug/stats` | required | [STAT](STATS.md) |
| GET | `/api/v1/stats/surveys` | required | [STAT](STATS.md) |
| POST | `/api/v1/surveys/:slug/answers` | public | [ANS](ANSWERS.md) |
| GET | `/api/v1/surveys/:slug/answers` | required | [ANS](ANSWERS.md) |
| GET | `/api/v1/surveys/:slug/answers/:id` | required | [ANS](ANSWERS.md) |
| DELETE | `/api/v1/surveys/:slug/answers/:id` | required | [ANS](ANSWERS.md) |
| GET | `/api/v1/docs` | public | Swagger UI |
| GET | `/api/v1/docs-raw` | public | OpenAPI 3.0 JSON |

### Problem body example

```json
{ "type": "about:blank", "status": 422, "title": "Validation Error", "detail": "Your input is invalid, please, try again", "errors": [{ "field": "name", "message": "Survey name is too short" }] }
```

### Code locations

- Errors: `apps/api/src/utils/appError.ts` (`AppError`), `apps/api/src/middlewares/errorMiddleware.ts` (`ErrorMiddleware.handleGlobalError`).
- JSON serializer: `apps/api/src/utils/json.ts`.
- Rate limiting: `apps/api/src/utils/limiter.ts`.
- Logging: `apps/api/src/config/logger.ts`, `apps/api/src/middlewares/loggingMiddleware.ts`.
- OpenAPI: `apps/api/src/lib/openapi.ts` (registry and generator), served by `apps/api/src/app.ts`.
- Id path parameters: `packages/schemas/src/paramsSchema.ts` (`idParamSchema`).

## Requirements

### REQ-API-001 — Base path and port

Legacy ID: API-01.

All endpoints live under `/api/v1`. The default port is `3000` (`PORT`, [CONFIGURATION.md](CONFIGURATION.md)).

**Acceptance criteria**

- **AC-API-001-1**
  - **Given** the API running without `PORT`
  - **When** it starts
  - **Then** it listens on port `3000`
- **AC-API-001-2**
  - **Given** any endpoint of the endpoint table
  - **When** its path is read
  - **Then** it starts with `/api/v1`

### REQ-API-002 — Protected by default

Legacy ID: API-02.

Every route that is not explicitly public is protected with `AuthMiddleware.protect`.

**Acceptance criteria**

- **AC-API-002-1**
  - **Given** an endpoint marked `required` in the endpoint table
  - **When** it is called without a `jwt` cookie
  - **Then** the response is `401 Unauthenticated user` (REQ-AUTH-006)

### REQ-API-003 — Unknown routes

Legacy ID: API-03.

Unknown routes/methods return a `404` problem with `title: "Method not allowed for this path"`.

**Acceptance criteria**

- **AC-API-003-1**
  - **Given** a path or method that no router handles (e.g. `POST /api/v1/users/signup`)
  - **When** it is requested
  - **Then** the response is a `404` `application/problem+json` with title `Method not allowed for this path`

### REQ-API-004 — BigInt-safe JSON serialization

Legacy ID: API-04.

Bodies are JSON serialized with `utils/json.ts` (`BigInt` → `Number`, needed for raw SQL aggregates).

**Acceptance criteria**

- **AC-API-004-1**
  - **Given** a response value holding a `BigInt` (e.g. a raw SQL count)
  - **When** it is sent
  - **Then** it appears in the JSON body as a number

### REQ-API-005 — Single resource envelope

Legacy ID: API-05.

Single resources are wrapped: `{ "data": <resource> }`.

**Acceptance criteria**

- **AC-API-005-1**
  - **Given** an endpoint returning one resource with a body
  - **When** it succeeds
  - **Then** the body is `{ "data": <resource> }`

### REQ-API-006 — Collection envelope

Legacy ID: API-06.

Collections are wrapped with metadata: `{ "data": [...], "meta": { "results": n, ... } }` (surveys add `total`, `page` and `limit`, REQ-SURV-007).

**Acceptance criteria**

- **AC-API-006-1**
  - **Given** an endpoint returning a collection (surveys, answers, invitations)
  - **When** it succeeds
  - **Then** the body is `{ "data": [...], "meta": { "results": <items in data>, ... } }`

### REQ-API-007 — 204 has no body

Legacy ID: API-07.

`204 No Content` responses have no meaningful body.

**Acceptance criteria**

- **AC-API-007-1**
  - **Given** an endpoint that answers `204` (logout, refresh, deletions)
  - **When** it succeeds
  - **Then** the response status is `204` with an empty body

### REQ-API-008 — No envelope exceptions

Legacy ID: API-08.

There are no exceptions to the envelope: `GET /users/me` returns `200 { data: user }` and `POST …/answers` returns `201 { data: Answer }`.

**Acceptance criteria**

- **AC-API-008-1**
  - **Given** a valid session
  - **When** `GET /api/v1/users/me` is called
  - **Then** the response is `200 { data: { id, username, email } }`
- **AC-API-008-2**
  - **Given** an active survey
  - **When** a valid answer is posted to `/api/v1/surveys/:slug/answers`
  - **Then** the response is `201 { data: Answer }`

### REQ-API-009 — RFC 9457 problem responses

Legacy ID: API-09.

Errors use `Content-Type: application/problem+json` with the body shown in *Problem body example* (`type`, `status`, `title`, `detail`). `extensions` passed to `AppError` are spread into the top level (e.g. `errors`).

**Acceptance criteria**

- **AC-API-009-1**
  - **Given** any error response
  - **When** it is received
  - **Then** its `Content-Type` is `application/problem+json` and the body has `type`, `status`, `title` and `detail`
- **AC-API-009-2**
  - **Given** an `AppError` thrown with extensions `{ errors: [...] }`
  - **When** it is sent
  - **Then** `errors` appears at the top level of the body

### REQ-API-010 — Operational errors through AppError

Legacy ID: API-10.

Operational errors are thrown as `AppError(title, detail, status, extensions?)` from `apps/api/src/utils/appError.ts` (`isOperational = true`). Controllers never send error responses directly.

**Acceptance criteria**

- **AC-API-010-1**
  - **Given** the controllers in `apps/api/src/controllers`
  - **When** they are inspected
  - **Then** none sends an error status directly (`res.status(4xx|5xx)`); errors are thrown as `AppError`

### REQ-API-011 — Global error mapping

Legacy ID: API-11.

All errors reach `ErrorMiddleware.handleGlobalError`, which maps:

- `ZodError` → `422 Validation Error` with `errors: [{ field, message }]` (`field` = issue path joined by `.`);
- `TokenExpiredError` (jsonwebtoken) → `401 Token Error`;
- anything else without `status` → `500 Internal Error`.

**Acceptance criteria**

- **AC-API-011-1**
  - **Given** a request body that fails Zod validation at path `questions.0.name`
  - **When** it is submitted
  - **Then** the response is `422` with title `Validation Error` and `errors` containing `{ field: "questions.0.name", message }`
- **AC-API-011-2**
  - **Given** an expired access JWT on a protected route
  - **When** the request is made
  - **Then** the response is `401` with title `Token Error`
- **AC-API-011-3**
  - **Given** an error without `status` thrown in a handler
  - **When** it reaches the error middleware
  - **Then** it is treated as a `500`

### REQ-API-012 — Error log levels

Legacy ID: API-12.

Errors with status ≥ 500 are logged at `error`, the rest at `warn`.

**Acceptance criteria**

- **AC-API-012-1**
  - **Given** an error with status `500`
  - **When** it is handled
  - **Then** it is logged at level `error`
- **AC-API-012-2**
  - **Given** an error with status `404`
  - **When** it is handled
  - **Then** it is logged at level `warn`

### REQ-API-013 — Development error details

Legacy ID: API-13.

In `development`, the response also includes `error` and `stack`. Non-operational errors get the same generic `500` title and detail as in production (REQ-API-014), so a `detail` is always present.

**Acceptance criteria**

- **AC-API-013-1**
  - **Given** `NODE_ENV=development` and an operational error
  - **When** it is sent
  - **Then** the body holds its own fields plus `error` and `stack`
- **AC-API-013-2**
  - **Given** `NODE_ENV=development` and a non-operational error
  - **When** it is sent
  - **Then** the response is `500` with title `Unexpected error`, detail `Something went wrong`, plus `error` and `stack`

### REQ-API-014 — Production error responses

Legacy ID: API-14.

In `production`, operational errors are returned with their own status and fields; non-operational errors return exactly one generic `500 { title: "Unexpected error", detail: "Something went wrong" }`. The handler sends exactly one response.

**Acceptance criteria**

- **AC-API-014-1**
  - **Given** `NODE_ENV=production` and an operational error
  - **When** it is sent
  - **Then** the body holds `type`, `status`, `title`, `detail` and its extensions, without `error` or `stack`
- **AC-API-014-2**
  - **Given** `NODE_ENV=production` and a non-operational error
  - **When** it is sent
  - **Then** exactly one response `500 { title: "Unexpected error", detail: "Something went wrong" }` is sent, without `error` or `stack`

### REQ-API-015 — NODE_ENV is always known

Legacy ID: API-15.

`NODE_ENV` is always `development` or `production` (validated at startup, REQ-CFG-004), so the error handler always responds.

**Acceptance criteria**

- **AC-API-015-1**
  - **Given** `NODE_ENV` set to any other value or unset
  - **When** the API starts
  - **Then** it exits with code `1` before listening (REQ-CFG-002)

### REQ-API-016 — Invalid access token

Legacy ID: API-16.

On protected routes, an access token that is not a JWT or has an invalid signature → `401 Invalid token` ("Please, log in again") and both session cookies are cleared (REQ-AUTH-008).

**Acceptance criteria**

- **AC-API-016-1**
  - **Given** a `jwt` cookie that is not a JWT, or is signed with another secret
  - **When** a protected route is called
  - **Then** the response is `401` with title `Invalid token`, detail `Please, log in again`, and the `jwt` and `refresh` cookies are cleared

### REQ-API-017 — Uniqueness conflicts

Legacy ID: API-17.

Every uniqueness conflict (duplicated email or username, survey name on create or rename) → `409 Conflict`.

**Acceptance criteria**

- **AC-API-017-1**
  - **Given** an existing non-deleted survey whose name yields slug `s`
  - **When** another survey whose name yields `s` is created, or one is renamed to it
  - **Then** the response is `409` with title `Conflict`
- **AC-API-017-2**
  - **Given** an existing non-deleted user
  - **When** an invitation is created for their email, or an invitation is accepted with their username
  - **Then** the response is `409` with title `Conflict`

### REQ-API-018 — Input validation with shared Zod schemas

Legacy ID: API-18.

Inputs (bodies, query strings, cookies' JWT shape) are validated with the shared Zod schemas using `z.safeParse`; on failure the `ZodError` is thrown and mapped by REQ-API-011.

**Acceptance criteria**

- **AC-API-018-1**
  - **Given** an invalid body or query string on any endpoint that accepts one
  - **When** it is submitted
  - **Then** the response is `422 Validation Error` with `errors`

### REQ-API-019 — Strict bodies

Legacy ID: API-19.

Body objects are strict (`z.strictObject`): unknown properties are rejected with `422`. Exception: `updateSurveySchema` is non-strict (`z.object`) — unknown keys are stripped.

**Acceptance criteria**

- **AC-API-019-1**
  - **Given** a login, create-survey, create-answer, create-invitation or accept-invitation body with an unknown property
  - **When** it is submitted
  - **Then** the response is `422`
- **AC-API-019-2**
  - **Given** an update-survey body with an unknown property and otherwise valid fields
  - **When** it is submitted to an unlocked survey
  - **Then** the update succeeds and the unknown property is ignored

### REQ-API-034 — Id path parameters are UUIDs

Legacy ID: API-34.

Path parameters that are ids (`:id` of answers and invitations) are validated with `idParamSchema` (`packages/schemas/src/paramsSchema.ts`) before any lookup: a value that is not a UUID → `422 Validation Error` with `errors: [{ field: "id", message: "Must be a valid UUID" }]`, never a database error. A valid UUID that does not exist is still `404`.

**Acceptance criteria**

- **AC-API-034-1**
  - **Given** `:id` = `abc` on an answer or invitation route
  - **When** it is requested
  - **Then** the response is `422 Validation Error` with `errors: [{ field: "id", message: "Must be a valid UUID" }]`
- **AC-API-034-2**
  - **Given** a valid UUID that matches no answer or invitation
  - **When** it is requested
  - **Then** the response is `404`

### REQ-API-020 — Global rate limit

Legacy ID: API-20.

Global limiter on `/api/`: 40 requests per minute per client.

**Acceptance criteria**

- **AC-API-020-1**
  - **Given** one client that made 40 requests to `/api/` paths outside `/api/v1/users` within one minute
  - **When** it makes the 41st within that minute
  - **Then** the response is `429`

### REQ-API-021 — Auth rate limit

Legacy ID: API-21.

Additional limiter on `/api/v1/users`: 20 requests per minute per client (both limiters apply).

**Acceptance criteria**

- **AC-API-021-1**
  - **Given** one client that made 20 requests to `/api/v1/users/*` within one minute
  - **When** it makes the 21st within that minute
  - **Then** the response is `429`

### REQ-API-022 — Rate limit response and headers

Legacy ID: API-22.

Exceeding a limit returns `429 Too many requests` as a problem response. Standard `RateLimit-*` headers are sent; legacy `X-RateLimit-*` headers are not.

**Acceptance criteria**

- **AC-API-022-1**
  - **Given** a client over a limit
  - **When** it makes a request
  - **Then** the response is `429` `application/problem+json` with title `Too many requests`
- **AC-API-022-2**
  - **Given** any rate-limited response or request under the limit
  - **When** its headers are read
  - **Then** `RateLimit-*` headers are present and no `X-RateLimit-*` header is

### REQ-API-023 — Helmet

Legacy ID: API-23.

`helmet()` defaults are applied to all responses.

**Acceptance criteria**

- **AC-API-023-1**
  - **Given** any response
  - **When** its headers are read
  - **Then** helmet's default headers are present (e.g. `X-Content-Type-Options: nosniff`)

### REQ-API-024 — CORS with one origin and credentials

Legacy ID: API-24.

CORS allows credentials and exactly one origin taken from `CORS_ORIGIN` (REQ-CFG-006).

**Acceptance criteria**

- **AC-API-024-1**
  - **Given** a request with `Origin` equal to `CORS_ORIGIN`
  - **When** it is answered
  - **Then** `Access-Control-Allow-Origin` is that origin and `Access-Control-Allow-Credentials` is `true`

### REQ-API-025 — Logger base configuration

Legacy ID: API-25.

pino with ISO timestamps and base field `enviroment` (sic) = `NODE_ENV`. Level: `LOG_LEVEL` (default `info`).

**Acceptance criteria**

- **AC-API-025-1**
  - **Given** any log line
  - **When** it is read
  - **Then** it has an ISO timestamp and `enviroment` equal to `NODE_ENV`, and lines below `LOG_LEVEL` are not written

### REQ-API-026 — Log output

Legacy ID: API-26.

`development`: pretty-printed to stdout (`pino-pretty`). `production`: one JSON object per line to stdout, with no transport, so the hosting platform collects the logs (decided 2026-10-12; previously written to `logs/app.log`, which is lost with the container).

**Acceptance criteria**

- **AC-API-026-1**
  - **Given** `NODE_ENV=production`
  - **When** the API logs
  - **Then** each line on stdout is one JSON object and no file is written
- **AC-API-026-2**
  - **Given** `NODE_ENV=development`
  - **When** the API logs
  - **Then** the output goes through the `pino-pretty` transport to stdout

### REQ-API-027 — Log redaction

Legacy ID: API-27.

Redaction: `*.password`, `req.headers.cookie`, `res.headers.set-cookie` → `[REDACTED]`.

**Acceptance criteria**

- **AC-API-027-1**
  - **Given** a logged object holding a `password` field, or a request log with a `Cookie` header, or a response log with `Set-Cookie`
  - **When** the line is written
  - **Then** those values are `[REDACTED]`

### REQ-API-028 — Request id in every log line

Legacy ID: API-28.

Each request gets a UUID v4 `requestId` included in all its log lines (REQ-ARCH-011).

**Acceptance criteria**

- **AC-API-028-1**
  - **Given** a request
  - **When** its log lines are read
  - **Then** they all carry the same `requestId`, a UUID v4

### REQ-API-033 — No direct console output in the server

Legacy ID: API-33.

The API server code (`apps/api/src`) does not write to the console directly (`console.*`); command-line scripts such as the seed (`apps/api/prisma/seed.ts`) and `create-user` (`apps/api/src/scripts`) print their output normally; every log line, including the startup message in `apps/api/src/server.ts`, goes through pino (`getLogger()` or the base logger). Only exception: `apps/api/src/config/env.ts` writes the configuration validation errors to stderr with `console.error` before exiting (REQ-CFG-002), because the logger itself depends on the validated configuration.

**Acceptance criteria**

- **AC-API-033-1**
  - **Given** the files in `apps/api/src` outside `src/scripts`
  - **When** they are searched for `console.`
  - **Then** the only matches are the `console.error` calls in `apps/api/src/config/env.ts`

### REQ-API-029 — Every endpoint registered in OpenAPI

Legacy ID: API-29.

Every endpoint is registered in `apps/api/src/lib/openapi.ts` with `registry.registerPath`, tagged (`Users`, `Invitations`, `Stats`, `Surveys`, `Answers`), with an `operationId` (used by Orval to name hooks). Error responses (`application/problem+json`) are declared per path with the statuses that path emits, and `429` and `500` are always added.

**Acceptance criteria**

- **AC-API-029-1**
  - **Given** the endpoint table (except `/docs` and `/docs-raw`)
  - **When** the OpenAPI document is generated
  - **Then** every endpoint is present with one of the tags `Users`, `Invitations`, `Stats`, `Surveys`, `Answers` and an `operationId`
- **AC-API-029-2**
  - **Given** any path in the OpenAPI document
  - **When** its responses are read
  - **Then** it declares `429` and `500` as `application/problem+json`, plus the error statuses that path actually emits

### REQ-API-030 — Cookie security scheme

Legacy ID: API-30.

Protected endpoints declare `security: [{ cookieAuth: [] }]`, an `apiKey` scheme in the `jwt` cookie (REQ-AUTH-005); `GET /surveys/:slug` declares that the session is optional.

**Acceptance criteria**

- **AC-API-030-1**
  - **Given** the OpenAPI document
  - **When** its security schemes are read
  - **Then** `cookieAuth` is `{ type: "apiKey", in: "cookie", name: "jwt" }` and every protected endpoint declares `security: [{ cookieAuth: [] }]`
- **AC-API-030-2**
  - **Given** `GET /surveys/{slug}` in the OpenAPI document
  - **When** its security is read
  - **Then** the session is declared optional

### REQ-API-031 — OpenAPI matches the real API

Legacy ID: API-31.

The OpenAPI document matches the real API: response envelopes (`{data}`, `{data, meta}`), `201`/`204` codes, the `servers` URL, cookie-based auth, the stats and answers payloads, and the `429`/`403`/`409` responses actually emitted. `servers` is the relative URL `/` (the document is served by the API itself), and paths are generated for the web client without a host (REQ-CFG-009).

**Acceptance criteria**

- **AC-API-031-1**
  - **Given** the OpenAPI document
  - **When** `servers` is read
  - **Then** it is `[{ url: "/" }]`
- **AC-API-031-2**
  - **Given** any endpoint
  - **When** its real success status and body are compared with its OpenAPI declaration
  - **Then** status code and envelope match

### REQ-API-035 — Sondix branding in the API documentation

Legacy ID: API-35.

The OpenAPI document's `info.title` is "Sondix API" (description "API endpoints documentation for Sondix, built by Daxho") and the Swagger UI page title (`customSiteTitle` in `apps/api/src/app.ts`) is "Sondix API Documentation" (REQ-BRAND-002).

**Acceptance criteria**

- **AC-API-035-1**
  - **Given** `GET /api/v1/docs-raw`
  - **When** `info` is read
  - **Then** `title` is `Sondix API` and `description` is `API endpoints documentation for Sondix, built by Daxho`
- **AC-API-035-2**
  - **Given** `GET /api/v1/docs/`
  - **When** the HTML `<title>` is read
  - **Then** it is `Sondix API Documentation`

### REQ-API-032 — Endpoint changes update OpenAPI and the client

Legacy ID: API-32.

Any endpoint change updates `openapi.ts` in the same change, and then the web client is regenerated (`pnpm generate:api`, [DEV_WORKFLOW.md](DEV_WORKFLOW.md)).

**Acceptance criteria**

- **AC-API-032-1**
  - **Given** a change that adds or changes an endpoint
  - **When** it is reviewed
  - **Then** the same change updates `apps/api/src/lib/openapi.ts` and the regenerated `apps/web/src/lib/api`

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-API-1 | Existing implementation (migrated) | Done | REQ-API-001, REQ-API-002, REQ-API-003, REQ-API-004, REQ-API-005, REQ-API-006, REQ-API-007, REQ-API-008, REQ-API-009, REQ-API-010, REQ-API-011, REQ-API-012, REQ-API-013, REQ-API-014, REQ-API-015, REQ-API-016, REQ-API-017, REQ-API-018, REQ-API-019, REQ-API-020, REQ-API-021, REQ-API-022, REQ-API-023, REQ-API-024, REQ-API-025, REQ-API-026, REQ-API-027, REQ-API-028, REQ-API-029, REQ-API-030, REQ-API-031, REQ-API-032, REQ-API-033, REQ-API-034, REQ-API-035 |
