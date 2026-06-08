# U2-002 notes

## Unverified claims

- None yet — this session only rewrites the task spec. The schema reconciliation and checks
  still need to run.

## What changed and why

- Rewrote the U2-002 task file so it follows the subtask protocol.
- Chose the rework direction: widen canonical `02` to include `boolean` and `color[]`, then
  manually update TypeScript manifest types to match.
- Corrected the old "TS types regenerate" language to "manually update" because blueprint
  Unit 2 says the TypeScript types are manually maintained alongside the manifest.
- Scoped the task to docs/types only: no selector changes, no codegen, no renderer work, and
  no public API expansion.

## Next: reconcile `02`, `data-layer.md`, and `packages/src/manifest/types.ts`; run headless checks; close SPINE-003.
