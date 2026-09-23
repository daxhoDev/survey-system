# Backlog and Open Questions

[← Back to index](MAIN.md) · Process: [00-sdd-process.md](00-sdd-process.md)

- **BL-xx** — decided by the owner, not yet implemented. The spec already
  describes the target; implement it, flip the spec tags to `[implemented]`,
  update the README if affected, and remove the item from this list.
- **OQ-xx** — needs an owner decision. Agents must not resolve these on their
  own; present options with a recommendation and wait for the decision. Once
  decided, update the specs and convert it into a BL item if code must change.

## Pending work

| ID | Item | Specs |
|----|------|-------|
| BL-01 | **Update the OpenAPI specification** (`apps/api/src/lib/openapi.ts`) so it matches the real API: `{data}` / `{data, meta}` envelopes, real status codes (`201` create survey, `204`s, `403`, `409`, `429`), `servers` URL, cookie-based auth instead of `bearerAuth`, stats and answers payloads, query param types. | API-31, ARCH-12, AUTH-05 |
| BL-02 | **Dockerfile / containerized deployment**: not built yet. Must install pnpm, handle the workspace (`packages/schemas`), not bake `.env` into the image, fix `CMD`, pin Node version. Design to be agreed. | DEV-WF-03 |
| BL-03 | **Invitation-based account creation flow** replacing public `POST /users/signup`, plus its UI. Design to be agreed with the owner. | AUTH-13, FE-14 |
| BL-04 | **`is_locked` survey column**: migration (`BOOLEAN NOT NULL DEFAULT false`), repository mapping, `isLocked` in the survey schema/response, lock set on first activation, edit rules of SURV-14, and only touch `activated_at` when `isActive` is present. No data backfill is needed: as of 2026-09-23 there is no deployed database. | SURV-02, SURV-03, SURV-14, DATA (surveys) |
| BL-05 | **Environment validation with Zod** in `apps/api/src/config/env.ts`: fail-fast listing all issues, typed config object replacing every `process.env` read, defaults/required policy of 05-configuration §1.1, replace the four token-lifetime variables with `ACCESS_TOKEN_TTL_MINUTES` and `REFRESH_TOKEN_TTL_DAYS`, add `LOG_LEVEL`, `JWT_SECRET` ≥ 32 chars, `NODE_ENV` ∈ {`development`,`production`}, `apps/api/.env.example`. | CFG-01…05, CFG-08, API-15, API-25, AUTH-01, AUTH-02 |
| BL-06 | **IP uniqueness per survey**: migration replacing unique `origin_ip` with composite unique `(survey_id, origin_ip)`; service checks duplicates for the resolved survey. | DATA-07, ANS-03 |
| BL-07 | **Reject answers to inactive surveys** with the same `404` as a non-existent survey. | ANS-05, FE-24 |
| BL-08 | **Hide inactive surveys from anonymous users** on `GET /surveys/:slug` (optional-auth middleware; `404` without session). | SURV-12, FE-24 |
| BL-09 | **Login without user enumeration**: single `401 Invalid credentials`, constant-time-ish bcrypt check. | AUTH-14 |
| BL-13 | **Scope answer routes by survey slug**: `404` for missing/deleted survey, and for answers that don't exist, are deleted or belong to another survey. | ANS-08, SURV-18 |
| BL-14 | **Configurable URLs**: `CORS_ORIGIN` in the API, `VITE_API_URL` in the web (generated client + mutator), replace hardcoded query key in `SurveyDetailsPage`. | API-24, CFG-06, CFG-07, FE-12 |
| BL-15 | **Remove unused dependencies** from `apps/api`: `@tsoa/runtime`, `drizzle-kit`, `swagger-jsdoc` (+ `@types/swagger-jsdoc`), `@scalar/express-api-reference`, `ts-node` (verify each before removal). | — |
| BL-16 | **Regenerate the web client after BL-01 and remove response casts** in pages. | FE-11 |
| BL-17 | **Seed and scripts**: create the seed script (or remove `seed` script and Prisma seed config); remove the broken `generate:api` script in `apps/web`. | DEV-WF-01 |
| BL-18 | **Testing strategy**: choose framework(s), scope and minimum coverage with the owner; specify in 30-dev-workflow. | DEV-WF-02 |

## Open questions

Resolved IDs are removed from this table and never reused (OQ-01 → ANS-05, OQ-11 → CFG-01…09/BL-05, OQ-15 → BL-04, OQ-16 → OV-01, implemented 2026-09-23).

| ID | Question | Context / options | Specs |
|----|----------|-------------------|-------|
| OQ-02 | What to do with the unused DB enum `answer_type` (`TEXT_RESPONSE`…). | Drop it in a migration, or rename `TEXT_RESPONSE` → `TEXT_ANSWER` and use it. Canonical value is `TEXT_ANSWER`. | DATA-08 |
| OQ-03 | Responses for malformed or invalidly-signed access tokens. | Today `422` (not a JWT) / `500` (bad signature). Likely `401` for both, clearing cookies. | API-16, AUTH-08 |
| OQ-04 | Consistent conflict status code. | Duplicated email/username and survey rename give `400`, survey create gives `409`. | API-17, AUTH-10, SURV-08, SURV-14 |
| OQ-05 | Reusing the name/slug of a **deleted** survey. | DB unique index includes deleted rows → `500`. Options: allow reuse (partial unique index `WHERE deleted_at IS NULL`), or reject with a clear conflict error. | DATA-06, SURV-08 |
| OQ-06 | Should `optionStats` exclude soft-deleted answers like the other counters? | Currently included. | STAT-06 |
| OQ-07 | Envelope/status exceptions: `GET /users/me` unwrapped; `POST …/answers` returns `200`. | Align with `{data}` and `201`? Affects the web client. | API-08, AUTH-21, ANS-12 |
| OQ-08 | May active or locked surveys be deleted? | Currently any survey can be deleted. | SURV-19 |
| OQ-09 | Single session per user (a new login invalidates the previous refresh token). | Keep, or support multiple sessions (drop unique `user_id`). | AUTH-03 |
| OQ-10 | Client IP behind a reverse proxy (`trust proxy`). | Needed for correct IP uniqueness once deployed (BL-02). | ANS-07 |
| OQ-12 | Do soft-deleted answers still block the same IP from answering again? | Currently yes. | ANS-04 |
| OQ-13 | Login form language. | UI is Spanish except the login form (English). | FE-06 |
| OQ-14 | Dashboard list: pagination/search/filter/sort UI and counters. | Currently only the first 10 surveys are shown and counted. | FE-17, FE-18 |
| OQ-17 | How the web applies and validates `VITE_API_URL`. | e.g. Orval generates relative paths and `customInstance` prefixes `VITE_API_URL`; validate `import.meta.env` with Zod at startup. | CFG-09, BL-14 |
