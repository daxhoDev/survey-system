# 10 — Authentication

[← Back to index](MAIN.md) · Related: [03 Data model](03-data-model.md), [04 API conventions](04-api-conventions.md), [05 Configuration](05-configuration.md), [20 Frontend](20-frontend.md)

Code: `apps/api/src/routes/userRouter.ts`, `controllers/authController.ts`,
`services/authService.ts`, `repositories/userRepository.ts`,
`repositories/refreshTokenRepository.ts`, `middlewares/authMiddleware.ts`.
Schemas: `packages/schemas/src/userSchema.ts`, `authSchema.ts`.

## 1. Session model

- **AUTH-01** `[implemented]` Sessions use two HTTP-only cookies:

| Cookie | Content | `maxAge` | `path` | `secure` |
|--------|---------|----------|--------|----------|
| `jwt` | Access JWT (HS256, `JWT_SECRET`), payload `{ id, username, email }`, expires after `ACCESS_TOKEN_TTL_MINUTES` | `ACCESS_TOKEN_TTL_MINUTES` minutes | `/` | only in `production` |
| `refresh` | Random UUID v4 (opaque) | `REFRESH_TOKEN_TTL_DAYS` days | `/api/v1/users/refresh` | only in `production` |

  Token and cookie lifetimes come from the two TTL variables of [05-configuration.md](05-configuration.md) §1.1.

- **AUTH-02** `[implemented]` Only the SHA-256 hex hash of the refresh token is stored (`refresh_tokens.token_hash`), with `expires_at = now + REFRESH_TOKEN_TTL_DAYS days`.
- **AUTH-03** `[implemented]` A user has at most one refresh token (DB unique `user_id`). Logging in again replaces it, so a new login invalidates the previous session's ability to refresh. `[open: OQ-09]` whether single-session is the intended behavior.
- **AUTH-04** `[implemented]` Refresh tokens rotate: each successful refresh deletes the used token and issues a new pair.
- **AUTH-05** `[implemented]` The API authenticates **only** through the `jwt` cookie; the `Authorization` header is ignored. OpenAPI must declare it as a cookie scheme (API-30).

## 2. Authentication middleware — `AuthMiddleware.protect`

- **AUTH-06** `[implemented]` Missing `jwt` cookie → `401 Unauthenticated user` ("Please, log in first").
- **AUTH-07** `[implemented]` Expired token → `401 Token Error` (API-11).
- **AUTH-08** `[implemented]` Malformed cookie (not a JWT) or bad signature → `401 Invalid token` ("Please, log in again"), clearing the `jwt` and `refresh` cookies.
- **AUTH-09** `[implemented]` On success sets `req.user = { id, username, email }` (`ProtectedRequest`) and adds `userId` to the request logger. The token is not checked against the database (a deleted user keeps access until the JWT expires).

## 2.1 Optional authentication middleware — `AuthMiddleware.optionalAuth`

- **AUTH-22** `[implemented]` Used by routes that are public but behave differently with a session (SURV-12). It never throws: no `jwt` cookie → anonymous; valid token → sets `req.user` and adds `userId` to the request logger, as in AUTH-09; expired token → anonymous with `req.sessionExpired = true`; malformed token or invalid signature → anonymous, logged at `warn`. The route decides whether an expired session matters.

## 3. Endpoints

### POST `/api/v1/users/signup` — public

Body (`createUserSchema`, strict):

| Field | Rule |
|-------|------|
| `email` | valid email |
| `username` | string, min 3 (max 50 by DB column) |
| `password` | string, min 5 |
| `passwordConfirm` | must equal `password` (error on `passwordConfirm`) |

- **AUTH-10** `[implemented]` Email already used by a non-deleted user → `409 Conflict`. Same for username.
- **AUTH-11** `[implemented]` Password stored with bcrypt, cost 10. User id is UUID v7.
- **AUTH-12** `[implemented]` On success: creates refresh token, sets both cookies, responds `200 { data: { id, username, email, createdAt, deletedAt } }`. The password is never returned.
- **AUTH-13** `[pending: BL-03]` Public signup will be replaced by an **invitation-based account creation flow**. Until then the endpoint stays public. The flow's design is not specified yet and must be agreed with the owner before implementation.

### POST `/api/v1/users/login` — public

Body (`loginDataSchema`, strict): `email` (valid email), `password` (string, min 5).

- **AUTH-14** `[implemented]` Unknown email **and** wrong password both return the same `401` response: title `Invalid credentials`, detail `Invalid email or password`. bcrypt comparison is always executed (against a dummy hash generated once at startup with the same cost factor, 10, when the user does not exist) so response time does not reveal whether the email exists.
- **AUTH-15** `[implemented]` On success: deletes the user's existing refresh token if any, creates a new one, sets both cookies, responds `200 { data: { id, username, email, createdAt, deletedAt } }`.

### POST `/api/v1/users/logout` — authenticated

- **AUTH-16** `[implemented]` Logout is idempotent: it deletes the user's refresh token if one exists, clears both cookies (with the same options they were set with) and responds `204`, whether or not a refresh token existed.
- **AUTH-17** `[implemented]` Requires a valid access JWT. With an expired JWT the web client first refreshes and then retries (see [20-frontend.md](20-frontend.md)).

### POST `/api/v1/users/refresh` — refresh cookie

- **AUTH-18** `[implemented]` Missing `refresh` cookie → `401 Invalid token`.
- **AUTH-19** `[implemented]` Unknown hash → `401 Invalid token`; expired (`expires_at < now`) → `401 Token expired`. The expired row is not deleted.
- **AUTH-20** `[implemented]` On success: deletes the used token, issues a new access JWT and refresh token, sets both cookies, responds `204`.

### GET `/api/v1/users/me` — authenticated

- **AUTH-21** `[implemented]` Returns the JWT payload `{ id, username, email }` (from the token, not the DB) with status `200`, wrapped as `{ data: { id, username, email } }`.

## 4. Rate limiting

All `/api/v1/users/*` routes are subject to the stricter limiter (API-21).
