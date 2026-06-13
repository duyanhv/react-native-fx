# U8-001 notes

## Device-gate outcome (2026-06-12) — see evidence/device.md

**PARTIAL: 5 of 6 rows PASS both platforms; Row 4 `none`-mode pass-through FAILS both.**
Verified on device (iPhone 17 Pro / iOS 26.5 sim + POCO F1 / Android 15), gate commit
`e2ec3dd`:

- VERIFIED — passive continuous tracking, no scroll claim, zero events (Row 1).
- VERIFIED — active press/long-press/cancel/scroll-yield, long-press tap-suppression (Rows 2, 3).
- VERIFIED — full-bounds fallback claims inside, passes through outside in `active` (Row 4 active).
- VERIFIED — rapid-touch introduces no measurable jank (Android gfxinfo 1.23 % jank, 0 missed
  vsync), no shader reload, no counter runaway (Row 5). Android glow sits under the finger
  (y-flip fix holds).
- VERIFIED — U6/U7 regression: presence enter/exit + deferred unmount, reduce-motion single
  frame; iOS caught a genuine interrupt-as-retarget (Row 6). Hygiene: unmount/remount + mode
  flips crash-free both platforms.

**FAILED — `none`-mode full-bounds pass-through (Row 4).** A touch over the surface in
`interactionMode="none"` is swallowed by the surface's own subtree and never reaches RN
content composited behind it, on BOTH platforms. Root-cause leads in evidence/device.md
(iOS: always-present interactive `intermediateContainer`; Android: `super.dispatchTouchEvent`
consumed by a surface child). This blocks the six-point Device-verify from being ticked complete.

**Open finding — press-event coordinate units differ:** iOS reports view points (`110` at a
220 dp surface centre), Android reports physical pixels (`302`). DOC-011 says "view points";
Android likely needs a density divide to match. Secondary to the Row 4 defect.

## Log

- Added `FxPressHandler.swift` as a plain handler over a stock `UILongPressGestureRecognizer`, with passive/active modes, slop self-failure via `isEnabled` toggle, UIKit-duration long-press timing, native UV uniform writes, and semantic `onShader*` event dispatch.
- Replaced the naive iOS `FxSurfaceView` recognizer path with the handler and added `onShaderLongPress` registration.
- Added `FxPressHandler.kt` and `FxSurfaceShaderView.kt` on Android, with platform slop/long-press tokens, native touch uniform writes, shader redraw on uniform write, and lifecycle pause/resume forwarding.
- Wired Android `FxSurfaceView` to mount the interactive AGSL surface above the content container, route touch through the handler, and dispatch `onShaderLongPress`.
- Added `pressDepth` and `touch` uniforms to Android `dots.agsl` so the interactive Android surface has a visible touch-responsive shader without changing the iOS Metal pixels.
- Updated the TypeScript native surface event type to include `{ x, y }` payloads and the `onShaderLongPress` prop.
- Wrote `evidence/headless.md` with the six-point device scenario plus the U6/U7 regression check.
- Addressed review blockers before the device gate: removed the iOS `unowned` lifetime trap, kept Android passive mode on the touch stream, mapped Android `touch.y` into AGSL's y-down fragment space, suppressed tap after long-press, smoothed `pressDepth` back to zero natively, added iOS composition pass-through hit-testing, cached Android interactive-uniform support per shader, and reconciled `structure.android.md` to the shipped `dispatchTouchEvent` mechanic.
- Verification: `bun install`; from `packages/`, `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, and `bun run test` all pass; from `example/android/`, `./gradlew :react-native-fx:compileDebugKotlin` passes; from `example/ios/`, `pod install` and `xcodebuild -workspace ./reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build` pass.

- Device gate run (2026-06-12, agent-device): rebuilt + reinstalled both apps from `e2ec3dd`
  (binaries verified newer than source); drove a temporary `example/screens/press-harness.tsx`
  (mode switch · overlay pass-through · in-`ScrollView` slop-yield · on-screen event log) plus
  the existing presence screen for the regression trio; wrote `evidence/device.md` and saved
  raw logcat + screenshots/recordings. Harness fully reverted — only `example/` touched, no
  `packages/`, no dependency/lockfile change (diff-verified). iOS reduce-motion and Android
  `animator_duration_scale` both restored.
- Cleanup confirmed: `example/screens/press-harness.tsx` deleted; `example/data/tasks.ts` and
  `example/app/(tasks)/[taskId].tsx` restored via `git checkout`; `git status -- example
  packages` clean.

Next: maintainer triages the Row 4 `none`-mode pass-through FAIL (blocking) and the
coordinate-unit finding before any docs closure — do NOT pin the feather/threshold, flip the
`40` long-press row, or close RT-006 until the `none` pass-through lands; the other five rows
are device-clean and ready to ratify once Row 4 is resolved (likely a follow-up implementation
pass on `FxSurfaceView` hit-test/dispatch, then a Row 4 re-run).

## Round-3 fix log (Finding 1 + Finding 2)

- **Finding 1 (iOS) — FIXED.** `FxSurfaceView.swift` `hitTest` now treats the always-present
  `intermediateContainer` as part of the bare-surface hit set (`result !== self && result !==
  metalView && result !== intermediateContainer`). Only the container *view itself* counts as
  bare surface; a mounted RN child inside it still returns early untouched. The override now
  returns `nil` for a `none`/outside-shape touch over the empty container, so the touch passes
  through to RN content composited behind. Compiles (`xcodebuild` BUILD SUCCEEDED).
- **Finding 1 (Android) — BLOCKED, not shipped.** Implemented `ReactPointerEventsView` returning
  `PointerEvents.BOX_NONE` in `none`/blank and `AUTO` for passive/active, resolved once in
  `applyResolvedConfig`. It did NOT compile: `com.facebook.react.uimanager.ReactPointerEventsView`
  / `PointerEvents` are **Unresolved reference** at library-compile time. Root cause verified —
  the `react-native-fx` library module's `debugCompileClasspath` (set by
  `expo-module-gradle-plugin`) carries **zero** `react-android` (`expo-modules-core` exposes its
  React dependency non-transitively as `implementation`, so its `com.facebook.react.uimanager.*`
  classes do not transit). The classes *do* exist in the pinned RN 0.85.3 (source +
  `react-android-0.85.3-debug.aar` `classes.jar` both confirmed to contain
  `ReactPointerEventsView` and `PointerEvents`); they are simply not on this module's compile
  classpath. Per the task caveat ("STOP and report; do NOT improvise an alternative — the
  fallback would be the JS-side `pointerEvents` prop"), the Android interface change was reverted;
  no improvised alternative shipped. Android Kotlin compile is green WITHOUT it. STOP-flag raised
  for the maintainer.
- **Finding 2 (Android) — FIXED.** `FxSurfaceView.kt` `dispatchShader*` helpers now divide the
  incoming px event coordinates by `context.resources.displayMetrics.density` (via a `toPoints`
  helper) before constructing `FxShaderPressEvent`, so the JS payload reports view points (dp) to
  match the RN `locationX/Y` convention and iOS. `containsInteractiveShape` and
  `updatePressUniforms` stay in px — the internal shape/uniform math is unchanged. Compiles
  (`compileDebugKotlin` BUILD SUCCESSFUL).
- **Docs.** `structure.ios.md` §Touch contract pins the intermediate container as part of the
  bare-surface hit set. `structure.android.md` §Touch contract pins the px→dp conversion (shipped)
  and records the `ReactPointerEventsView` `none`-pass-through lever as OPEN/blocked (the
  classpath problem above), not shipped.
- **Verification (all green for shipped changes):** from `packages/` — `bunx tsc --noEmit` exit 0,
  `bun run build` exit 0, `bun run lint` exit 0 (27 files), `bun run swift:lint` exit 0,
  `bun run test` exit 0 (58 tests, 4 suites); from `example/android/`
  `./gradlew :react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL; from `example/ios/`
  `xcodebuild` Debug for `id=995F7068-…` (iPhone 17 Pro / iOS 26.5) BUILD SUCCEEDED.

Next: maintainer re-runs the Row 4 device gate — `none`-mode pass-through both platforms (iOS
fix to verify; Android STILL FAILS — the `ReactPointerEventsView` lever is blocked on the
library compile classpath, so resolve the classpath / `react-android` exposure or take the
JS-side `pointerEvents`-prop fallback before re-gating Android Row 4) plus the px→dp coordinate
check (Android event payload now in dp; confirm `{x,y}` matches iOS view points).
