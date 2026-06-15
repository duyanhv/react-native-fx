# DOC-003 session notes

## Unverified claims

None — docs-only ratification task.

## Changes made

- `research/0-spine/00-thesis-and-personas.md`
  - Added **Decision #6** (curation/BYO threshold): the 10 curated shader ids + ratified preset/feedback/effect vocabularies are the V1 curated set; BYO is the `shader` node with developer-supplied assets; compiler deferred.
  - Struck through the "Where curation ends and BYO begins" open question and marked it resolved (SPINE-001; DOC-003).
  - Struck through the "Palettes/themes as a shareable artifact" open question and marked it resolved (SPINE-002; DOC-003), referencing `52` Decision #11.

- `research/6-ship/52-standards-and-publishing.md`
  - Added **Decision #11** (palettes/themes as artifact deferred to V2). Pure-config palettes resolve in JS within the core package; a distribution surface would live in `@react-native-fx/lab` if demand justifies the split.

- `research/1-surface/50-api-and-presets.md`
  - Struck through the "Theme distribution" open question and marked it resolved (SPINE-002; DOC-003), referencing `52` Decision #11.

- `research/7-implementation/decision-ledger.md`
  - Flipped **SPINE-001** from `open` → `resolved` with close condition text citing `00` Decision #6.
  - Flipped **SPINE-002** from `open` → `resolved` with close condition text citing `52` Decision #11 and `50` propagation.

- `research/7-implementation/progress.md`
  - Updated DOC-003 row state from `todo` → `ready-to-merge`.
  - Added detail block with checklist and proof.

## Next

Human review of the ratified decisions (SPINE-001/SPINE-002) before merge.
