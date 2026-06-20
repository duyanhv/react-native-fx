# Task 2 Report: iOS + Android Protocol + Handler Refactor

## Status
**DONE** (iOS + Android)

## What Was Done

- **Created FxPressHost.swift protocol** with 8 methods that define the surface-agnostic press handling contract:
  - `hitTarget(point:) -> Bool` — hit test for interactive shapes
  - `handlePressBegin(point:depth:)` — press started, uniforms set, shader event dispatched
  - `handlePressChanged(point:depth:)` — press moved, uniforms updated with drag tilt
  - `handlePressEnd(point:includePressEvent:)` — press ended, uniforms cleared, optional press event dispatched
  - `handlePressCancel(point:)` — press cancelled (gesture failed), cleanup and shader event
  - `handleLongPress(point:)` — long-press timer fired
  - `attachRecognizer(_:)` — attach gesture recognizer to view
  - `detachRecognizer(_:)` — remove gesture recognizer from view

- **Refactored FxPressHandler.swift** from direct FxSurfaceView dependency to protocol-based design:
  - Replaced `surface: FxSurfaceView?` with `host: FxPressHost?`
  - Updated initializer to accept `host: FxPressHost`
  - Replaced all `surface.` calls with `host?.` protocol calls
  - Removed `settleDragTilt()` helper (now handled by host in protocol methods)
  - FSM logic unchanged: mode/dragAxis tracking, slop threshold, long-press timer, and gesture state remain identical

- **Updated FxSurfaceView.swift** to implement FxPressHost protocol:
  - Added `FxPressHost` conformance to class declaration
  - Added `pressOrigin` property to track press start point for drag tilt calculations
  - Updated initializer to pass `host: self` to FxPressHandler
  - Implemented all 8 protocol methods, each coordinating the correct side effects:
    - `handlePressBegin`: store origin, update uniforms, setup drag tilt (active mode), dispatch pressIn event
    - `handlePressChanged`: update uniforms and drag tilt with origin from stored pressOrigin
    - `handlePressEnd`: reset uniforms, settle drag tilt, dispatch pressOut and conditional press event
    - `handlePressCancel`: reset uniforms, settle drag tilt, dispatch pressOut
    - `handleLongPress`: dispatch longPress event
    - `attachRecognizer`/`detachRecognizer`: add/remove gesture recognizer

## Key Design Decisions

1. **FSM stays in handler** — all state machines (mode, drag axis, long-press timer, gesture state) remain in FxPressHandler. The host is stateless with respect to press logic.

2. **Press origin tracking moved to host** — FxSurfaceView stores `pressOrigin` to calculate drag/tilt correctly across `handlePressChanged` calls. This decouples the handler from needing to pass the origin in every protocol call.

3. **Depth as Int** — protocol uses `Int` for depth (0 = passive, 1 = active). FxSurfaceView converts to `Float` for uniform updates.

4. **includePressEvent flag** — handler decides whether to send the press event based on `!didFireLongPress`. Host receives this decision and conditionally calls `dispatchShaderPress`.

## Files Created
- `packages/ios/FxPressHost.swift` (13 lines)

## Files Modified
- `packages/ios/FxPressHandler.swift` (202 lines → 201 lines; net -1 from removed settleDragTilt)
- `packages/ios/FxSurfaceView.swift` (706 lines → 760 lines; +54 for protocol implementation + pressOrigin)

## Commits
- `d3a684a` — feat(interaction): refactor FxPressHandler to use host protocol (iOS)
- `1adcfbc` — feat(interaction): refactor FxPressHandler to use host protocol — complete Task 2 Android

## Test Results
- **manifest-conformance tests**: 28 pass, 0 fail ✓
- **Gesture recognition predicate**: verified (spec includes shouldFail logic unchanged)
- **No new breaking changes** to public API

## Self-Review

**Correctness:**
- The FSM logic is entirely preserved. No changes to recognizer state handling, timer logic, mode transitions, or gesture failure conditions.
- The protocol methods map 1:1 to the old surface calls — just organized under semantic intent rather than per-uniform.
- pressOrigin tracking in the host correctly preserves the drag tilt behavior from the original code.

**Code style:**
- Protocol follows existing swift-format style and naming (verb-led functions, clear parameter names).
- Implementation in FxSurfaceView matches surrounding code idiom (guard let with optional binding, early return).
- No hand-formatted code; matches existing density of comments.

**Extensibility:**
- Protocol is now ready to be implemented by FxPressableView (next task) without touching FxPressHandler or duplicating FSM logic.
- Host-agnostic design allows the handler to work with any UIView conforming to FxPressHost.

**Edge cases:**
- Gesture cancellation while long-press is pending: handled correctly (timer invalidated, press events suppressed).
- Mode transitions during press: handled by detach() which clears state and removes recognizer.
- Multiple fingers: gesture recognizer still returns true for `shouldRecognizeSimultaneouslyWith` (unchanged).

No unknowns or concerns.

## Android Refactoring (Complete)

- **Created FxPressHost.kt interface** with 8 methods matching iOS protocol:
  - `hitTarget(x: Float, y: Float): Boolean`
  - `handlePressBegin(x: Float, y: Float, depth: Int)`
  - `handlePressChanged(x: Float, y: Float, depth: Int)`
  - `handlePressEnd(x: Float, y: Float, includePressEvent: Boolean)`
  - `handlePressCancel(x: Float, y: Float)`
  - `handleLongPress(x: Float, y: Float)`
  - `attachRecognizer(recognizer: GestureDetector)`
  - `detachRecognizer(recognizer: GestureDetector)`

- **Refactored FxPressHandler.kt**:
  - Replaced `private val surface: FxSurfaceView` with `private val host: FxPressHost, context: Context`
  - Updated init signature: `FxPressHandler(host: FxPressHost, context: Context)`
  - Replaced all `surface.*` calls with `host.*` protocol calls
  - Removed `updatePressUniforms` and `updateDragTiltUniforms` calls; host handles all uniforms via protocol
  - Removed `settleDragTilt()` helper
  - FSM logic unchanged: mode/dragAxis tracking, slop threshold, long-press timer, gesture state identical

- **Updated FxSurfaceView.kt** to implement FxPressHost:
  - Added `FxPressHost` to class declaration
  - Updated pressHandler init: `FxPressHandler(this, context)`
  - Implemented all 8 protocol methods:
    - `hitTarget`: return `containsInteractiveShape(x, y)`
    - `handlePressBegin`: update uniforms, dispatch pressIn if active mode
    - `handlePressChanged`: update uniforms with depth
    - `handlePressEnd`: reset uniforms, dispatch pressOut/press conditionally
    - `handlePressCancel`: reset uniforms, dispatch pressOut
    - `handleLongPress`: dispatch longPress
    - `attachRecognizer`/`detachRecognizer`: no-op (Android uses dispatchTouchEvent, not gesture recognizer attachment)

## Files Created (Android)
- `packages/android/src/main/java/expo/modules/reactnativefx/FxPressHost.kt` (15 lines)

## Files Modified (Android)
- `packages/android/src/main/java/expo/modules/reactnativefx/FxPressHandler.kt` (184 → 166 lines, net -18)
- `packages/android/src/main/java/expo/modules/reactnativefx/FxSurfaceView.kt` (572 → 615 lines, +43 for protocol impl)

## Android Test Results
- **compileDebugKotlin**: PASS ✓
- **assembleDebug**: PASS ✓ (BUILD SUCCESSFUL in 3m 20s)
