# DOC-004 notes

## Unverified claims

- None — this is a pure ratification task with no device or headless claims.

## Changes made

- `research/1-surface/56-platform-behavior-presets.md`
  - Replaced Decision 4 with the criterion for shipping effect components (drawn whole, standalone-useful, canonical API remains `<Fx effect="…">`). Named `EdgeGlow` as the V1 component; `MeshGradient` as a fill reached via `<Fx>`.
  - Added Decision 6: ratified the V1 set (`EdgeGlow` only), reconciled with DOC-003/SPINE-001 (core package, not `@react-native-fx/lab`).
  - Struck the open question "Ship the named effect-component sugar?" and resolved it.
- `research/6-ship/52-standards-and-publishing.md`
  - Added Decision 12: ratified the same criterion and V1 set in the ship plane.
  - Updated the export-map code comment to reflect `EdgeGlow` only, `MeshGradient` as fill.
  - Struck the open question about `surface/` exports and resolved it (pinned the component set).
- `research/1-surface/55-composition-chain.md`
  - Line 11: updated "curated effect presets (`EdgeGlow`, `MeshGradient`" → "curated effect preset component (`EdgeGlow`" to match the ratified set.
- `research/7-implementation/decision-ledger.md`
  - SURF-002 row: flipped `open` → `resolved`, recorded the close condition in `56` and `52`.
- `research/7-implementation/progress.md`
  - DOC-004 row: `state` → `ready-to-merge`; added detail block with checklist and proof.

## Next

Wait for maintainer review and merge.
