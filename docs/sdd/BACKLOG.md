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
| BL-01 | **Update the OpenAPI specification** (`apps/api/src/lib/openapi.ts`) so it matches the real API: `{data}` / `{data, meta}` envelopes, real status codes (`201`, `204`s, `403`, `409`, `429`), relative `servers` URL, cookie-based auth (`cookieAuth`) instead of `bearerAuth`, stats and answers payloads, query param types. | API-30, API-31, ARCH-12, AUTH-05 |
| BL-02 | **Dockerfile / containerized deployment** (design agreed 2026-09-23, specified with the change): not built yet. Must install pnpm, handle the workspace (`packages/schemas`), not bake `.env` into the image, fix `CMD`, pin Node version. Design to be agreed. | DEV-WF-03, ANS-07 |
| BL-03 | **Invitation-based account creation flow** replacing public `POST /users/signup`, plus its UI (design agreed 2026-09-23, specified with the change). | AUTH-13, FE-14 |
| BL-04 | **`is_locked` survey column**: migration (`BOOLEAN NOT NULL DEFAULT false`), repository mapping, `isLocked` in the survey schema/response, lock set on first activation, edit rules of SURV-14, and only touch `activated_at` when `isActive` is present. No data backfill is needed: as of 2026-09-23 there is no deployed database. | SURV-02, SURV-03, SURV-14, DATA (surveys) |
| BL-14 | **Configurable API URL in the web**: Orval relative paths, `customInstance` prefixes `VITE_API_URL` validated with Zod (`apps/web/src/config/env.ts`), replace hardcoded query key in `SurveyDetailsPage`. (The API side, `CORS_ORIGIN`, moved to BL-05.) | CFG-07, CFG-09, FE-12 |
| BL-16 | **Regenerate the web client after BL-01 and remove response casts** in pages. | FE-11 |
| BL-17 | **Seed and scripts**: create the seed script (or remove `seed` script and Prisma seed config); remove the broken `generate:api` script in `apps/web`. | DEV-WF-01 |
| BL-22 | **API contract fixes** (from OQ-03, OQ-04, OQ-07): invalid access token → `401 Invalid token` clearing cookies; every uniqueness conflict → `409`; `/users/me` wrapped in `{data}`; `POST …/answers` → `201`. | API-08, API-16, API-17, AUTH-08, AUTH-10, AUTH-21, ANS-12, SURV-14 |

## Open questions

Resolved IDs are removed from this table and never reused (OQ-01 → ANS-05, OQ-11 → CFG-01…09/BL-05, OQ-15 → BL-04, OQ-16 → OV-01, implemented 2026-09-23; OQ-03, OQ-04, OQ-07 → BL-22, OQ-17 → BL-14, OQ-10 → BL-02, decided 2026-09-23).

| ID | Question | Context / options | Specs |
|----|----------|-------------------|-------|
| OQ-02 | What to do with the unused DB enum `answer_type` (`TEXT_RESPONSE`…). | Drop it in a migration, or rename `TEXT_RESPONSE` → `TEXT_ANSWER` and use it. Canonical value is `TEXT_ANSWER`. | DATA-08 |
| OQ-05 | Reusing the name/slug of a **deleted** survey. | DB unique index includes deleted rows → `500`. Options: allow reuse (partial unique index `WHERE deleted_at IS NULL`), or reject with a clear conflict error. | DATA-06, SURV-08 |
| OQ-06 | Should `optionStats` exclude soft-deleted answers like the other counters? | Currently included. | STAT-06 |
| OQ-08 | May active or locked surveys be deleted? | Currently any survey can be deleted. | SURV-19 |
| OQ-09 | Single session per user (a new login invalidates the previous refresh token). | Keep, or support multiple sessions (drop unique `user_id`). | AUTH-03 |
| OQ-12 | Do soft-deleted answers still block the same IP from answering again? | Currently yes. | ANS-04 |
| OQ-13 | Login form language. | UI is Spanish except the login form (English). | FE-06 |
| OQ-14 | Dashboard list: pagination/search/filter/sort UI and counters. | Currently only the first 10 surveys are shown and counted. | FE-17, FE-18 |
