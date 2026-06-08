# U2-002 notes

## Unverified claims

None — headless rework.

## What changed and why

- Rewrote the U2-002 task file so it follows the subtask protocol.
- Chose the rework direction: widen canonical `02` to include `boolean` and `color[]`, then
  manually update TypeScript manifest types to match.
- Corrected the old "TS types regenerate" language to "manually update" because blueprint
  Unit 2 says the TypeScript types are manually maintained alongside the manifest.
- Scoped the task to docs/types only: no selector changes, no codegen, no renderer work, and
  no public API expansion.

- **Reconciled UniformSpec (2026-06-08):**
  - Widened `02` UniformSpec.type to include `boolean` and `color[]` (line 102).
  - Widened `packages/src/manifest/types.ts` UniformSpec.type to match.
  - Removed `[provisional]` mismatch note from `data-layer.md` §1 — the extension is now
    canonical.
  - Resolved SPINE-003 in decision-ledger.md.
  - U2-002 → ready-to-merge in progress.md.
  - Headless checks all green: tsc, build, biome, jest (18 tests pass).

## Next: reviewed + merged (human gates)
