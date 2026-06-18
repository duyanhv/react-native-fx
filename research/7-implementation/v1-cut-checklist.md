# V1-cut checklist

The standing readiness record for the V1 cut. It states, in one place, what ships, which
ledger rows are disposed, the one remaining device gate, and every waiver and known
limitation taken honestly. Produced by the closeout sweep (DOC-022, 2026-06-13).

## Cut status

Units 1–9 (the native runtime + boundary) are built and merged; the surface API is **design-frozen
and named** (DEF-015; `react-native-fxkit`, the mechanical rename pending under DEF-016). After the
closeout sweep, **no V1-scoped ledger row is left `open`** — every remaining row is either `resolved`
or V2-deferred behind a named trigger.

> **Scope of this cut (corrected 2026-06-18).** This checklist measures the **runtime engine** (Units
> 1–9), not the JS public surface. The components and builders `1-surface/` + `6-ship/52 §Public exports`
> name as the V1 contract — `<Fx effect>`, `fx.effect.*`, `FxView`, `FxPressable`, `FxGroup`/`FxItem`,
> `EdgeGlow` — were design-frozen but never built (five of the eight contract symbols + the `fx.effect.*`
> builder are absent in code). The original `blueprint.md` scoped the surface out and delegated it to
> `1-surface/`; no unit decomposed it, so the engine shipped while the front door went untracked. The
> surface is now decomposed as **Phase S / Units 10–14** in `blueprint.md` and tracked in `progress.md`
> (all `todo`). The cut is an **engine milestone**; the product front door is separate, tracked, and unbuilt.

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
- **iOS shaders — the sim renders them (waiver premise corrected 2026-06-18).** The original
  waiver claimed the curated `[[stitchable]]` shaders do not render on the iOS simulator; that is
  false. The hosted-path catalog renders non-blank on the Apple-silicon sim — confirmed twice:
  DEF-014 (maintainer hosted-screen sim run, 2026-06-14 — aurora/plasma/caustics/liquid-chrome/
  noise-field/fractal-clouds/ink-smoke + gradient fill all draw) and DEF-017 (smoke harness, all
  10 `CURATED_SHADER_IDS`, variance ~680–5860 vs a 120 blank floor). The sim is a valid lane for
  non-blank / wiring / lifecycle checks; what stays hardware-only is real-device (A15) GPU render
  fidelity and scroll/thermal performance. Narrower caveat: the *interactive* `expo-view` shader
  path was observed blank on the sim in U8-002 (path-specific, not the hosted catalog).
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

- **The surface build (Units 10–14)** — the JS public front door, the real remaining work before
  publish (`blueprint.md` Phase S; `progress.md` Surface build). Start with Unit 10 (`<Fx effect>` +
  `EdgeGlow`), the unblocker for Units 11/12. None is spec'd yet.
- **DEF-016** — the pre-publish rename to `react-native-fxkit` + the `skills/` coexistence/parity
  story; fires after the surface is built and V2 is done.
- Remaining V2 / DEF-* triggers turn on as their named triggers fire. (DEF-014, the iOS-hosted
  `source` rung that opened V2, is merged.)
