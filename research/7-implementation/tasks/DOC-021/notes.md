# DOC-021 — notes

State: `spec'd` (not yet registered in `progress.md` — held until go-ahead). Type: `ratify`. Device: no.

## Current

Spec authored (`README.md`). The promotion has NOT run — it is gated on the human's final read of
the three promoted WIP docs (classifier + the two Lane 1 docs). This task sits at `spec'd`; nothing canonical or ledgered has been touched.

## What this ratify does on go-ahead

- Promote the classifier vocabulary (Boundary A/B/L, substrate-depth axis, source-channel axis,
  sorting rule, nine-question classifier) → `0-spine/02`, `/04`, `/05`.
- Promote the Lane 1 contract / guardrail (track→settle grammar, operator inventory, preset-first
  surface, `onFxSignalEvent` split, the handoff rule, the override policy) → `3-motion/40`, `/41`,
  `/42`; `4-runtime/34`, `/35`. Refines `MOT-006` (the `source` driver).
- Update `MOT-007` (regime C) to name the Lane 1 falsifying test as its gate; status stays
  `deferred`.
- Open new ledger rows: the boundary taxonomy (`resolved` on record); the Lane 1 mechanics by
  kind — handoff concurrency (`device-pending`), operator-inventory sufficiency (`open`; device +
  API), per-preset override interfaces (`open`; design/API).
- Leave the flow draft and the Lane 1 mechanics WIP / device-pending.

## Unverified claims / to confirm at execution

- Exact section placement within `02`/`04`/`05` and `40`/`41`/`42`/`34`/`35` — the classifier may
  warrant its own spine sub-section rather than folding into `04`.
- Exact new ledger row ids (SPINE / MOT / RT numbering) — assigned at execution; named by content
  in the spec to avoid colliding with rows not yet enumerated here.
- Whether the boundary taxonomy is one `0-spine` row or split across `02`/`04`/`05`.

## Next

Human final read of `research/wip/{capability-boundary-classifier, lane1-signal-grammar,
lane1-declarative-surface}.md` → then execute the promotion + ledger changes, and register DOC-021
in `progress.md` at that point (held here per the build-plan-encoding deferral).
