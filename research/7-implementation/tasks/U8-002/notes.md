# U8-002 — notes

## Unverified claims (need the device matrix — maintainer)

- The cancel path itself: one native `.cancelled` (iOS) / one `ACTION_CANCEL` (Android),
  spring-back rendered, NO `onShaderPress` on any cancelled gesture — across groups 1b, 2, 3, 4.
- The `@gorhom/bottom-sheet` RNGH-pan "hard case" cancels cleanly (group 3).
- The pager horizontal claim cancels and changes page (group 2).
- The nesting outcome (group 7): which surface enters — INNER alone or both. Observed on
  device; the planner decides the policy from what the log shows.
- That `passive` (group 5) and `controlled` (group 6) truly stay semantically silent on hardware.

## Recognizer-bug flags

- **FLAG 1 (BLOCKER, device run 2026-06-13): Android — coexistence screen crashes the app
  process on mount.** Native SIGABRT (CheckJNI hard-abort, no Java RedBox) in **`packages/`**:
  `FxSurfaceView.applyResolvedConfig → updateEffectSurfaceVisibility →
  FxSurfaceShaderView.setShaderId → probeInteractiveUniforms → supportsFloatUniform →
  RuntimeShader.setFloatUniform(<corrupt name>) → NewStringUTF(invalid UTF-8) → JniAbort`.
  Abort msg: `unable to find uniform named \20|\333\313\177` (corrupt bytes) passed to AGSL's
  exception builder. `probeInteractiveUniforms` probes uniform existence by catching
  `setFloatUniform`'s "unable to find uniform named <name>" throw, but the name handed in is
  garbage, so the debug-build JNI aborts. **This is a U8-001 rework — NOT patched here**
  (recognizer is frozen; rule honored). 100% reproducible (5/5). Full tombstone:
  `evidence/android-crash-tombstone.txt`; analysis: `evidence/device.md` → Recognizer-bug flags.
  iOS (Metal, no `RuntimeShader`) is unaffected. The Android matrix cannot run until this is
  fixed; RT-001 stays open.
- **Observation (separate, not RT-001):** iOS shader surfaces are interactive but draw no
  visible pixels (blank/grey) — likely a Metal-path rendering issue. Did not block the iOS
  interaction rows but made coordinate targeting harder and row 7 inconclusive. Flagged for a
  maintainer look, out of scope here.

## Device run log (agent-device, 2026-06-13)

- Built the dev client myself: `bun install`; `expo prebuild --clean` (both platforms, CocoaPods
  OK); `expo start -c` (clean Metro). Android `expo run:android` first failed on a stale CMake
  `.cxx` cache (worklets `.so` hash rotation) — fixed by clearing
  `node_modules/{expo-modules-core,react-native-worklets}/android/{.cxx,build}` +
  `android/app/{.cxx,build}` and rebuilding (build hygiene, not a version change); second build
  SUCCEEDED + installed on POCO F1. iOS `expo run:ios` built + installed on iPhone 17 Pro sim.
- **Android: BLOCKED** — see FLAG 1. Could not score any matrix row (crash precedes any gesture).
- **iOS: 6 rows scored from the live semantic log** — 1a PASS (tap→Press), 1b PASS (h-drag→
  cancel: PressIn/PressOut, no Press), 2a PASS (pager tap→Press), 2b PASS-cancel (pager swipe→
  PressIn/PressOut no Press; page-advance unconfirmed — invisible surfaces), 5 PASS (passive
  silent), 6 PASS (controlled silent).
- **iOS rows needs-manual (NOT faked):** 1c (hold-still), 1d (vertical page drag), 3a/3b
  (bottom-sheet), 4/4-tap (RNGH pan), 7 (nested, inconclusive per runbook — inner not visibly
  present). Reason: surfaces invisible on iOS → blind-coordinate targeting of pager/sheet/RNGH/
  nested is not faithful enough to score honestly; the cancel path is already shown on 2
  independent ancestors (1b, 2b). Maintainer to run these by hand at the re-gate.
- Dev clients left installed on both devices; `example/ios` + `example/android` regenerated and
  left in place for the maintainer's hand re-run. Metro left running (clean cache).
- Did NOT tick device-verified/reviewed/merged, did NOT change `progress.md` state, did NOT
  close RT-001. `packages/` untouched (`git status` clean under `packages/`).

## Changes

- `example/package.json` + `example/bun.lock` — added `react-native-gesture-handler` (2.31.2),
  `react-native-reanimated` (4.3.1), `react-native-worklets` (0.8.3), `react-native-pager-view`
  (8.0.1), `@gorhom/bottom-sheet` (5.2.14) via `expo install` (SDK-56 pins). Worklets pinned to
  0.8.3 to match reanimated 4.3.1 / expo-modules-core (the pre-existing 0.9.1 resolution tripped
  a peer warning).
- `example/babel.config.js` — added `react-native-worklets/plugin` (Reanimated 4 plugin path).
- `example/app/_layout.tsx` — wrapped the root in `GestureHandlerRootView` (flex: 1, outermost).
- `example/screens/coexistence.tsx` — new screen: a fixed timestamped semantic-press log over a
  scroll of seven sections, one `active` (or `passive`/`controlled`) `FxSurfaceView` per matrix
  group; a `@gorhom/bottom-sheet` overlay for group 3; an RNGH `Gesture.Pan().runOnJS(true)` that
  logs activation for group 4. Library stays RNGH-free — peers are example-only (rule #7).
- `example/data/tasks.ts` — `coexistence` added to `DemoScreen`; `U8-002` row added to `TASKS`.
- `example/app/(tasks)/[taskId].tsx` — `coexistence` case wired to `CoexistenceScreen`.
- `research/.../tasks/U8-002/README.md` — ticked implemented / commented / headless-done.
- `research/.../tasks/U8-002/evidence/headless.md` — proof commands, file/version manifest, the
  group→section→gesture map, and device-build caveats.

## Verification

- `example/` `bunx tsc --noEmit` → 0.
- `packages/` `tsc` / `build` / `lint` / `swift:lint` → all 0; `git status` clean under `packages/`.

Next: planner reviews the harness, writes the seven-group device runbook (`evidence/device.md`),
and hands the matrix to the maintainer; do NOT close RT-001 until the device PASS.

Next (post device run, 2026-06-13): **U8-001 owner fixes the Android AGSL crash (FLAG 1) — the
recognizer is frozen, so this re-opens as a U8-001 rework; do not patch in U8-002.** After the
fix, re-gate: Android full matrix + the iOS needs-manual rows by hand. Then the planner closes
RT-001. `packages/` was not touched in this run.

## Planner review — device run (2026-06-13)

- **Harness review: approved at headless-done** (freeze verified independently — `git status`
  clean under `packages/`; all 7 groups present + observable; gates re-run green; comments clean).
- **Verdict:** the harness did its job — it surfaced a real latent Android crash U8-001's
  API-35 gate missed. iOS scoring is honest (cancel path on two ancestors; remaining rows left
  needs-manual, not faked).
- **Root-cause correction to FLAG 1 (point a):** there is NO corrupt/uninitialised uniform-name
  string in our Kotlin — we pass the clean literal `"pressDepth"`/`"touch"`. The garbage bytes
  in the abort are AGSL's OWN error-message construction inside `RuntimeShader.nativeUpdateUniforms`
  on API 33. The actionable defect is solely point (b): the exception-probe. Confirmed —
  `aurora.agsl` declares only time/resolution/intensity; only `dots.agsl` declares pressDepth/touch.
  The fix must NOT hunt a phantom string bug.
- **iOS "invisible surfaces": almost certainly the simulator**, not a regression — the curated
  `[[stitchable]]` Metal shaders are always ratified on a physical iPhone; the sim doesn't render
  them. Press events fired on the invisible-but-present views. Isolation if doubted: does
  `shader-catalog` render on this same sim build? (Expected: no.)
- **Routed to [U8-003](../U8-003/)** (rework — source-declaration scan, maintainer-chosen).
  U8-002 → `blocked` by U8-003 for the Android half; the iOS remainder (1c/1d/3/4/7 + nesting)
  needs a physical iPhone. RT-001 closes at U8-002 after the Android matrix re-runs.

## Android matrix run log — agent-device runner, 2026-06-13 (after U8-003 crash fix)

- **Android matrix now runs** (the U8-003 fix unblocked the mount). Ran on the POCO F1, now
  **API 35** (re-flashed off the prior run's API 33 — the U8-003 API-33 *crash* proof is still
  owed; see `../U8-003/evidence/device.md`). The cancel recognizer is API-independent.
- **Result: 9 PASS · 3 needs-manual · 1 inconclusive.**
  - PASS: 1a, 1b (cancel), 1d (cancel), 2a, **3a (cancel — @gorhom RNGH-pan hard case)**, 3b,
    4-tap, 5 (silent), 6 (silent).
  - **Cancel path proven on 3 independent ancestors:** 1b (inner h-scroll), 1d (outer v-scroll),
    3a (bottom-sheet RNGH pan) — `PressIn → PressOut`, no `Press`, ancestor moves.
  - needs-manual: **1c** (longpress can't hold still — drifts/no-register), **2b** (pager claims
    before `PressIn`; surface silent but cancel signature uncaptured), **4** (`rngh-pan ·
    ACTIVATED` never logged under heavy frame loss — surface-cancel seen, RNGH-pan claim
    unconfirmed; mechanism proven by 3a).
  - inconclusive: **7** (center tap → `nested·OUTER` only; INNER never logged, both `aurora` so
    INNER presence unconfirmable — inconclusive per the runbook rule).
- **Method:** surfaces absent from the AX tree → targeted by coordinate, judged from the
  semantic-press log read per-gesture from screenshots (`evidence/screenshots/row*-android.png`).
  `gesture pan` posts `PressIn`+cancel for scroller ancestors; not for the pager / RNGH-`Pan`.
- **The frozen recognizer was observed, not changed.** No `packages/` or `example/` source edit
  (device-runner role). `git status --porcelain packages/ example/screens example/app` clean.
- **RT-001 still open** — owed: the 4 hand rows on Android, the iOS remainder on a physical
  iPhone, and the U8-003 API-33 mount. Did not change task state or close any row.

Next: maintainer runs the 4 needs-manual/inconclusive Android rows by hand + the iOS remainder on a physical iPhone; RT-001 closes here on a full pass.

## Device run log — agent-device runner, 2026-06-13 (API-33 AVD, row-7 re-observation)

Re-observed row 7 on an API-33 AVD (`fx_api33`, Android 13) with the nested INNER set to `dots`
(a one-line example tweak — see `../U8-003/`). Device-runner role: owned no tick, closed no row,
did not change `progress.md` or the matrix scores.

- **Row 7 — inner=`dots`, outer=`aurora`.** The inner `dots` is **not visibly present** — it is
  occluded by the outer's shader (FxSurfaceView adds the effect view above its content container),
  so the nested surface renders as full-width `aurora` bands, no `dots` grid
  (`screenshots/row7-api33-inner-occluded.png`). The served Metro bundle does carry `shader: "dots"`
  on the inner, so this is native compositing, not a JS miss. Touch: press-hold at the inner centre
  → `nested·OUTER PressIn → PressOut` (local ~190,1xx; `screenshots/row7-api33-inner-press.png`);
  outer-ring tap (local x=3) → clean `nested·OUTER PressIn → PressOut → Press`
  (`screenshots/row7-api33-outer-tap.png`). **`nested·INNER` never logged.** Row 7 stays
  **inconclusive for INNER independent presence** — now because the outer occludes + touch-shadows
  the inner (not because both are `aurora`). Recorded as footnote ⁸ᵃ in `device.md`.
- **dots-write note.** The nested INNER is a `scan→true` surface: it mounts and runs its frame loop,
  so `onDraw` writes `pressDepth`/`touch` per frame, crash-free — the scan→true branch is
  device-safe. The visible press-bulge is not observable here because the only `dots` surface is the
  occluded + touch-shadowed nested INNER.
- No crash at any point on the API-33 AVD (the U8-003 fix lets the screen mount; the U8-003 API-33
  crash-resolution proof is in `../U8-003/evidence/device.md`). The other matrix rows were not
  re-scored this session.

Maintainer sign-off: ____________________  Date: __________
