# Session handoff — 2026-06-11 (resume here)

Planner/Reviewer session. V1 implementation is fully landed; the F1–F19 critique is
triaged and its first task (U3-008) is done. This file is the pickup list — read it,
then `progress.md`.

## Where things stand

- Everything through `64fb1e7` is committed on `integration/0.1.x`; the working tree is
  clean. This session: U3-002 glass closed end-to-end, U3-007 `replaceWith` fixed, U3-003
  Android material landed, the sweep docs retired, the critique triaged
  (`research/wip/critique-2026-06-10.md` §Triage has every disposition), U3-008 done.

## Pick up here (in order)

1. **Ratify U3-008** (30-second check; the sim + Metro may still be running): symbol
   screen → `variableColor` + `repeat` → flip replace-with mid-animation → it keeps
   animating, no blank flash; then drag a shader intensity slider → no flash, no restart.
   On pass: tick `device-verified` on the U3-008 row, commit.
2. ~~**`npm login`** … publish the `react-native-fx` placeholder — critique F15.~~ **Done
   2026-06-11**, with a twist: the unscoped name is unclaimable (npm's typosquat filter
   rejects it as too close to `react-native-fs`). Claimed `react-native-fxkit@0.0.1` as the
   placeholder instead (`@duyanhv` scope was declined; `@metainnotech` org route skipped).
   The product/repo-vs-package name reconciliation is now routed to DEF-015 (decide) and
   DEF-016 (apply before the real release); `packages/package.json` still names the
   unpublishable `react-native-fx`. F15 triage row updated.
3. **Dispatch the next critique batch** (the planner agent proposes these in parallel —
   disjoint files):
   - **U4-003** — lazy Metal in `FxSurfaceView` + shared static device/queue/pipeline
     cache (F2 + F11's sharing half).
   - **Docs batch DOC-016..020** — F19 contributor path, F4 Android-hosted spine
     reconciliation, F5+F12 presence boundary + `sheet`/`modal` naming + React-semantics
     rows in `35`, F8 defer `tune`, F18 event-name mapping.
4. Then **U2-003** (manifest data + typed config + conformance + cadence — the medium
   one) and the small remainder: **U1-006** (pull `FxGroupView` from the index),
   **EX-002** (100-cell stress screen).

## Standing hardware gates (no action until a device appears)

- **POCO F1 / any Android 12+** → U3-003 B1 scenario (`tasks/U3-003/evidence/headless.md`;
  APK prebuilt at `example/android/app/build/outputs/apk/debug/app-debug.apk`).
- **iOS 17 / sub-17 device** → U3-007 A1-2 degradation rows (maintainer chose not to
  waive).
- Android TalkBack proof for the U3-008 a11y default rides the next Android session.

## Open items worth remembering

- Interactive glass is invisible to VoiceOver (a bare `UIVisualEffectView` exposes no AX
  element — true before and after U3-008); owned by the interactive-surface work, pinned
  in `structure.ios.md`.
- Maintainer `merged` ticks are pending on the closed tasks (U3-002 docs-closed, etc.).
- Deferred-with-trigger rows from the critique: DEF-014 (scrollTransition, first V1.x),
  DEF-015 (naming review at surface freeze), DEF-016 (pre-publish coexistence/parity
  matrix), DEF-017 (CI smoke lane).
