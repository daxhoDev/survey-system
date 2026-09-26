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
| BL-02 | **Dockerfile / containerized deployment** (design agreed 2026-09-23, specified with the change): not built yet. Must install pnpm, handle the workspace (`packages/schemas`), not bake `.env` into the image, fix `CMD`, pin Node version. Design to be agreed. | DEV-WF-03, ANS-07 |
| BL-03 | **Invitation-based account creation flow** replacing public `POST /users/signup`, plus its UI (design agreed 2026-09-23, specified with the change). API, `create-user` command and generated web client done 2026-09-26 (AUTH-13, AUTH-23…31); **pending: the web UI** (invitations page, acceptance page, header button). | FE-14, FE-16, FE-27, FE-28 |

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
