← Back to [MAIN](MAIN.md)

# Authentication

- **Module:** Authentication
- **Module code:** AUTH
- **Version:** v1.0
- **Status:** Approved
- **Last updated:** 2026-10-27

## Description

Invitations, the `create-user` command, login, logout, refresh, current user, session cookies and tokens, and the authentication middlewares.

Requirement numbers keep the legacy IDs: legacy `AUTH-30` is `REQ-AUTH-030`. `REQ-AUTH-012` is not used: legacy `AUTH-12` described the public signup response and was removed when public signup was replaced by invitations (REQ-AUTH-029).

Related: [DATA_MODEL.md](DATA_MODEL.md), [API.md](API.md), [CONFIGURATION.md](CONFIGURATION.md), [FRONTEND.md](FRONTEND.md).

### Code

- `apps/api/src/routes/userRouter.ts`, `controllers/authController.ts`, `services/authService.ts`, `repositories/userRepository.ts`, `repositories/refreshTokenRepository.ts`, `middlewares/authMiddleware.ts`, `scripts/createUser.ts` (REQ-AUTH-031).
- Invitations: `routes/invitationRouter.ts`, `controllers/invitationController.ts`, `services/invitationService.ts`, `repositories/invitationRepository.ts`.
- Schemas: `packages/schemas/src/userSchema.ts`, `authSchema.ts`, `invitationSchema.ts`.

### Session cookies

Sessions use two HTTP-only cookies (REQ-AUTH-001):

| Cookie | Content | `maxAge` | `path` | `secure` |
|--------|---------|----------|--------|----------|
| `jwt` | Access JWT (HS256, `JWT_SECRET`), payload `{ id, username, email }`, expires after `ACCESS_TOKEN_TTL_MINUTES` | `ACCESS_TOKEN_TTL_MINUTES` minutes | `/` | only in `production` |
| `refresh` | Random UUID v4 (opaque) | `REFRESH_TOKEN_TTL_DAYS` days | `/api/v1/users/refresh` | only in `production` |

Token and cookie lifetimes come from the two TTL variables of [CONFIGURATION.md](CONFIGURATION.md).

### Invitations

An invitation lets one person create one account with a fixed email. Any user with a session may invite (there are no roles). The link is shown to the inviter to copy and send by their own means; the API sends no email.

### Endpoints

| Method | Path | Access | Requirements |
|--------|------|--------|--------------|
| POST | `/api/v1/users/login` | public | REQ-AUTH-014, REQ-AUTH-015 |
| POST | `/api/v1/users/logout` | authenticated | REQ-AUTH-016, REQ-AUTH-017 |
| POST | `/api/v1/users/refresh` | refresh cookie | REQ-AUTH-018 … REQ-AUTH-020 |
| GET | `/api/v1/users/me` | authenticated | REQ-AUTH-021 |
| POST | `/api/v1/invitations` | authenticated | REQ-AUTH-024 |
| GET | `/api/v1/invitations` | authenticated | REQ-AUTH-025 |
| DELETE | `/api/v1/invitations/:id` | authenticated | REQ-AUTH-026 |
| GET | `/api/v1/invitations/token/:token` | public | REQ-AUTH-027 |
| POST | `/api/v1/invitations/token/:token/accept` | public | REQ-AUTH-028, REQ-AUTH-029 |

Login body (`loginDataSchema`, strict): `email` (valid email), `password` (string, min 5).

### Rate limiting

All `/api/v1/users/*` routes and the public invitation token routes (REQ-AUTH-030) are subject to the stricter limiter (REQ-API-021).

## Requirements

### REQ-AUTH-001 — Two HTTP-only session cookies

Legacy ID: AUTH-01.

Sessions use two HTTP-only cookies, `jwt` and `refresh`, with the content, `maxAge`, `path` and `secure` flag of the session cookies table in the Description.

**Acceptance criteria**

- **AC-AUTH-001-1**
  - **Given** a successful login
  - **When** the `Set-Cookie` headers are read
  - **Then** `jwt` is HTTP-only with path `/` and `maxAge` of `ACCESS_TOKEN_TTL_MINUTES` minutes, and `refresh` is HTTP-only with path `/api/v1/users/refresh` and `maxAge` of `REFRESH_TOKEN_TTL_DAYS` days
- **AC-AUTH-001-2**
  - **Given** `NODE_ENV=production`
  - **When** the cookies are set
  - **Then** both carry `Secure`; with `NODE_ENV=development` neither does
- **AC-AUTH-001-3**
  - **Given** the `jwt` cookie
  - **When** it is decoded with `JWT_SECRET`
  - **Then** it is an HS256 JWT with payload `{ id, username, email }` expiring after `ACCESS_TOKEN_TTL_MINUTES`; the `refresh` cookie value is a UUID v4

### REQ-AUTH-002 — Only the refresh token hash is stored

Legacy ID: AUTH-02.

Only the SHA-256 hex hash of the refresh token is stored (`refresh_tokens.token_hash`), with `expires_at = now + REFRESH_TOKEN_TTL_DAYS days`.

**Acceptance criteria**

- **AC-AUTH-002-1**
  - **Given** a successful login
  - **When** the user's `refresh_tokens` row is read
  - **Then** `token_hash` is the SHA-256 hex of the `refresh` cookie value, the raw value is stored nowhere, and `expires_at` is `REFRESH_TOKEN_TTL_DAYS` days after creation

### REQ-AUTH-003 — Single session per user

Legacy ID: AUTH-03.

A user has at most one refresh token (DB unique `user_id`). Logging in again replaces it, so a new login invalidates the previous session's ability to refresh. Single session per user is the intended behavior (decided 2026-09-30).

**Acceptance criteria**

- **AC-AUTH-003-1**
  - **Given** a user who logged in and holds refresh token A
  - **When** the user logs in again and receives refresh token B
  - **Then** the user has exactly one `refresh_tokens` row, and refreshing with A returns `401 Invalid token`

### REQ-AUTH-004 — Refresh token rotation

Legacy ID: AUTH-04.

Refresh tokens rotate: each successful refresh deletes the used token and issues a new pair.

**Acceptance criteria**

- **AC-AUTH-004-1**
  - **Given** a valid refresh token A
  - **When** `POST /api/v1/users/refresh` succeeds
  - **Then** new `jwt` and `refresh` cookies are set, and a second refresh with A returns `401 Invalid token`

### REQ-AUTH-005 — Cookie-only authentication

Legacy ID: AUTH-05.

The API authenticates **only** through the `jwt` cookie; the `Authorization` header is ignored. OpenAPI must declare it as a cookie scheme (REQ-API-030).

**Acceptance criteria**

- **AC-AUTH-005-1**
  - **Given** a request to a protected route with a valid access JWT in `Authorization: Bearer` and no `jwt` cookie
  - **When** it is sent
  - **Then** the response is `401 Unauthenticated user`
- **AC-AUTH-005-2**
  - **Given** the OpenAPI document
  - **When** its security schemes are read
  - **Then** `cookieAuth` is an `apiKey` scheme `in: cookie` named `jwt`

### REQ-AUTH-006 — Missing access cookie

Legacy ID: AUTH-06.

`AuthMiddleware.protect`: missing `jwt` cookie → `401 Unauthenticated user` ("Please, log in first").

**Acceptance criteria**

- **AC-AUTH-006-1**
  - **Given** a request to a protected route without the `jwt` cookie
  - **When** it is sent
  - **Then** the response is `401` with title `Unauthenticated user` and detail "Please, log in first"

### REQ-AUTH-007 — Expired access token

Legacy ID: AUTH-07.

`AuthMiddleware.protect`: expired token → `401 Token Error` (REQ-API-011).

**Acceptance criteria**

- **AC-AUTH-007-1**
  - **Given** a request to a protected route with an expired but correctly signed `jwt` cookie
  - **When** it is sent
  - **Then** the response is `401` with title `Token Error`

### REQ-AUTH-008 — Malformed or badly signed access token

Legacy ID: AUTH-08.

`AuthMiddleware.protect`: malformed cookie (not a JWT) or bad signature → `401 Invalid token` ("Please, log in again"), clearing the `jwt` and `refresh` cookies.

**Acceptance criteria**

- **AC-AUTH-008-1**
  - **Given** a request to a protected route whose `jwt` cookie is not a JWT, or is signed with another secret
  - **When** it is sent
  - **Then** the response is `401` with title `Invalid token` and detail "Please, log in again", and it clears the `jwt` and `refresh` cookies

### REQ-AUTH-009 — Authenticated request

Legacy ID: AUTH-09.

`AuthMiddleware.protect`: on success sets `req.user = { id, username, email }` (`ProtectedRequest`) and adds `userId` to the request logger (REQ-ARCH-010). The token is not checked against the database (a deleted user keeps access until the JWT expires).

**Acceptance criteria**

- **AC-AUTH-009-1**
  - **Given** a valid `jwt` cookie
  - **When** a protected route runs
  - **Then** `req.user` is the token payload `{ id, username, email }`
- **AC-AUTH-009-2**
  - **Given** a valid `jwt` cookie whose user has been soft-deleted after it was issued
  - **When** a protected route is requested before the JWT expires
  - **Then** the request is authenticated (no database lookup)

### REQ-AUTH-010 — Unique email and username

Legacy ID: AUTH-10.

An email or username already used by a non-deleted user → `409 Conflict`. Applies to invitations (email, REQ-AUTH-024), to accepting one (username, REQ-AUTH-029) and to the `create-user` command (REQ-AUTH-031).

**Acceptance criteria**

- **AC-AUTH-010-1**
  - **Given** a non-deleted user with email E and username U
  - **When** an invitation for E is created, or an invitation is accepted with username U
  - **Then** the response is `409 Conflict`
- **AC-AUTH-010-2**
  - **Given** a soft-deleted user with email E and username U
  - **When** an invitation for E is created and accepted with username U
  - **Then** the account is created

### REQ-AUTH-011 — Credentials format and storage

Legacy ID: AUTH-11.

Passwords are stored with bcrypt, cost 10. User ids are UUID v7. Username: string, min 3, max 50 (DB column); password: string, min 5, confirmed by `passwordConfirm`.

**Acceptance criteria**

- **AC-AUTH-011-1**
  - **Given** a created account
  - **When** its `users` row is read
  - **Then** `password` is a bcrypt hash with cost 10 and `id` is a UUID v7
- **AC-AUTH-011-2**
  - **Given** an accept-invitation body with a username of 2 or 51 characters, a password of 4 characters, or a `passwordConfirm` different from `password`
  - **When** it is submitted
  - **Then** the response is `422` and no user is created

### REQ-AUTH-013 — No public signup

Legacy ID: AUTH-13.

There is no public signup: `POST /api/v1/users/signup` does not exist (it answers the generic `404` of REQ-API-003). Accounts are created only by accepting an invitation (REQ-AUTH-023 … REQ-AUTH-030) or with the `create-user` command (REQ-AUTH-031).

**Acceptance criteria**

- **AC-AUTH-013-1**
  - **Given** any body
  - **When** `POST /api/v1/users/signup` is called
  - **Then** the response is the generic `404` problem of REQ-API-003 and no user is created

### REQ-AUTH-014 — Indistinguishable login failures

Legacy ID: AUTH-14.

Unknown email **and** wrong password both return the same `401` response: title `Invalid credentials`, detail `Invalid email or password`. bcrypt comparison is always executed (against a dummy hash generated once at startup with the same cost factor, 10, when the user does not exist) so response time does not reveal whether the email exists.

**Acceptance criteria**

- **AC-AUTH-014-1**
  - **Given** an unknown email, or a known email with a wrong password
  - **When** `POST /api/v1/users/login` is called
  - **Then** the response is `401` with title `Invalid credentials` and detail "Invalid email or password", identical in both cases
- **AC-AUTH-014-2**
  - **Given** an unknown email
  - **When** login runs
  - **Then** a bcrypt comparison is still performed, against the dummy hash

### REQ-AUTH-015 — Successful login

Legacy ID: AUTH-15.

On success: deletes the user's existing refresh token if any, creates a new one, sets both cookies, responds `200 { data: { id, username, email, createdAt, deletedAt } }`.

**Acceptance criteria**

- **AC-AUTH-015-1**
  - **Given** valid credentials (email in any letter case, REQ-AUTH-032)
  - **When** `POST /api/v1/users/login` is called
  - **Then** the response is `200 { data: { id, username, email, createdAt, deletedAt } }` without `password`, both cookies are set, and the user has exactly one refresh token
- **AC-AUTH-015-2**
  - **Given** a login body with an invalid email, a password shorter than 5 characters or an unknown key
  - **When** it is submitted
  - **Then** the response is `422`

### REQ-AUTH-016 — Idempotent logout

Legacy ID: AUTH-16.

Logout is idempotent: it deletes the user's refresh token if one exists, clears both cookies (with the same options they were set with) and responds `204`, whether or not a refresh token existed.

**Acceptance criteria**

- **AC-AUTH-016-1**
  - **Given** an authenticated user with or without a refresh token
  - **When** `POST /api/v1/users/logout` is called
  - **Then** the response is `204`, both cookies are cleared with their original options, and the user has no refresh token

### REQ-AUTH-017 — Logout requires a valid access token

Legacy ID: AUTH-17.

Logout requires a valid access JWT. With an expired JWT the web client first refreshes and then retries (REQ-FE-009).

**Acceptance criteria**

- **AC-AUTH-017-1**
  - **Given** no `jwt` cookie, or an expired one
  - **When** `POST /api/v1/users/logout` is called
  - **Then** the response is `401` (REQ-AUTH-006, REQ-AUTH-007)

### REQ-AUTH-018 — Refresh without cookie

Legacy ID: AUTH-18.

`POST /api/v1/users/refresh`: missing `refresh` cookie → `401 Invalid token`.

**Acceptance criteria**

- **AC-AUTH-018-1**
  - **Given** no `refresh` cookie
  - **When** `POST /api/v1/users/refresh` is called
  - **Then** the response is `401` with title `Invalid token`

### REQ-AUTH-019 — Unknown, expired or orphaned refresh token

Legacy ID: AUTH-19.

`POST /api/v1/users/refresh`: unknown hash → `401 Invalid token`; expired (`expires_at < now`) → `401 Token expired`. The expired row is not deleted. A refresh token whose user is soft-deleted is treated as unknown → `401 Invalid token` (REQ-DATA-003), and no new tokens are issued.

**Acceptance criteria**

- **AC-AUTH-019-1**
  - **Given** a `refresh` cookie whose hash is not stored
  - **When** `POST /api/v1/users/refresh` is called
  - **Then** the response is `401` with title `Invalid token`
- **AC-AUTH-019-2**
  - **Given** a stored refresh token with `expires_at` in the past
  - **When** `POST /api/v1/users/refresh` is called with it
  - **Then** the response is `401` with title `Token expired` and the row still exists
- **AC-AUTH-019-3**
  - **Given** a stored, non-expired refresh token whose user is soft-deleted
  - **When** `POST /api/v1/users/refresh` is called with it
  - **Then** the response is `401` with title `Invalid token` and no cookies are set

### REQ-AUTH-020 — Successful refresh

Legacy ID: AUTH-20.

On success: deletes the used token, issues a new access JWT and refresh token, sets both cookies, responds `204`.

**Acceptance criteria**

- **AC-AUTH-020-1**
  - **Given** a valid, non-expired refresh token of a non-deleted user
  - **When** `POST /api/v1/users/refresh` is called
  - **Then** the response is `204`, new `jwt` and `refresh` cookies are set, and the used token's row no longer exists

### REQ-AUTH-021 — Current user

Legacy ID: AUTH-21.

`GET /api/v1/users/me` returns the JWT payload `{ id, username, email }` (from the token, not the DB) with status `200`, wrapped as `{ data: { id, username, email } }`.

**Acceptance criteria**

- **AC-AUTH-021-1**
  - **Given** a valid `jwt` cookie
  - **When** `GET /api/v1/users/me` is called
  - **Then** the response is `200 { data: { id, username, email } }` with the token's payload values

### REQ-AUTH-022 — Optional authentication middleware

Legacy ID: AUTH-22.

`AuthMiddleware.optionalAuth` is used by routes that are public but behave differently with a session (REQ-SURV-012). It never throws: no `jwt` cookie → anonymous; valid token → sets `req.user` and adds `userId` to the request logger, as in REQ-AUTH-009; expired token → anonymous with `req.sessionExpired = true`; malformed token or invalid signature → anonymous, logged at `warn`. The route decides whether an expired session matters.

**Acceptance criteria**

- **AC-AUTH-022-1**
  - **Given** a route using `optionalAuth` and no `jwt` cookie
  - **When** it is requested
  - **Then** the request continues anonymously (no `req.user`, no error)
- **AC-AUTH-022-2**
  - **Given** a valid `jwt` cookie
  - **When** the route is requested
  - **Then** `req.user` is set as in REQ-AUTH-009
- **AC-AUTH-022-3**
  - **Given** an expired `jwt` cookie
  - **When** the route is requested
  - **Then** the request continues anonymously with `req.sessionExpired = true`
- **AC-AUTH-022-4**
  - **Given** a malformed or badly signed `jwt` cookie
  - **When** the route is requested
  - **Then** the request continues anonymously and a `warn` log line is written

### REQ-AUTH-023 — Invitation token and status

Legacy ID: AUTH-23.

The invitation token is 32 random bytes (base64url). Only its SHA-256 hex hash is stored; the raw token is returned once, when the invitation is created. It is single use and expires **48 hours** after creation. Status is derived: `accepted` (`accepted_at` set), `revoked` (`revoked_at` set), `expired` (`expires_at <= now`), otherwise `pending`.

**Acceptance criteria**

- **AC-AUTH-023-1**
  - **Given** a created invitation
  - **When** its row and the create response are read
  - **Then** the response's `token` is 32 bytes in base64url, `token_hash` is its SHA-256 hex, the raw token is stored nowhere, and `expires_at` is 48 hours after `created_at`
- **AC-AUTH-023-2**
  - **Given** invitations with `accepted_at` set, with `revoked_at` set, with `expires_at <= now`, and none of these
  - **When** their status is derived
  - **Then** it is `accepted`, `revoked`, `expired` and `pending` respectively (checked in that order)
- **AC-AUTH-023-3**
  - **Given** an accepted invitation
  - **When** its token is used again
  - **Then** the response is the `404` of REQ-AUTH-027

### REQ-AUTH-024 — Create an invitation

Legacy ID: AUTH-24.

`POST /api/v1/invitations` — authenticated. Body `{ email }` (strict, valid email). Email of a non-deleted user → `409 Conflict` ("There is already an user with this email"). A pending invitation for the same email is revoked and replaced. Response `201 { data: { invitation: Invitation, token } }`.

**Acceptance criteria**

- **AC-AUTH-024-1**
  - **Given** an authenticated user and an email with no account
  - **When** `POST /api/v1/invitations` is called
  - **Then** the response is `201 { data: { invitation, token } }` with `invitation.status = "pending"` and `invitedBy` the caller
- **AC-AUTH-024-2**
  - **Given** an email used by a non-deleted user
  - **When** an invitation for it is created
  - **Then** the response is `409 Conflict` with detail "There is already an user with this email"
- **AC-AUTH-024-3**
  - **Given** a pending invitation for email E
  - **When** a new invitation for E is created
  - **Then** the previous one becomes `revoked` and only the new one is pending
- **AC-AUTH-024-4**
  - **Given** a body with an invalid email or an unknown key
  - **When** it is submitted
  - **Then** the response is `422`

### REQ-AUTH-025 — List invitations

Legacy ID: AUTH-25.

`GET /api/v1/invitations` — authenticated. All invitations, newest first: `200 { data: Invitation[], meta: { results } }`. `Invitation` = `{ id, email, status, invitedBy: { id, username } | null, createdAt, expiresAt, acceptedAt, revokedAt }`; the token and its hash are never returned. `invitedBy` is `null` when the inviter no longer exists or is soft-deleted (REQ-DATA-003).

**Acceptance criteria**

- **AC-AUTH-025-1**
  - **Given** several invitations
  - **When** `GET /api/v1/invitations` is called
  - **Then** the response is `200 { data, meta: { results } }` with every invitation, newest first, each with the `Invitation` fields and no token or hash
- **AC-AUTH-025-2**
  - **Given** an invitation whose inviter is soft-deleted
  - **When** `GET /api/v1/invitations` is called
  - **Then** that invitation's `invitedBy` is `null`

### REQ-AUTH-026 — Revoke an invitation

Legacy ID: AUTH-26.

`DELETE /api/v1/invitations/:id` — authenticated. Revokes a pending invitation (`revoked_at = now`) → `204`. An id that is not a UUID → `422` (REQ-API-034); unknown id → `404 Not found` ("The requested invitation doesn't exist"); an invitation that is not pending → `409 Conflict` ("This invitation is no longer pending").

**Acceptance criteria**

- **AC-AUTH-026-1**
  - **Given** a pending invitation
  - **When** `DELETE /api/v1/invitations/:id` is called
  - **Then** the response is `204` and its status becomes `revoked`
- **AC-AUTH-026-2**
  - **Given** an `:id` that is not a UUID
  - **When** it is deleted
  - **Then** the response is `422`
- **AC-AUTH-026-3**
  - **Given** a UUID with no invitation
  - **When** it is deleted
  - **Then** the response is `404 Not found` with detail "The requested invitation doesn't exist"
- **AC-AUTH-026-4**
  - **Given** an accepted, revoked or expired invitation
  - **When** it is deleted
  - **Then** the response is `409 Conflict` with detail "This invitation is no longer pending"

### REQ-AUTH-027 — Look up an invitation by token

Legacy ID: AUTH-27.

`GET /api/v1/invitations/token/:token` — public. A pending invitation → `200 { data: { email, expiresAt } }`. Unknown, expired, revoked or accepted → the same `404 Not found` ("This invitation is invalid or has expired").

**Acceptance criteria**

- **AC-AUTH-027-1**
  - **Given** the token of a pending invitation
  - **When** `GET /api/v1/invitations/token/:token` is called without a session
  - **Then** the response is `200 { data: { email, expiresAt } }`
- **AC-AUTH-027-2**
  - **Given** an unknown token, or the token of an expired, revoked or accepted invitation
  - **When** it is looked up
  - **Then** the response is the same `404 Not found` with detail "This invitation is invalid or has expired"

### REQ-AUTH-028 — Accept body and invalid token

Legacy ID: AUTH-28.

`POST /api/v1/invitations/token/:token/accept` — public. Body `{ username, password, passwordConfirm }` (strict, REQ-AUTH-011) → `422` on failure. Invalid token → the `404` of REQ-AUTH-027.

**Acceptance criteria**

- **AC-AUTH-028-1**
  - **Given** a pending invitation and an invalid body (REQ-AUTH-011, or an unknown key)
  - **When** it is accepted
  - **Then** the response is `422` and no user is created
- **AC-AUTH-028-2**
  - **Given** a valid body and an unknown, expired, revoked or accepted token
  - **When** it is accepted
  - **Then** the response is the `404` of REQ-AUTH-027

### REQ-AUTH-029 — Accepting creates the account and the session

Legacy ID: AUTH-29.

Accepting creates the user with the invitation's email, marks the invitation accepted in the same transaction, creates the refresh token, sets both cookies (REQ-AUTH-001) and responds `201 { data: { id, username, email, createdAt, deletedAt } }`. Username or email taken by a non-deleted user → `409 Conflict` (REQ-AUTH-010).

**Acceptance criteria**

- **AC-AUTH-029-1**
  - **Given** a pending invitation for email E and a valid body
  - **When** it is accepted
  - **Then** the response is `201 { data: { id, username, email: E, createdAt, deletedAt } }`, both cookies are set, the invitation's status is `accepted` and the user has a refresh token
- **AC-AUTH-029-2**
  - **Given** a username taken by a non-deleted user, or E now used by a non-deleted user
  - **When** the invitation is accepted
  - **Then** the response is `409 Conflict`, no user is created and the invitation stays pending

### REQ-AUTH-030 — Stricter limiter on public token routes

Legacy ID: AUTH-30.

The two public token routes use the stricter limiter of `/users` (REQ-API-021) in addition to the global one.

**Acceptance criteria**

- **AC-AUTH-030-1**
  - **Given** a client that has made 20 requests within a minute to the public invitation token routes
  - **When** it makes another one
  - **Then** the response is `429 Too many requests`

### REQ-AUTH-031 — `create-user` command

Legacy ID: AUTH-31.

First account: `pnpm create-user` in `apps/api` (`tsx src/scripts/createUser.ts`; `node dist/scripts/createUser.js` in a built image) asks for email, username and password (twice, not echoed), applies REQ-AUTH-010 and REQ-AUTH-011 and creates the user directly in the database. It prints to the console (CLI, REQ-API-033).

**Acceptance criteria**

- **AC-AUTH-031-1**
  - **Given** an email and username not used by a non-deleted user and a valid password entered twice
  - **When** `pnpm create-user` runs
  - **Then** the user is created with the email in lowercase and a bcrypt hash, and the user can log in
- **AC-AUTH-031-2**
  - **Given** an email or username used by a non-deleted user, or invalid data
  - **When** `pnpm create-user` runs
  - **Then** no user is created and the problem is printed to the console

### REQ-AUTH-032 — Emails are lowercased

Legacy ID: AUTH-32.

Every email that reaches the API (login, invitations, `create-user`) is converted to lowercase by the backend (`utils/email.ts`) before it is compared or stored, so the checks of REQ-AUTH-010 and the login ignore case. The database stores what the backend writes; it has no case-insensitive constraint or index.

**Acceptance criteria**

- **AC-AUTH-032-1**
  - **Given** a user with email `user@example.com`
  - **When** they log in with `User@Example.COM`
  - **Then** the login succeeds
- **AC-AUTH-032-2**
  - **Given** an invitation created for `New@Example.com`
  - **When** its row is read
  - **Then** the stored email is `new@example.com`, and an invitation for `NEW@example.com` after the account exists returns `409`

## Implementation phases

| Phase | Title | Status | REQ-IDs covered |
|---|---|---|---|
| PH-AUTH-1 | Existing implementation (migrated) | Done | REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-007, REQ-AUTH-008, REQ-AUTH-009, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-013, REQ-AUTH-014, REQ-AUTH-015, REQ-AUTH-016, REQ-AUTH-017, REQ-AUTH-018, REQ-AUTH-020, REQ-AUTH-021, REQ-AUTH-022, REQ-AUTH-023, REQ-AUTH-024, REQ-AUTH-026, REQ-AUTH-027, REQ-AUTH-028, REQ-AUTH-029, REQ-AUTH-030, REQ-AUTH-031, REQ-AUTH-032 |
| PH-AUTH-2 | Soft-deleted users in refresh and invitations | Planned | REQ-AUTH-019, REQ-AUTH-025, REQ-DATA-003 |
