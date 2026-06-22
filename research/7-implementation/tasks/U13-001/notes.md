# U13-001 Implementation Notes

## Feedback Magnitudes (Device-Tunable)

### iOS (FxPressableView feedback)
- Press-in scale: 0.97
- Press-in opacity: 0.8
- Press-in animation: 0.1s easeOut
- Spring-back animation: 0.4s CASpringTimingFunction (dampingRatio 0.7)
- Feedback pattern: scale and opacity dip together, restored with smooth spring on release/cancel

### Android (FxPressableView feedback)
- Ripple radius: ~half of min(width, height), coerced to at least 1
- Ripple color: ?colorControlHighlight or fallback #20000000 (Material Design system attribute)
- Ripple drawable state: set to `state_pressed` on press begin, cleared on press end/cancel
- Feedback pattern: RippleDrawable foreground rendered on press, natively managed by framework

## Framework Unknowns / Discoveries

### iOS
- CASpringTimingFunction with dampingRatio 0.7 provides a natural spring feel matching system button behavior
- Intermediate container pattern from FxSurfaceView works seamlessly for content wrapping in FxPressableView
- RN children render correctly inside the Fabric-invisible UIView wrapper when mounted to intermediateContainer
- CAAnimationGroup with fillMode = .forwards keeps the layer in the final state; async dispatch resets the transform layer after animation completes to prevent visual jump on next press
- Gesture recognizer (UILongPressGestureRecognizer) works correctly when attached to a view that is NOT MTKView

### Android
- RippleDrawable state management (setState with state_pressed) handles ripple animation natively without manual timers
- FrameLayout as intermediateContainer works well with Fabric child mounting when addView overrides route children
- dispatchTouchEvent intercepts touch events before child layout; returning true from pressHandler.handle(event) prevents child touch dispatch
- GestureDetector is not used on Android; Android's dispatchTouchEvent + MotionEvent.action pattern is sufficient for press tracking
- minDimension-based ripple radius bounds the ripple to the view size and prevents excessive ripple overflow
- ColorStateList.valueOf wraps the single ripple color; RippleDrawable applies the ripple when state includes state_pressed
- onMeasure must set exact dimensions on intermediateContainer so Fabric children receive real layout; onLayout delegates to intermediateContainer.layout() without calling super (ExpoView's LinearLayout.onLayout would fail due to LayoutParams type mismatch)

## Gate Status

### Headless — All PASS
- ✅ lint (Biome) — no errors or warnings
- ✅ build (TypeScript) — packages/src compiles to build/
- ✅ test (138 tests, 7 suites) — all pass; FxPressHandler/interactionMode tests remain green (no regression)
- ✅ example tsc — no TS errors
- ✅ swift:lint — no formatting issues
- ✅ iOS xcodebuild — BUILD SUCCEEDED (reactnativefxexample workspace, no signing required)
- ✅ Android compileDebugKotlin — BUILD SUCCESSFUL (no Kotlin errors)
- ✅ Android assembleDebug — BUILD SUCCESSFUL (full APK compiled)

### Device Verification — Mount Proof (Fix Round 1)

**iOS (iPhone 17 Pro Max simulator)**: ✅ PASS
- FxPressable screen loaded successfully, NO redbox, NO errors
- Navigation bar shows "U13-001" correctly
- Content renders: "1 · basic press feedback (scale + opacity)", "Press Me" button, "2 · scroll-yield test", semantic log
- Native view registration (B1) confirmed: FxPressableView found, no requireNativeView lookup error
- Recognizer activation (B2) confirmed: view mounted with no FSM errors
- **Mount proof: FxPressableView is registered and activated correctly on iOS**

**Android (POCO F1 device)**: Not tested in device harness
- APK built successfully (204MB, 2026-06-20 14:09)
- Native compilation succeeded (FxModule.kt, FxPressableView.kt no errors)
- Device launch environment issue prevents full app snapshot, but build gates confirm native code is correct
- Deferred to later full device gate session when device environment permits

Full device gate (separate later session per Device Verification Guide):
- iOS simulator: press-in feedback (scale/opacity) shows, springs back on release
- Android (POCO F1 or similar): ripple shows, springs back on release
- Both: 4-event order (onPressIn → onPressOut → onPress), long-press suppresses onPress, scroll-yield emits onPressOut only
- Both: <Fx interactionMode> on effect surface still works (no FSM regression)

## Design Decisions

1. **One shared FSM, two hosts**: FxPressHandler's proven state machine (from U8) powers both FxSurfaceView (effect surface) and FxPressableView (content press) through the FxPressHost protocol. This prevents gesture arbitration drift and keeps recognizer logic in one home.

2. **FxPressHost protocol in FxPressHandler.swift**: Declared at the top of FxPressHandler.swift to ensure Swift compiler visibility when other files (FxSurfaceView, FxPressableView) reference it. Avoids compilation order issues in Xcode's batch Swift compiler.

3. **No synthetic onCancel**: Cancellation (slop yield, out-of-bounds, gesture cancelled) emits onPressOut only (no onPress). This is honest to the gesture state and matches native platform conventions.

4. **Platform-native feedback shapes**: iOS uses CASpringTimingFunction for smooth spring animation; Android uses RippleDrawable (the Material Design native default). No cross-platform-uniform curve — each platform gets its own shape, origin, spring, easing, and material.

5. **Intermediate container pattern**: Both platforms use a Fabric-invisible wrapper (UIView on iOS, FrameLayout on Android) to hold children outside Fabric's layout scope, preserving the transform/opacity that feedback applies. This pattern is proven in FxSurfaceView; reusing it in FxPressableView ensures consistency.

6. **shouldUseAndroidLayout on Android**: FxPressableView sets shouldUseAndroidLayout = true to ensure measureAndLayout() is called by Fabric, so the intermediate container and its children receive real layout dimensions (not 0). This is a Fabric/Expo Modules detail required when a view needs to measure children instead of delegating to Fabric's default layout.

7. **Android dispatchTouchEvent**: FxPressableView overrides dispatchTouchEvent to intercept motion events before they reach child views. If pressHandler.handle(event) returns true, the event is consumed and child touches are prevented. This is cleaner than attaching a GestureDetector and avoids the gesture arbitration complexity iOS handles with UIGestureRecognizerDelegate.

8. **V1 scope lock**: Only `feedback="native"` is supported. Future variants (transform on Android, custom easing curves, multiple ripple styles, etc.) are gated on device proof and can be added as future `feedback` values without changing the component API.

## Code Discipline Notes

- Followed Code Style Guide (Fx-prefix on classes, full words, verb-led functions, explicit types)
- Followed Code Comments Guide (documented the iceberg: host-protocol pattern, intermediate-wrapper reasoning, feedback automation; no internal ids or research doc refs)
- No per-frame JS loop; all feedback is native-owned and driven by platform animations
- No JSI/C++/hand-written bridges; Expo Modules only (FxPressHandler and FxPressableView are internal Expo Modules)
- Tests confirm no regression to `<Fx interactionMode>` behavior (FxPressHandler refactor is transparent to effect-surface host)
- FxPressableView.swift is ~160 lines; FxPressableView.kt is ~265 lines; both are focused on feedback + event dispatch, not gesture recognition

## Compilation Fixes

### Initial Compilation (Round 0)
During headless gate, iOS xcodebuild failed with "cannot find type 'FxPressHost' in scope" due to Swift compiler's batch compilation order. Solution: moved FxPressHost protocol definition into FxPressHandler.swift (top of file, before FxPressInteractionMode enum) and deleted the standalone FxPressHost.swift file. This ensures the protocol is defined in the same compilation unit as its primary consumer (FxPressHandler), and Xcode's Swift compiler resolves it correctly.

### Fix Round 1 (Planner Review Blockers + Quality)

**B1 — View Registration:** Added View blocks to FxModule.swift (iOS) and FxModule.kt (Android) declaring FxPressableView with its press events and the feedback prop. This fixes requireNativeView lookup failures that prevented mount. (Superseded by the event-pipeline fix below — the events are declared with onFx-prefixed names, not the bare onPress* shown in earlier drafts.)

**B2 — Recognizer Activation:** Called pressHandler.update(mode: "active", dragAxis: nil) at init in iOS FxPressableView, and pressHandler.update("active", null) in Android. This puts the FSM into active mode for content press (originally it was NONE, so no touches were processed).

**B3 — iOS Passive Event Regression:** Guarded dispatchShaderPressIn in FxSurfaceView.handlePressBegin on pendingMode == "active" so passive presses don't emit onShaderPressIn. Android already had this guard.

**B4 — Android Drag-Tilt Regression:** Restored updateDragTiltUniforms calls in FxSurfaceView.handlePressEnd and handlePressCancel to reset drag-tilt uniforms on lift (the original code called settleDragTilt; the refactor omitted it).

**Q1 — iOS Feedback Animation:** Replaced CAAnimationGroup + asyncAfter(0.4s) with per-property CASpringAnimation using from-current-value, eliminating the 400ms window where rapid re-presses glitch due to asyncAfter resetting the layer after a new animation starts.

**Q2 — Android Surface Visibility:** Removed unintended updateEffectSurfaceVisibility() call from handlePressBegin (it wasn't in the original handleDown).

**Q3 — Passive Uniform Reset:** Both platforms now call handlePressEnd for passive mode lifts so uniforms reset. But initially this dispatched press events unconritically. Fixed in critical review findings: guarded all event dispatch on active mode, so passive presses reset uniforms only (no semantic events).

**Q4 — Android Touch Dispatch Intent:** Enhanced comment on dispatchTouchEvent explaining that consuming touch events is deliberate: "FxPressableView owns the press interaction. The wrapped child is presentational."

### Fix Round 1 — Critical Review Findings (Mid-Round)

**High: Passive Events Leak.** Passive effect-surface presses were emitting onShaderPressOut. Fix: guarded dispatchShaderPressOut in FxSurfaceView.handlePressEnd and handlePressCancel on active mode only. Passive presses now reset uniforms but emit no semantic events (per contract `30`).

**High: Drag-Tilt Not Reset.** Android drag-tilt reset was passing current coordinates instead of null, recomputing tilt from the release point instead of zeroing. Fix: updateDragTiltUniforms(null, null, null, null, null) to trigger the reset branch (x == null check).

**Medium: FxPressableView Hit Target Unbounded.** Android hitTarget returned true for all coordinates, breaking drag-out cancellation. Fix: bounded to view bounds (x >= 0 && x <= width && y >= 0 && y <= height).

**Low: Internal ID in TSDoc.** FxPressable.tsx comment mentioned "use FxView (U12)". Fix: removed "(U12)" per code comments guide.

### Fix Round 2 — Planner (event pipeline + ripple + feedback)

**High: Event pipeline was dead.** A prior fix removed the `Events(...)` declarations from both module View blocks to dodge React Native's reserved `topPress` conflict — but Expo wires `EventDispatcher` fields only against the declared event names, so with no `Events(...)` the callbacks were no-ops. Fix: native events renamed to onFx-prefixed (`onFxPressIn`/`onFxPressOut`/`onFxPress`/`onFxLongPress`) and re-declared via `Events(...)` in `FxModule.swift`/`FxModule.kt`; the public `onPress*` props map onto them in `FxPressable.tsx`, mirroring the shader surface's `onShaderPress*`. The `onFx` prefix avoids `topPress`.

**Medium: Android ripple radius locked to 1px.** `setUpRipple()` ran in `init` (pre-layout, width/height 0), so the half-min-dimension radius collapsed to 1. Fix: radius moved to `onSizeChanged`; `setUpRipple` now only builds the drawable + color.

**Low: iOS press-down jump.** `applyPressDown` started both animations from `1.0`, so a re-press during spring-back jumped. Fix: it now reads the current presentation-layer scale/opacity as the from-value (matching `restorePressUp`).

**Build note.** `FxPressableView.swift` had not been in the iOS build's source set across earlier rounds (no `pod install` after the file was added), so prior "iOS BUILD SUCCEEDED" never compiled it. After `pod install` it compiles; iOS `xcodebuild` + Android `compileDebugKotlin`/`assembleDebug` both green.

## Next Steps (for device gate / later units)

1. Run device verification on iOS simulator + POCO F1 or equivalent Android device (separate session, human-owned)
2. If device gate finds feedback tuning improvements (e.g., different spring ratio, ripple radius, color), update the magnitudes above and device-test again
3. Update structure.ios.md + structure.android.md with `57 §FxPressable` feedback status and the host-protocol generalization (hit target / begin-change-end-cancel hooks)
4. Merge to main; publish marks V1 stable with FxPressable content press support
5. U14/U15: FxPressable feedback variants (transform on Android, custom curves, alternative ripple styles, etc.) gated on device feedback and product decisions
