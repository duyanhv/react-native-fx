# V1-cut checklist

The standing readiness record for the V1 cut. It states, in one place, what ships, which
ledger rows are disposed, the one remaining device gate, and every waiver and known
limitation taken honestly. Produced by the closeout sweep (DOC-022, 2026-06-13).

## Cut status

Units 1–9 are built and merged; the surface is frozen (DEF-015) and named (`react-native-fxkit`,
the mechanical rename pending under DEF-016). After the closeout sweep, **no V1-scoped ledger
row is left `open`** — every remaining row is either `resolved` or V2-deferred behind a named
trigger.

## Ledger dispositions (closeout)

| Row | Disposition | Where |
|---|---|---|
| RT-012 | Resolved — V1 stays presence-specific; generalization → DEF-012 (V2) | `35` §Resolved |
| RT-003 | Resolved by citation — shared singleton (U4-003/EX-002), fresh-drawable-on-resume (U3-008), continuous-while-active is cheap (RT-006/U8-001) | `31` §Resolved |
| SPINE-009 | Resolved — the `05` falsification test passes device-proven-by-citation | `35` §Resolved (U9-002) |

The two genuinely-`open` rows that remain are **not V1 blockers**: MOT-002 (`tune` vocabulary —
deferred from the V1 surface, DOC-019) and MOT-008 (BYO intro/outro envelope declaration — V2
via DEF-007). Every other non-resolved row is `deferred` with a named trigger.

## The one remaining device gate

- **U3-007 — iOS `symbol` OS-degradation rows (A1-2): WAIVED for the cut (maintainer, 2026-06-13).**
  The A1-1 `replaceWith` behavior was device-evidenced and maintainer-ratified (2026-06-10);
  only the cross-OS-degradation *visual* rows stay unverified — they need a real iOS 17 / sub-17
  device. Accepted unverified for V1; revisit if a sub-17 device becomes available.

## Waivers (taken explicitly)

- **U8-002 per-platform-redundant rows.** The Android pager + raw RNGH-`Pan` hand-rows and the
  iOS hard-case rows are not re-run — the same recognizer mechanism is already device-proven on
  the other platform (RT-001 closed with these waivers documented; maintainer's close-bar call).
- **iOS shaders need a physical iPhone for visual proof.** The curated `[[stitchable]]` shaders
  do not render on the iOS simulator — the sim verifies wiring/touch/lifecycle, not pixels. iOS
  shader *visual* ratification runs on hardware only.
- **U3-008 accessibility residuals.** Interactive-glass VoiceOver reachability and the literal
  TalkBack screen-reader demo are noted residuals (need AX-/TalkBack-equipped devices); merged
  with the residual on record.

## Known V1 limitations (honest degradation)

- **Android `expo-view` interactive-shader rendering is a documented V1 gap.** The interactive
  Android renderer (`FxSurfaceView.kt`) is a deferred TODO (EX-002 finding) — interactive shader
  cells render blank on Android in V1. This is a scoped deferral, not a defect; the hosted
  decorative path and content-motion path are unaffected. `skills/` must state the per-capability
  parity honestly (DEF-016 / critique F13).

## Bookkeeping completed in the closeout

The stale merge-tick batch was flipped to `merged` against its in-tree finishing commits
(maintainer, 2026-06-13): DOC-006 `d3f8b4c`, DOC-009 `3163c5d`, DOC-011 `fd5ed75`, DOC-012
`5c98519`, U3-004 `3a5e9e1`, U9-001/U9-002 `835d546`, U3-002 `48fa26b` (the non-legend
`docs-closed` cell normalized), U3-007 `118cae2`/`33c7f98` (with the A1-2 waiver). U8-002
`9a874ea` and U8-003 `f9af1bc` were ticked earlier in the same cut.

## Publishing waits for V2

**There is no V1 npm publish.** The package publishes only once V2 is done (maintainer,
2026-06-14). So the V1 cut is a *code/docs* milestone, not a release — `react-native-fxkit`
stays a placeholder and `packages/package.json` keeps the `react-native-fx` name until then.
DEF-016 (the mechanical rename + the `skills/` coexistence/parity story) does **not** run at
V1; it fires at the pre-publish moment, which is now after V2.

## What comes next (post-V1 cut)

- **V2 work** — the deferred units / DEF-* triggers that V2 turns on (publishing rides on V2
  completion).
- **DEF-014** — the iOS-hosted `source` rung, slated as the first V1.x task (not a V1 blocker).
- **DEF-016** — deferred to the pre-publish moment (after V2): the rename to `react-native-fxkit`
  + the parity story in `skills/`.
