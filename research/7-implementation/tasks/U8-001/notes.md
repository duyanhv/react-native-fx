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

## Round-4 fix log (Android `none`-mode pass-through — REAL-005 Option A)

The round-3 classpath blocker is resolved: the `ReactPointerEventsView` lever now ships.

- **Build coupling.** Added `compileOnly 'com.facebook.react:react-android'` to the library
  module's `dependencies` block (`packages/android/build.gradle`) — unversioned, mirroring
  `expo-modules-core`'s `implementation 'com.facebook.react:react-android'` so the
  `expo-module-gradle-plugin` resolves the version, but `compileOnly` because the host app
  provides `react-android` at runtime and fx must not bundle it. This is the library's first
  direct `com.facebook.react.*` dependency. It puts `com.facebook.react.uimanager.*` on the
  module's compile classpath, which the round-3 plugin classpath lacked.
- **The lever.** `FxSurfaceView.kt` now implements `ReactPointerEventsView`: a plain backing
  field `appliedPointerEvents` (`PointerEvents.BOX_NONE` default) is finalized in
  `applyResolvedConfig` off the same applied mode the press handler reads — `AUTO` for
  `passive`/`active`, `BOX_NONE` otherwise (`none`/blank, and `controlled` for now, with a
  `// TODO:` noting controlled may want `AUTO` when it ships). The `pointerEvents` property
  override returns that field; nothing is computed per event and nothing calls back into RN.
  `BOX_NONE` (never `NONE`) keeps the surface itself untargetable while RN children inside stay
  targetable — the parity of the iOS `hitTest` fix. iOS and the `FxPressHandler` FSM untouched.
- **Docs.** `structure.android.md` §Touch contract — the build-coupling sentence updated from
  the planned/blocked framing to **shipped** (compile-proven), keeping the accurate
  device-pending caveat for the Fabric-consults-`getPointerEvents()` re-gate. Mechanic
  semantics unchanged (no divergence from the pin).
- **Verification (all green).** From `packages/`: `bunx tsc --noEmit` exit 0; `bun run build`
  exit 0; `bun run lint` exit 0 (27 files); `bun run swift:lint` exit 0; `bun run test` exit 0
  (58 tests, 4 suites). From `example/android/`: `./gradlew :react-native-fx:compileDebugKotlin`
  BUILD SUCCESSFUL — `:react-native-fx:compileDebugKotlin` *executed* (not up-to-date) and
  resolved `ReactPointerEventsView` / `PointerEvents`, proving the coupling; `./gradlew
  :app:assembleDebug` BUILD SUCCESSFUL — no duplicate-class / runtime-missing error, confirming
  the host provides `react-android` and fx bundled no conflicting copy.

## Row-4 re-gate (2026-06-13) — see evidence/device-regate.md

Bounded re-gate on commit `8894cfe` (both fixes post-`e2ec3dd`-gate). Drove a temporary
harness (`example/screens/press-harness.tsx`) with an RN Pressable behind the surface AND one
mounted as a child inside it; reverted after (route files `git checkout`, harness deleted,
`git status -- example packages` clean).

- **iOS — PASS (4a + 4b).** none-mode tap over the surface reaches the behind Pressable
  (`#0 behind`); the inside child still fires (`#0 inside`). The `35e15b0` hitTest fix is
  device-proven; `active` still claims (no regression).
- **Android coordinate px→dp — PASS.** active-centre tap now reads `{110,110}` dp (was `302` px),
  matching iOS. Round-3 fix device-proven.
- **Android 4a (THE proof) — FAIL.** none-mode surface tap is swallowed; behind Pressable
  silent (mode confirmed none; behind reachable from the margin; tap injected; reproduced).
  The `ReactPointerEventsView` lever compiles and ships but **Fabric does not consult
  `getPointerEvents()` on the `ExpoView` at hit-target time** — the documented REAL-005 residual
  risk. Reported as-is, STOPPED; no fallback improvised.
- **Android 4b — inconclusive** (the harness child sits behind the opaque AGSL `SurfaceView`, a
  shader-occlusion confound distinct from iOS's hit-transparent `MTKView`); moot until 4a lands.
- **Android rows 1–3 smoke — PASS.** passive zero-events, active In/Out/Press, one long-press +
  suppression, slop-yield (PressIn/PressOut, no Press, scroller wins) — the `AUTO` path is
  unchanged; the inert lever is not harmful. No app crash.

Next: planner's call — REAL-005's close condition is NOT met on Android, so invoke the
documented JS-`pointerEvents` fallback (`.android.tsx`) for the Android none-mode pass-through;
iOS Row 4 + the px→dp fix are device-proven. RT-006 / feather pin / `40` flip stay held until
Android Row 4 lands.

## Unverified claims (round 5)

- The Android `none`-mode bare-tap pass-through (Row 4a) reaches a sibling Pressable composited
  behind the surface, and an RN child mounted inside the surface (Row 4b) stays tappable even
  under an active AGSL shader. Compile- and assemble-proven; **device proof owed** (the round-5
  Row-4 re-re-gate, 4a/4b both platforms — 4b now testable under a shader). No regression to the
  passive/active `AUTO` path (the surface still claims the stream at `dispatchTouchEvent`).

## Round-5 log (2026-06-13) — Android child-occlusion fix (REAL-005 corrected root cause)

- **Root cause (corrected, from running RN 0.85.3 `TouchTargetHelper.kt`):** `FxSurfaceView`'s
  `BOX_NONE` *is* honored (`:320` consults `getPointerEvents()` on any `ReactPointerEventsView`),
  but `BOX_NONE` descends into children, and the surface's two full-bounds children — the AGSL
  `FxSurfaceShaderView` and the `intermediateContainer` — both default to `AUTO` and claim a bare
  tap as a `SELF` target, remapping to the surface tag and swallowing it. The round-4 surface
  lever alone was insufficient; the Android analogue of the iOS `hitTest` exclusion of
  `metalView` + `intermediateContainer` was missing.
- **Fix (Android only, keeps Option A).** `FxSurfaceShaderView` now implements
  `ReactPointerEventsView` → `pointerEvents = NONE` (purely decorative, `TouchTargetHelper` skips
  it entirely). `intermediateContainer` is now an `FxPassthroughContainer` (private
  `FrameLayout` subclass) implementing `ReactPointerEventsView` → `pointerEvents = BOX_NONE`
  (its RN children stay targetable; the container itself is never a `SELF` target), constructed
  with the same full-bounds layout params. `FxSurfaceView`'s own `BOX_NONE`/`AUTO` lever, the
  press FSM, and iOS are untouched.
- **Verification (all green).** From `packages/`: `bunx tsc --noEmit`, `bun run build`,
  `bun run lint` (27 files), `bun run swift:lint`, `bun run test` (58 tests, 4 suites) all exit 0.
  From `example/android/`: `./gradlew :react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL
  (`:react-native-fx:compileDebugKotlin` *executed*, resolves the interface on both children) and
  `./gradlew :app:assembleDebug` BUILD SUCCESSFUL (no duplicate-class / runtime-missing). iOS
  untouched (no rebuild).
- **Docs.** `structure.android.md` §Touch contract already carries the round-5 "surface lever
  alone is insufficient" bullet (planner pin); no mechanic change this round.

Next: device-run the Row-4 re-re-gate (4a bare-tap pass-through + 4b inside-child-under-shader,
both platforms) to device-prove the round-5 fix and close REAL-005 / RT-006.
