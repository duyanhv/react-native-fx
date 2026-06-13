# U8-001 — Row-4 RE-GATE (the `none`-mode pass-through fixes)

Bounded re-gate — NOT the full 6-row matrix. The original gate (`evidence/device.md`,
`e2ec3dd`) failed Row 4 `none`-mode pass-through on both platforms; both fixes are
post-gate, so this re-gate is the first device proof of each:

- iOS `none` pass-through — the `hitTest` `intermediateContainer` fix (`35e15b0`).
- Android `none` pass-through — `ReactPointerEventsView` `BOX_NONE`/`AUTO` via `compileOnly`
  (`8894cfe`, REAL-005). The proof obligation: that Fabric actually consults
  `getPointerEvents()` on the non-`ReactViewGroup` `ExpoView` at hit-target time.

## Date

2026-06-13

## Result

**iOS — PASS (4a + 4b). Android — FAIL on 4a (the load-bearing proof): the `none`-mode
surface tap is still swallowed; the behind `Pressable` stays silent. The `compileOnly`
`ReactPointerEventsView` lever compiles and is present in the running app, but Fabric does
not consult `getPointerEvents()` on the non-`ReactViewGroup` `ExpoView` at hit-target time —
the REAL-005 residual risk has materialized.** The Android coordinate check PASSES (now dp,
not px) and the Android rows 1–3 smoke PASSES (the `AUTO` path is unchanged — the lever is
inert, not harmful).

Per REAL-005 and the runner's instructions, this is reported as "Fabric ignores
`pointerEvents` here" and STOPPED — the pivot to the JS-`pointerEvents` fallback is the
planner's call, not the runner's. No fallback was improvised.

## Devices

- **iOS:** iPhone 17 Pro simulator, iOS 26.5, UDID `995F7068-339A-4353-9211-8DAE01F0CAA5`
  (sole `iPhone 17 Pro`; duplicates were deleted at the original gate). Simulator is correct
  here — this is hit-testing, not GPU/timing.
- **Android:** POCO F1 (`69424da8`) — **not connected** at re-gate time (`adb devices` empty;
  `adb kill-server`/`start-server` and a USB scan found nothing). The Android half could not
  run. The APK is built and waiting (see Build).

## Build and install (re-gate commit 8894cfe, integration/0.1.x)

- **iOS:** `xcodebuild … -derivedDataPath example/ios/build-u8 build` → `** BUILD SUCCEEDED **`.
  `ReactNativeFx` `FxSurfaceView.o` compiled `09:52:35`, app binary `09:52:42` — both beat the
  newest iOS source (`FxSurfaceView.swift` `09:14:22`, the `35e15b0` hitTest fix). Installed
  with `xcrun simctl install`.
- **Android:** `:app:assembleDebug` → `BUILD SUCCESSFUL`, APK `09:40:07` (built from `8894cfe`,
  contains the `ReactPointerEventsView` lever). **Ready to install on `adb install -r` once the
  POCO F1 is reconnected.**
- Metro serves the temporary harness; example `bunx tsc --noEmit` clean.

## Temporary harness (never committed; revert pending the Android half)

`example/screens/press-harness.tsx` (route `rnfxexample://U8-001`): a `dots` `FxSurfaceView`
with runtime `none`/`passive`/`active`, an `inside-child` toggle, and an event log (one
monotonic counter). Composition: an RN `Pressable` fills the stage BEHIND the surface
(`behind` log); a second RN `Pressable` is mounted as a CHILD INSIDE the surface (`inside`
log), centered. Harness/logging only — no `packages/` change, no dependency/lockfile drift
(diff-checked). NOTE: with the `dots` shader present the inside child renders *behind* the
Metal layer (iOS composes the metalView in front of the content container), so it is visually
hidden but still hit-testable — the harder, representative case (a `none`-wrapper with an
effect); the log is the proof, not the pixels.

## Calibration (iOS)

Active-mode tap at screen `(201,421)` → `onShaderPress {x:110,105}` ⇒ surface bounds
`x[91,311] y[311,531]`, centre `(201,421)`; the centred 100×100 inside child ≈
`x[151,251] y[371,471]`.

## Rows

### 4a — bare pass-through (THE proof) — iOS PASS

`interactionMode="none"`, tap a surface corner `(110,340)` clear of the inside child:

```
#0 behind {x:93,y:68}       (count 1 — ONLY the behind Pressable; no onShader*, no inside)
```

The tap over the surface reaches the RN `Pressable` composited behind it. At the original
gate this same tap was swallowed (count 0). The iOS `hitTest` fix — `intermediateContainer`
added to the bare-surface set so the override returns `nil` in `none` — works on device.
Screenshot: `regate/ios-4b-inside-child.png` (the log panel).

### 4b — child stays targetable (regression guard) — iOS PASS

`interactionMode="none"`, tap the inside-child centre `(201,421)`:

```
#0 inside {x:32,y:8}        (count 1 — ONLY the inside child; no behind, no onShader*)
```

A genuine RN child mounted inside the surface still receives the touch in `none` mode — the
`hitTest` early-return for real descendants is intact (only the empty container itself falls
through). This is the one realistic regression surface (presence/content-wrapper surfaces are
all `none`-mode); it holds.

### Coordinate check (iOS reference)

iOS active-centre tap reports `{x:110,y:105}` — view points, as expected. (The Android
side-by-side — which must now read ~`110` dp, not ~`302` px — is part of the pending Android
half.)

### Incidental — `none` fix did not regress `active` (iOS)

Calibration in `active` fired `onShaderPressIn/Out/Press {x:110,105}` cleanly — the bare-surface
filter change did not disturb the claim path.

## Android (POCO F1, A15 API 35; reconnected and re-prepped; APK `8894cfe` installed, class `09:39:51` > source `09:39:15`)

Calibration: active-mode tap at screen `(540,1337)` → `onShaderPress {x:110,110}` ⇒ the
coordinate is now **dp** (the pixel centre of a 605 px / 220 dp surface is 302 px = 110 dp);
surface px-bounds `x[238,842] y[1034,1640]`, centre `(540,1337)`.

### Coordinate check (Android) — PASS

The active-centre tap reports `{x:110,y:110}` — view points (dp), matching iOS (`{110,105}`),
**not** the original gate's `302` px. The round-3 px→dp divide works on device. (Re-confirmed
in the long-press smoke: a tap near `(350,1150)` reported `{41,42}` dp.)

### 4a — bare pass-through (THE proof) — FAIL

`interactionMode="none"` (chip confirmed selected in `android-4a-state.png`), tap a surface
corner clear of the child:

```
tap (320,1120)  → count 0                      (nothing — swallowed)
tap (350,1150)  → count 1, still #0 behind {x:27,y:26}   (no new event — swallowed again)
```

The tap was **swallowed** — it did not reach the behind `Pressable`. Ruled out the confounds:
the tap injected (`Tapped (…)`), the mode is `none` (screenshot), and the behind `Pressable`
**is** reachable — a stage-margin tap `(120,1000)` fired `#0 behind {x:27,y:26}`. The build is
correct (the coordinate check proves round-3 is in the running app; `assembleDebug` compiled
the `ReactPointerEventsView` interface in for round-4), so the lever is present but **inert at
hit-target time**: Fabric does not consult `getPointerEvents()` on the `FxSurfaceView`
(`ExpoView` / `LinearLayout`, not a `ReactViewGroup`). This is the documented REAL-005 residual
risk. **Reported as "Fabric ignores `pointerEvents` here"; STOPPED; no fallback improvised.**

### 4b — child stays targetable — INCONCLUSIVE on Android (harness confound)

`none`-mode tap on the inside-child centre `(540,1337)` → count 0 (no `inside`). But on
Android the AGSL `effectSurfaceView` (the dots) is composed **above** the content container, so
the child sits behind an opaque `SurfaceView` that occludes it for hit-testing — distinct from
iOS, where the `MTKView` is hit-transparent and 4b passed cleanly. With 4a already showing the
surface is the hit target (BOX_NONE not honored), this count-0 is consistent with that and with
the occlusion; it does not cleanly isolate the child-targetability guarantee. A clean Android
4b needs a no-shader `none`-wrapper (the realistic presence/content-wrapper shape) — noted for
the planner, but moot until 4a's pass-through lands.

### Rows 1–3 smoke (Android) — PASS (the `AUTO` path is unchanged by the inert lever)

- **active tap** (calibration): `onShaderPressIn/Out/Press {x:110,110}` — correct order, dp.
- **active long-press** `(350,1150)`: `#0 PressIn → #1 onShaderLongPress → #2 PressOut`
  `{x:41,42}`, **no onShaderPress** (exactly one long-press, tap suppressed).
- **passive drag** across the surface: count 0 (zero events).
- **slop-yield** (scroll layout): press-drag past slop → `#0 PressIn {x:111,8} → #1 PressOut
  {x:111,-4}`, **no onShaderPress**, the list scrolled (scroller won).

No app crash across the Android run (pid stable `11423`); no `onFxError`; the only logcat
`FATAL` is agent-device's own `multitouchhelper` (not react-native-fx). Raw log:
`logs/android-regate-logcat.log`.

## Conclusion

- **iOS `none` pass-through (35e15b0): device-PROVEN** — 4a passes through, 4b keeps children
  targetable.
- **Android coordinate px→dp (round 3): device-PROVEN** — Android now emits dp matching iOS.
- **Android `none` pass-through (8894cfe, REAL-005 Option A): does NOT hold on device** — the
  interface compiles but Fabric ignores it on the `ExpoView`. REAL-005's close condition is not
  met. The `AUTO` path is unaffected (smoke green), so the lever is inert, not harmful.

## Cleanup

DONE — `example/screens/press-harness.tsx` deleted and the two route wirings restored; see the
Cleanup-confirmation line in `notes.md`.

## Next

Planner's call: invoke the REAL-005 JS-`pointerEvents` fallback for the Android `none`-mode
pass-through (`.android.tsx`), since the `ReactPointerEventsView` interface is inert on the
`ExpoView` under Fabric. iOS Row 4 and the px→dp coordinate fix are device-proven and need no
further work. RT-006 / the feather pin / the `40` flip stay held until Android Row 4 lands.
