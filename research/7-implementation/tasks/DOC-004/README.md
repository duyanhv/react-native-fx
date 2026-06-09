Subtask: Ship effect components (blueprint Unit 1-surface / DOC-004)
- Contract anchors: `56` (Decision 4, Open questions), `52` (Open questions, export map), `55` (composition chain, curated effect presets), `54` (presence, separate component from effect render-targets), `50` (API layering), `decision-ledger` (SURF-002)
- Decision: ratify — the criterion for shipping effect components, then the V1 set that passes it today. Flip-trigger: a new effect in the curated catalog is drawn whole, standalone-useful, and its canonical API remains `<Fx effect="…">`.
- Reference (HOW): N/A — doc ratification.
- Guides: Writing Style Guide (prose), Contributing Guide (closure rule).
- Rules gate: #5 (fx is not a UI kit; only effects fx draws whole may ship as components). #2 (shape-native defaults; agnostic names).
- Device-verify: none — pure ratification.
- Done when: the criterion is recorded in `56` and `52`, the V1 set is named, SURF-002 is closed in `52`, and the tracker + notes are updated.

## Lifecycle checklist

- [x] spec'd
- [x] rules-gated
- [x] docs-closed
  - [x] `56` Decision 4 records the criterion
  - [x] `56` Decision 6 records the V1 set + DOC-003 reconciliation
  - [x] `56` Open question struck
  - [x] `52` Decision 12 records the V1 set
  - [x] `52` Open question struck
  - [x] `55` curated effect preset wording updated
- [x] ledger SURF-002 closed (true in `52`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

## Proof

- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `56` §Decisions (Decision 4 criterion, Decision 6 ratification), `52` §Decisions (Decision 12), `55` line 11, `decision-ledger` SURF-002 → `resolved`.

## Notes

See [notes.md](notes.md).
