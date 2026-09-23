# Deviations Registry

[← Back to index](MAIN.md) · Process: [00-sdd-process.md](00-sdd-process.md)

A **deviation** is any case where the code knowingly differs from the specs and
the owner has accepted it (workaround, technical limitation, partial
implementation, temporary shortcut). Planned-but-not-done work belongs in
[BACKLOG.md](BACKLOG.md), not here.

Rules:

1. Every deviation gets an entry here **and** a reference (`see DEV-xx`) in the
   affected spec section.
2. A deviation must never be introduced without the owner's explicit approval.
3. When the deviation is resolved, move its entry to *Resolved* with the date
   and the change that resolved it, and remove the references from the specs.

## Entry template

```md
### DEV-xx — <short title>
- **Date:** YYYY-MM-DD
- **Spec(s):** <requirement IDs and links>
- **Deviation:** what the code does instead of what the spec says
- **Reason:** why it was accepted
- **Approved by:** owner
- **Exit condition:** what must happen to remove it
```

## Active deviations

_None._

## Resolved deviations

_None._
