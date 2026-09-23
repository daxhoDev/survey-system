# 00 — SDD Process

[← Back to index](MAIN.md)

This document defines how any change (feature, fix, refactor, dependency bump,
config change, documentation change) is carried out. It is mandatory for humans
and agents alike.

## 1. Principles

- **PROC-01** The specs in `docs/sdd/` are the primary source of truth. If code,
  README, OpenAPI or comments disagree with a spec, the spec is right until the
  owner decides otherwise.
- **PROC-02** Agents never make decisions on their own. Every decision (design,
  behavior, naming, status codes, dependencies, file layout, scope) is analyzed,
  presented to the owner as options with a recommendation, and only acted upon
  after explicit approval. Agents must ask every pertinent question so that no
  ambiguity is resolved by the agent.
- **PROC-03** Specs are always synchronized. A change is not finished until
  every place that mentions the affected behavior is updated: the relevant
  specs, cross-references, [BACKLOG.md](BACKLOG.md), [DEVIATIONS.md](DEVIATIONS.md),
  the root [`README.md`](../../README.md), `AGENTS.md`, and the OpenAPI registry
  (`apps/api/src/lib/openapi.ts`) when API contracts are involved.
- **PROC-04** There is a single README, at the repository root. It is written for
  visitors of the repository. Sub-projects do not have their own README.

## 2. Workflow for any change

1. **Read** [MAIN.md](MAIN.md) and every spec related to the change.
2. **Check** [BACKLOG.md](BACKLOG.md) and [DEVIATIONS.md](DEVIATIONS.md) for
   related items.
3. **Analyze** the change against the specs. Identify every question and every
   decision it requires.
4. **Consult** the owner: present options, trade-offs and a recommendation.
   Wait for explicit decisions. Do not proceed on assumptions.
5. **Update the specs first** so they describe the approved target behavior
   (new/changed requirement IDs, status tags `[pending: BL-xx]`).
6. **Implement** the change in code, with its tests (DEV-WF-06).
7. **Synchronize** everything that mentions it (see PROC-03). Flip status tags
   to `[implemented]` and close/remove the backlog item.
8. **Record deviations**: if the implementation cannot or does not fully match
   the spec, add an entry in [DEVIATIONS.md](DEVIATIONS.md) and reference it
   from the affected spec section.

## 3. Status tags

| Tag | Meaning | Required action |
|-----|---------|-----------------|
| `[implemented]` | Code satisfies the requirement | Keep it true on every change |
| `[pending: BL-xx]` | Approved, not implemented | Implement via the backlog item |
| `[open: OQ-xx]` | Undecided | Ask the owner before implementing anything that touches it |

## 4. Backlog vs deviations

- **Backlog (`BL-xx`)** — work that the owner has decided on but that is not yet
  in the code. Created when a spec changes ahead of the code.
- **Open questions (`OQ-xx`)** — live in [BACKLOG.md](BACKLOG.md). Problems or
  ambiguities detected that still need an owner decision. When decided, an OQ
  becomes spec text plus (usually) a BL item.
- **Deviations (`DEV-xx`)** — cases where the code knowingly differs from the
  spec *and the owner accepted it* (temporary workaround, technical limitation,
  partial implementation). Each deviation states why, its scope, and the exit
  condition. Deviations must also be mentioned in the affected spec.

## 5. Writing specs

- English, concise, normative (`must`, `must not`, `may`).
- One requirement per ID; IDs are never reused or renumbered. Deleted
  requirements are marked `~~removed~~` with a short reason.
- Code references use repository-relative paths.
- New spec files must be added to the index in [MAIN.md](MAIN.md) and must link
  back to it.
