# U8-001 — Device Verification (the cooperative press recognizer + SDF hit-test)

## Date

2026-06-12

## Result

**PARTIAL — 5 of 6 rows PASS on both platforms; Row 4 `none`-mode full-bounds pass-through
FAILS on both platforms.**

The press recognizer FSM, the passive pointer-uniform stream, the active press lifecycle
(incl. long-press tap-suppression), the slop-yield to scrollers (the single most important
behavior), the rapid-touch cost, and the U6/U7 regression trio all hold on both platforms.
The one defect: with `interactionMode="none"`, a touch over the surface is **swallowed by
the surface's own subviews** and never reaches RN content composited behind it — the
`32` D4 degenerate pass-through the runbook puts under test does not work on either platform.

This is the maintainer-facing write-up. The agent did **not** tick `device-verified`/`merged`,
close RT-006, or pin the feather/threshold — those wait on the maintainer's ratification, and
the Row 4 defect should be triaged first.

## Devices

- **iOS:** iPhone 17 Pro simulator, iOS 26.5. UDID `995F7068-339A-4353-9211-8DAE01F0CAA5`.
  The three duplicate same-named `iPhone 17 Pro` sims (iOS 26.0/26.1/26.3) were deleted
  first so name-based targeting resolves to one device (per the U6/U7 precedent). Simulator
  is acceptable for build, tap lifecycle, and the SwiftUI/Metal paths; a physical-iPhone
  re-run of touch feel stays on the standing-gates list.
- **Android:** POCO F1, Android 15, API 35 (hardware). Device id `69424da8`. Physical, as
  required for AGSL rendering, touch feel, scroller yield, and the rapid-touch cost.

## Build and install evidence (gate commit e2ec3dd, integration/0.1.x)

Both apps were rebuilt and reinstalled from `e2ec3dd` before testing; binaries were verified
newer than the newest native source to rule out stale-binary false fails.

- **iOS:** `xcodebuild -workspace example/ios/reactnativefxexample.xcworkspace -scheme
  reactnativefxexample -configuration Debug -destination id=995F7068-… -derivedDataPath
  example/ios/build-u8 build` → `** BUILD SUCCEEDED **`. The `ReactNativeFx` pod objects
  `FxPressHandler.o` / `FxSurfaceView.o` compiled `23:05:46`, app binary `23:06:25` — both
  beat the newest iOS source (`FxSurfaceView.swift` `22:44:56`). `FxShaders.bundle/default.metallib`
  present. Installed with `xcrun simctl install`.
- **Android:** `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`. Library class
  `FxPressHandler.class` compiled `22:45:57` (source `22:45:05`), runtime dex `23:03:23`,
  APK `23:03:30`, `assets/shaders/dots.agsl` packaged. Installed with `adb install -r` →
  `Success`. `adb reverse tcp:8081 tcp:8081`, `svc power stayon true`, `wm dismiss-keyguard`
  set before the run.
- Metro served the temporary harness (verified: `expo-router/entry` bundle contains
  `PressHarnessScreen`). Headless gate before the run: example `bunx tsc --noEmit` clean.

## Temporary harness (never committed; fully reverted — see Cleanup)

A scratch screen `example/screens/press-harness.tsx`, reachable as a temporary `U8-001` task
card (route `rnfxexample://U8-001`). It carries an `FxSurfaceView shader="dots"` whose
`interactionMode` switches `none`/`passive`/`active` at runtime; a layout toggle between
**overlay** (an RN `Pressable` absolutely filling the stage, the surface floated centered on
top — overlay composition) and **scroll** (the same surface inside a plain `ScrollView` with
filler content); a `mounted` toggle; a `clear`; and an on-screen event log that records every
`onShader*` event and every behind-`Pressable` tap with `{x,y}` and one monotonic counter.
**No `packages/` code was touched; no dependency or lockfile bumped** (verified by diff). The
behind-`Pressable` exercising pass-through is the runbook's prescribed Row 4 composition.

## Results — six rows × two platforms

| # | row | iOS | Android |
|---|-----|-----|---------|
| 1 | passive: continuous track + scroll yield, zero events | PASS | PASS |
| 2 | active lifecycle + long-press suppression | PASS | PASS |
| 3 | slop-yield (scroller claims, spring-back, no onPress) | PASS | PASS |
| 4 | pass-through: **`none` over surface** / active in/out | **FAIL** (none) · active OK | **FAIL** (none) · active OK |
| 5 | rapid-touch cost (no jank, no reload, no runaway) | PASS | PASS |
| 6 | regression trio (presence, retarget, reduce-motion) | PASS | PASS |
| — | mode-switch / unmount hygiene | PASS | PASS |

### Row 1 — passive: continuous tracking + scroll yield — PASS / PASS

Dragging across the surface in `passive` drives the dots bulge/glow continuously
(`ios-row1-passive-drag.mp4`, `android-row1-passive-drag.mp4`) and emits **zero** `onShader*`
events. Spatial tracking proven with static captures: an off-center touch bulges that exact
region —

- iOS: left tap → glow left (`ios-row1-passive-bulge-upperleft.png`); right-edge tap → glow
  right (`ios-row1-passive-bulge-right.png`). Event count 0 throughout.
- Android: upper-left tap → glow upper-left (`android-row1-bulge-upperleft.png`); **lower-right
  tap → glow lower-right** (`android-row1-bulge-lowerright.png`) — the glow sits **under the
  finger, not vertically mirrored**, so the Android y-flip fix holds. Count 0 throughout.

In the `ScrollView` case, a scroll gesture **started on the surface** scrolls the list
(footer fillers 6–9 appear, the surface scrolls away) with **zero** events and no stuck
disallow — passive yields to the scroller instantly on both platforms.

### Row 2 — active lifecycle + long-press suppression — PASS / PASS

A tap fires the lifecycle in order, identical on both platforms:

```
iOS      tap:        #1 onShaderPressIn  → #2 onShaderPressOut → #3 onShaderPress   {x:110,y:120}
Android  tap:        #0 onShaderPressIn  → #1 onShaderPressOut → #2 onShaderPress   {x:302,y:302}
```

A hold past threshold fires **exactly one** `onShaderLongPress`, and on release `onShaderPress`
is **suppressed** (`onShaderPressOut` still fires):

```
iOS      long-press: #0 onShaderPressIn → #1 onShaderLongPress → #2 onShaderPressOut   (no onShaderPress)
Android  long-press: #0 onShaderPressIn → #1 onShaderLongPress → #2 onShaderPressOut   (no onShaderPress)
```

(See the coordinate-unit note under Findings for the iOS `110` vs Android `302` difference.)

### Row 3 — slop-yield (the single most important behavior) — PASS / PASS

In the `ScrollView` case, `active`, press on the surface then drag past slop: the scroller
claims, the press cancels (spring-back, `~150 ms` decay in the recordings), and **no
`onShaderPress` fires**. The list scrolls — the scroller wins.

```
iOS      #0 onShaderPressIn {x:110,y:70} → #1 onShaderPressOut {x:110,y:70}   (no onShaderPress; list scrolled)
Android  #0 onShaderPressIn {x:306,y:32} → #1 onShaderPressOut {x:306,y:8}    (no onShaderPress; list scrolled)
```

Recordings: `ios-row3-slopyield.mp4`, `android-row3-slopyield.mp4`.

### Row 4 — pass-through — FAIL (`none`) / FAIL (`none`); `active` correct on both

The `active` per-mode behavior is correct on both platforms and is **not** a failure:

```
active + tap OUTSIDE surface (stage margin) → #0 behind {x,y}            (passes through to the RN Pressable)
active + tap INSIDE surface                  → onShaderPressIn/Out/Press  (claimed by fx — the 32 D4 full-bounds degenerate)
```

The **`none`-mode full-bounds pass-through fails on both platforms.** With
`interactionMode="none"`, a tap **over the surface** produces **no event at all** — neither an
`onShader*` event nor a behind-`Pressable` tap — while a tap in the **stage margin** (outside
the surface) reaches the behind `Pressable` normally. The touch is swallowed by the surface's
own subtree instead of passing through to RN content composited behind it. Reproduced cleanly
multiple times per platform (event count stays 0 over the surface; `#0 behind {x:27,y:72}` /
`{x:28,y:71}` proves the Pressable is reachable everywhere the surface does **not** cover).

This contradicts the Row 4 requirement ("with `interactionMode="none"`, taps anywhere over the
surface must reach the Pressable behind it"). Likely root causes (read-only inspection, for the
implementer — not fixed here):

- **iOS** `FxSurfaceView.swift` `hitTest` (~L420–431): an interactive, full-bounds
  `intermediateContainer` (`UIView`, added in `setUpIntermediateContainer`) is always present,
  even with zero RN children; `super.hitTest` resolves to it, and the `result !== self &&
  result !== metalView` branch returns it unconditionally, so the method never returns `nil`
  for the `none` case and the touch dies in the empty container. (Active still emits because
  the long-press recognizer captures touches independent of the hit view.)
- **Android** `FxSurfaceView.kt` `dispatchTouchEvent` returns `consumedByFx ||
  super.dispatchTouchEvent`; in `none`, `pressHandler.handle` returns `false`, but
  `super.dispatchTouchEvent` is consumed by a surface child, so it never falls back to the
  sibling Pressable.

### Row 5 — rapid-touch cost (closes RT-006's cost half) — PASS / PASS

≥30 s of rapid tapping + drag-scrubbing on the `active` case. No crash, no repeated
`onFxLoad`/`onFxError`, no event-counter runaway — the counter is exactly accounted for by
input:

- iOS: 36 taps → count **108** (= 3 × 36 exactly). No `onFx*` during the run.
- Android: 40 taps + 8 scrubs → count **136** (= 120 tap-triples + 16 scrub `PressIn/PressOut`
  yields). No `onFx*` during the run.

Android frame pacing (`gfxinfo`, reset before the run): **Janky frames 65/5272 = 1.23 %**,
**Missed Vsync 0**, 90th pct 29 ms, 95th 30 ms, 99th 34 ms. The deprecated "legacy 68.99 %"
metric over-counts any frame > 16.67 ms and is not authoritative; the modern jank rate +
zero missed vsync show the per-frame `hitTest`/redraw cost introduces no GPU stall under rapid
touch. (Synthetic injection inflates the "High input latency" counter — a tooling artifact,
not render jank.) Recordings: `ios-row5-rapid2.mp4`, `android-row5-rapid.mp4`. The Android dots
glow stays **under the finger** throughout (y-flip fix, per Row 1).

### Row 6 — regression trio (FxSurfaceView's touch/draw path changed) — PASS / PASS

On the presence screen (`U7-001`): `Show` → `enter finished=true interrupted=false`; `Hide`
→ `exit finished=true interrupted=false`; deferred unmount intact; eviction list silent. A
genuine mid-flight **interrupt-as-retarget** was caught on iOS via a tight batch double-tap:
`enter finished=false interrupted=true` followed by the exit completing. On Android the
transient envelope settles `~0.26 s` (per the U6-002 calibration), faster than agent-device's
`~1 s` tap cadence, so the two taps land as complete cycles — the genuine interrupt is not
catchable through the tooling here; the retarget capability itself is independently device-
proven and ratified in U6-002 (RT-016, all 9 rows both platforms). Reduce-motion single-frame:
iOS (`ReduceMotionEnabled`) and Android (`animator_duration_scale 0`) both place the banner in
a single frame with `onTransitionEnd` firing `finished=true` — no animation, no crash. Both
accessibility settings were **restored** after (iOS `ReduceMotionEnabled=0`, Android
`animator_duration_scale=1`).

### Mode-switch / unmount hygiene — PASS / PASS

Unmounting the surface (the `mounted` toggle) leaves the app alive on both platforms (iOS pid
held; Android pid `5044` held) with no crash; remounting re-creates the surface cleanly
(`#0 onFxLoad` fires again). Rapid `active → none → passive → active` flips leave no stuck
state and a subsequent `active` tap fires a clean `PressIn/Out/Press`. The iOS weak-surface
fix held — no unmount crash; incidental corroboration: during the Row 5 stress an edge gesture
popped the screen mid-active-tap and the app did not crash. **Limitation:** a *true* mid-press
mode-flip / unmount (flipping while a touch is physically held) is not achievable through
agent-device's serial single-session interface; the achievable variants above plus the Row 5
incidental are the available evidence.

## Failure signs checked

- No per-move events and no repeated `onFxLoad`/`onFxError` during touch movement (counts are
  exactly input-accounted on both platforms).
- Passive never blocks scrolling and never emits press events.
- Active scroll-yield never fires `onShaderPress` (Row 3).
- Long-press fires exactly once and suppresses the tap (Row 2).
- `pressDepth` never sticks: the bulge springs back after cancel/release on both platforms
  (visual + recordings); unmount/remount and rapid flips leave no residual state.
- Android rendering survives unmount/remount; no app crash anywhere in the run (the only
  logcat `FATAL` is agent-device's own `multitouchhelper` UiAutomation race — not
  react-native-fx; the fx process pid was stable throughout).

## Findings for the maintainer

1. **(Blocking for the six-point scenario) `none`-mode full-bounds pass-through is broken on
   both platforms** — Row 4. A touch over the surface in `none` is swallowed, not passed
   through to RN content behind. Root-cause leads above. The six-point Device-verify cannot be
   ticked complete until this is fixed or the runbook expectation is re-scoped.
2. **(Secondary) Press-event coordinate units differ across platforms.** For the same
   surface-center touch, iOS reports `{x:110,y:120}` (view points) and Android `{x:302,y:302}`
   (physical pixels; the 220 dp surface ≈ 605 px). DOC-011 specifies "JS events in view
   points"; RN's own `locationX/Y` is dp on both platforms. Android appears to emit px and
   should likely divide by display density to match iOS points / the RN convention — otherwise
   a JS consumer reading `{x,y}` gets platform-divergent numbers. (Event firing and ordering
   are correct; only the unit differs.)

## Evidence index

- Screenshots (tracked): `screenshots/ios-*.png`, `screenshots/android-*.png` — baselines,
  per-row logs, bulge spatial/Y-position captures, Row 4 states.
- Recordings (gitignored, local): `screenshots/{ios,android}-row1-passive-drag.mp4`,
  `…-row3-slopyield.mp4`, `…-row5-rapid*.mp4`, `…-row6-reducemotion.mp4`.
- Raw Android logcat (gitignored): `logs/android-logcat.log`.

## Cleanup

The temporary harness is reverted after this write-up: `example/screens/press-harness.tsx`
deleted and the three route wirings (`example/data/tasks.ts`, `example/app/(tasks)/[taskId].tsx`)
restored — see the Cleanup-confirmation line in `notes.md`. `progress.md` state and the RT-006
ledger row are left for the maintainer's ratification — the agent does not tick
`device-verified`/`merged` or close RT-006, and given the Row 4 defect, does not.
