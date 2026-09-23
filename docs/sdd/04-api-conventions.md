# 04 — API Conventions

[← Back to index](MAIN.md)

## 1. Base path and endpoints

- **API-01** `[implemented]` All endpoints live under `/api/v1`. Default port is `3000` (`PORT`, see [05-configuration.md](05-configuration.md)).

| Method | Path | Auth | Spec |
|--------|------|------|------|
| POST | `/api/v1/users/login` | public | [AUTH](10-auth.md) |
| POST | `/api/v1/users/logout` | required | [AUTH](10-auth.md) |
| POST | `/api/v1/users/refresh` | refresh cookie | [AUTH](10-auth.md) |
| GET | `/api/v1/users/me` | required | [AUTH](10-auth.md) |
| POST | `/api/v1/invitations` | required | [AUTH](10-auth.md) |
| GET | `/api/v1/invitations` | required | [AUTH](10-auth.md) |
| DELETE | `/api/v1/invitations/:id` | required | [AUTH](10-auth.md) |
| GET | `/api/v1/invitations/token/:token` | public | [AUTH](10-auth.md) |
| POST | `/api/v1/invitations/token/:token/accept` | public | [AUTH](10-auth.md) |
| GET | `/api/v1/surveys` | required | [SURV](11-surveys.md) |
| POST | `/api/v1/surveys` | required | [SURV](11-surveys.md) |
| GET | `/api/v1/surveys/:slug` | public (optional session) | [SURV](11-surveys.md) |
| PATCH | `/api/v1/surveys/:slug` | required | [SURV](11-surveys.md) |
| DELETE | `/api/v1/surveys/:slug` | required | [SURV](11-surveys.md) |
| GET | `/api/v1/surveys/:slug/stats` | required | [STAT](13-stats.md) |
| POST | `/api/v1/surveys/:slug/answers` | public | [ANS](12-answers.md) |
| GET | `/api/v1/surveys/:slug/answers` | required | [ANS](12-answers.md) |
| GET | `/api/v1/surveys/:slug/answers/:id` | required | [ANS](12-answers.md) |
| DELETE | `/api/v1/surveys/:slug/answers/:id` | required | [ANS](12-answers.md) |
| GET | `/api/v1/docs` | public | Swagger UI |
| GET | `/api/v1/docs-raw` | public | OpenAPI 3.0 JSON |

- **API-02** `[implemented]` Every route that is not explicitly public is protected with `AuthMiddleware.protect`.
- **API-03** `[implemented]` Unknown routes/methods return `404` problem (`title: "Method not allowed for this path"`).

## 2. Success responses

- **API-04** `[implemented]` Bodies are JSON serialized with `utils/json.ts` (`BigInt` → `Number`, needed for raw SQL aggregates).
- **API-05** `[implemented]` Single resources are wrapped: `{ "data": <resource> }`.
- **API-06** `[implemented]` Collections are wrapped with metadata: `{ "data": [...], "meta": { "results": n, ... } }` (surveys add `page` and `limit`).
- **API-07** `[implemented]` `204 No Content` responses have no meaningful body.
- **API-08** `[implemented]` There are no exceptions to the envelope: `GET /users/me` returns `200 { data: user }` and `POST …/answers` returns `201 { data: Answer }`.

## 3. Errors — RFC 9457 Problem Details

- **API-09** `[implemented]` Errors use `Content-Type: application/problem+json` with body:

```json
{ "type": "about:blank", "status": 422, "title": "Validation Error", "detail": "Your input is invalid, please, try again", "errors": [{ "field": "name", "message": "Survey name is too short" }] }
```

  `extensions` passed to `AppError` are spread into the top level (e.g. `errors`).
- **API-10** `[implemented]` Operational errors are thrown as `AppError(title, detail, status, extensions?)` from `apps/api/src/utils/appError.ts` (`isOperational = true`). Never send error responses directly from controllers.
- **API-11** `[implemented]` All errors reach `ErrorMiddleware.handleGlobalError`, which maps:
  - `ZodError` → `422 Validation Error` with `errors: [{ field, message }]` (`field` = issue path joined by `.`).
  - `TokenExpiredError` (jsonwebtoken) → `401 Token Error`.
  - anything else without `status` → `500 Internal Error`.
- **API-12** `[implemented]` Errors with status ≥ 500 are logged at `error`, the rest at `warn`.
- **API-13** `[implemented]` In `development`, the response also includes `error` and `stack`.
- **API-14** `[implemented]` In `production`, operational errors are returned with their own status and fields; non-operational errors return exactly one generic `500 { title: "Unexpected error", detail: "Something went wrong" }`. The handler must send exactly one response.
- **API-15** `[implemented]` `NODE_ENV` is always `development` or `production` (validated at startup), so the error handler always responds.
- **API-16** `[implemented]` On protected routes, an access token that is not a JWT or has an invalid signature → `401 Invalid token` ("Please, log in again") and both session cookies are cleared (AUTH-08).
- **API-17** `[implemented]` Every uniqueness conflict (duplicated email or username, survey name on create or rename) → `409 Conflict`.

## 4. Validation

- **API-18** `[implemented]` Inputs (bodies, query strings, cookies' JWT shape) are validated with the shared Zod schemas using `z.safeParse`; on failure the `ZodError` is thrown and mapped by API-11.
- **API-19** `[implemented]` Body objects are strict (`z.strictObject`): unknown properties are rejected with `422`. Exception: `updateSurveySchema` is non-strict (`z.object`) — unknown keys are stripped.

## 5. Rate limiting (`apps/api/src/utils/limiter.ts`)

- **API-20** `[implemented]` Global limiter on `/api/`: 40 requests per minute per client.
- **API-21** `[implemented]` Additional limiter on `/api/v1/users`: 20 requests per minute per client (both limiters apply).
- **API-22** `[implemented]` Exceeding a limit returns `429 Too many requests` as a problem response. Standard `RateLimit-*` headers are sent; legacy `X-RateLimit-*` headers are not.

## 6. Security headers and CORS

- **API-23** `[implemented]` `helmet()` defaults are applied to all responses.
- **API-24** `[implemented]` CORS allows credentials and exactly one origin taken from `CORS_ORIGIN`.

## 7. Logging (`apps/api/src/config/logger.ts`)

- **API-25** `[implemented]` pino with ISO timestamps and base field `enviroment` (sic) = `NODE_ENV`. Level: `LOG_LEVEL` (default `info`).
- **API-26** `[implemented]` `development`: pretty-printed to stdout. Otherwise: JSON to `logs/app.log` (relative to the API working directory, created if missing).
- **API-27** `[implemented]` Redaction: `*.password`, `req.headers.cookie`, `res.headers.set-cookie` → `[REDACTED]`.
- **API-28** `[implemented]` Each request gets a UUID v4 `requestId` included in all its log lines (ARCH-11).
- **API-33** `[implemented]` The API server code (`apps/api/src`) does not write to the console directly (`console.*`); command-line scripts such as the seed (`apps/api/prisma/seed.ts`) and `create-user` (`apps/api/src/scripts`) print their output normally; every log line, including the startup message in `apps/api/src/server.ts`, goes through pino (`getLogger()` or the base logger). Only exception: `apps/api/src/config/env.ts` writes the configuration validation errors to stderr with `console.error` before exiting (CFG-02), because the logger itself depends on the validated configuration.

## 8. OpenAPI

- **API-29** `[implemented]` Every endpoint is registered in `apps/api/src/lib/openapi.ts` with `registry.registerPath`, tagged (`Users`, `Surveys`, `Answers`), with an `operationId` (used by Orval to name hooks) and `...defaultResponses` (400, 401, 404, 422, 500 as `application/problem+json`).
- **API-30** `[implemented]` Protected endpoints declare `security: [{ cookieAuth: [] }]`, an `apiKey` scheme in the `jwt` cookie (AUTH-05); `GET /surveys/:slug` declares that the session is optional.
- **API-31** `[implemented]` The OpenAPI document must match the real API: response envelopes (`{data}`, `{data, meta}`), `201`/`204` codes, the `servers` URL, cookie-based auth, the stats and answers payloads, and the `429`/`403`/`409` responses actually emitted. `servers` is the relative URL `/` (the document is served by the API itself), and paths are generated for the web client without a host (CFG-09).
- **API-32** `[implemented]` Any endpoint change must update `openapi.ts` in the same change, then the web client must be regenerated (`pnpm generate:api`, see [30-dev-workflow.md](30-dev-workflow.md)).
