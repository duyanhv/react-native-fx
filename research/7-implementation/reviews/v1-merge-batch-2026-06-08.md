# V1 merge-batch review — 2026-06-08

Consolidated `reviewed`-gate sign-off for the V1 tasks whose work is complete and committed on
`integration/0.1.x` but whose `reviewed` gate had not been recorded. One artifact instead of nine
per-task files, because this is a housekeeping sweep over already-verified work; the per-task detail
blocks in `progress.md` carry the proof. `U1-001.md`, `U3-001.md`, and `DOC-007.md` keep their own files.

Review depth here is the **merge bar** (Contributing Guide), not a re-review of code already verified at
task time: confirm every `Closes:` row is `resolved` in its owning source doc (the cardinal rule), the
work is committed, and the remaining gates are genuinely met.

## Closure-chain verification

Every `Closes:` row below was confirmed `resolved` in `decision-ledger.md`, and each task's branch is
merged into `integration/0.1.x`.

| Task | Type | Closes | Closes resolved? | Other gates | Verdict |
|------|------|--------|------------------|-------------|---------|
| U1-002 | implement | — | n/a | headless green (tsc/build/lint/swift); `51`/`architecture`/`data-layer` reconciled | **approve** |
| U1-003 | device-verify | SURF-010, RT-010, RT-011, RT-004 | ✓ all resolved | 4 scenarios pass iOS+Android; docs-closed | **approve** |
| U1-004 | implement | SHIP-003 | ✓ | CI 4 jobs green; `apple.podspecPath` recorded; docs-closed | **approve** |
| U1-005 | implement | — | n/a | Android lib build-ready; CI android-autolink green | **approve** |
| U2-001 | implement | SPINE-013 | ✓ | 17 Jest tests; `02` updated; docs-closed | **approve** |
| U2-002 | rework | SPINE-003 | ✓ | `02` widened; `data-layer` note removed; docs-closed | **approve** |
| DOC-001 | doc-cleanup | SURF-001, SURF-009 | ✓ | `GlassView` dropped from `56`; `SpringTune` from `55` | **approve** |
| DOC-007 | ratify | FX-001, FX-004 | ✓ | mesh + 10-id catalog in `20`/`22`/`50`; 5-implemented claim matches `catalog.ts`/`FxShaders.metal`; gap tracked by U3-006 | **approve** (full verdict: `reviews/DOC-007.md`) |
| DOC-008 | ratify | FX-009 | ✓ | `symbol` iOS-only V1 via `.symbolEffect` recorded in `24` + `structure.android`; Android AVD/Lottie planned/deferred, non-selectable (`{via:'none'}`); iOS impl → U3-007 | **approve** |

## Notes carried forward (not blocking)

- The lint-format commit `98c41d7` reformatted `select.ts`/`types.ts`/`index.ts` (U2-001/U2-002 files) —
  cosmetic only; substance unaffected. It also corrected the earlier invalid local lint checks (`bunx
  biome` had resolved to the unrelated `biome@0.3.3`; the real gate is `@biomejs/biome@2.4.16`).
- **DOC-007 watch-items** (from the standalone review): keep "V1 catalog (10)" vs "V1 shipped (5)"
  distinct — the 10-id claim is contingent on U3-006 landing in V1; and `edge-glow` as a shader id must
  stay consistent with DOC-004's ship-as-component decision. Watch-items for U3-006 / DOC-004, not
  defects in DOC-007.

## Verdict

All nine **approved**. With `reviewed` cleared and the work committed on `integration/0.1.x`, each
advances to `merged` per the D1 convention (`merged` = complete + finishing commit in). U1-001 is the
sole V1 hold-out — it stays `docs-pending`, correctly blocked on REAL-002 (device, U3-005).
