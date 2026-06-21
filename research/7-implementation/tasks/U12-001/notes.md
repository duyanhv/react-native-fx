# U12-001 implementation notes

Session: 2026-06-21. State at close: headless-done.

## Changes

**New native files:**
- `packages/ios/FxStateView.swift` — `expo-view` content host; `FxAnimationDriver` targets `intermediateContainer`; dispatches `onFxStateChange`.
- `packages/ios/FxStateViewCoordinator.swift` — N-state FSM (first-snap, no-op same-target, interrupt-then-retarget). `FxStateMotionEntry` Record. `lift` preset.
- `packages/android/src/main/java/expo/modules/reactnativefx/FxStateView.kt` — Android peer; `shouldUseAndroidLayout = true`; `FrameLayout` intermediateContainer; `FxAnimationDriver` init order safe (driver never fires before `applyResolvedConfig`).
- `packages/android/src/main/java/expo/modules/reactnativefx/FxStateViewCoordinator.kt` — Android FSM peer; `FxStateMotionEntry` + `FxStateChangeEvent` Records.

**Modified native files:**
- `packages/ios/FxModule.swift` — added `View(FxStateView.self)` block after FxPressableView.
- `packages/android/src/main/java/expo/modules/reactnativefx/FxModule.kt` — added `View(FxStateView::class)` block after FxPressableView.

**New JS/TS files:**
- `packages/src/runtime/FxStateView.tsx` — `requireNativeView` binding, `NativeFxStateProps`, `FxStateChangeEvent`.
- `packages/src/surface/FxView.tsx` — `FxView`, `FxViewProps`, `FxStateChange`, `FxStatePreset`.

**Modified JS/TS files:**
- `packages/src/motion/builders.ts` — `StateMotionWire` type + `toStateMotionWire()`. Loop-based implementation avoids array destructuring that triggers `@babel/runtime/helpers/interopRequireDefault` (a missing-package path in the test environment; see below).
- `packages/src/surface/index.ts` — added FxView exports.
- `packages/src/index.ts` — added FxView re-exports.
- `packages/src/__tests__/motion-builders.test.ts` — 4 new `toStateMotionWire` tests (142 total).

**Example files:**
- `example/screens/fx-view.tsx` — device harness: Select/Deselect toggle, `onStateChange` log, tap-through counter.
- `example/data/tasks.ts` — U12-001 entry (`fx-view` screen), `DemoScreen` union widened.
- `example/app/(tasks)/[taskId].tsx` — `FxViewScreen` import + `case "fx-view":`.

**Research docs:**
- `research/5-realization/structure.ios.md` — `FxStateView host behavior` section added after FxPressableView section.
- `research/5-realization/structure.android.md` — same.
- `research/7-implementation/progress.md` — U12-001 state → `headless-done`.

## Decisions / unverified claims

- **`lift` preset values** (`scale 1.03`, `translationY –3 pt/dp`) are provisional; the spec says device-tuned at the gate. The coordinator returns `FxAnimationVector(opacity: 1, scale: 1.03, translationX: 0, translationY: -3, rotation: 0)` for `selected` on both platforms.
- **Babel destructuring landmine**: `([, spec])` / `([state, spec])` patterns in `toStateMotionWire` triggered `require('@babel/runtime/helpers/interopRequireDefault')` in the Jest environment — `@babel/runtime` is stored in bun's `.bun` symlink directory and is not resolvable via the standard Node module path from `packages/`. Replaced with a `for` loop over `Object.keys()`. The original code with destructuring compiled cleanly for production; this was test-environment-only.
- **iOS init ordering**: `animationDriver` is created before `stateCoordinator` is assigned, with a `[weak self]` completion closure. Safe because the driver starts paused (`isPaused = true`) and `resumePresentationLoop()` is only called from `didMoveToWindow()` — by which time `stateCoordinator` is fully initialized.
- **Android init ordering**: `animationDriver`'s completion lambda captures `this` (not the value of `stateCoordinator` at construction time). Safe because `FxAnimationDriver` never calls completion during construction, and no animation can fire before `applyResolvedConfig()` is first called by Expo.

## Next

Device gate: state-flip easing + settle event (correct state + finished=true) + interrupt ordering (interrupted:true fires before the retargeted settle) + touch-through (Pressable inside FxView registers taps), both platforms.
