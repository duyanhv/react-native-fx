Subtask: FxGroup morph scope (blueprint Unit 1-surface / DOC-006)
- Contract anchors: `57-content-primitives.md` (§FxGroup/FxItem, Open questions), `21-materials-and-glass.md` (§Glass morphing, Open questions), `decision-ledger.md` (SURF-006)
- Decision: ratify — the scope of cross-item morph in V1 is glass-only, iOS 26+, system-owned merge; Android and pre-26 iOS degrade to flat material. Flip-trigger: a new native primitive on iOS or Android supports cross-item morph for a non-glass effect.
- Reference (HOW): N/A — doc ratification.
- Guides: Writing Style Guide (prose), Contributing Guide (closure rule).
- Rules gate: #2 (shape-native defaults; agnostic names; iOS default = Liquid Glass morph, Android = no morph, flat material fallback), #9 (FxGroup morph is a native visual effect between hosted glass views; does not write Yoga layout or animate flow layout).
- Device-verify: none — pure ratification.
- Done when: the morph scope is recorded in `57` and `21`, the merge-threshold contract is deferred to V2, SURF-006 is closed in `57`/`21`, and the tracker + notes are updated.

## Lifecycle checklist

- [x] spec'd
- [x] rules-gated
- [x] docs-closed
  - [x] `57` — Decision records glass-only morph scope, iOS 26+ / system-owned merge, Android flat fallback
  - [x] `57` — Open question struck / resolved
  - [x] `21` — Decision records glass-morph as the only V1 compound effect
  - [x] `21` — Open question struck / resolved
  - [x] `data-layer.md` §10 reconciled to ratified wording
- [x] ledger SURF-006 closed (true in `57`/`21`)
- [ ] reviewed (maintainer)
- [ ] merged (maintainer)

## Proof

- headless: N/A — docs-only.
- device: N/A — ratification task.
- docs: `57` §Decisions (new decision), `57` §Open questions; `21` §Decisions (new decision), `21` §Open questions; `data-layer.md` §10; `decision-ledger.md` SURF-006 → `resolved`.

## Notes

See [notes.md](notes.md).
