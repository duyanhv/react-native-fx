# DEF-011 Phase 1 — headless-done notes

**Date:** 2026-06-17
**State:** headless-done (recognizer change + prop + spike screen)
**Next:** Human runs the device spike to verify axis claim coexists with cross-axis scroller

## What changed

### Public API (TypeScript)

- **`NativeFxSurfaceProps`** (`packages/src/runtime/FxSurfaceView.types.ts:47`): Added optional
  `dragAxis?: 'horizontal' | 'vertical' | 'both'`. The prop is inert unless
  `interactionMode === 'active'` — unset preserves today's behavior.

### Native prop registration

- **iOS** (`packages/ios/FxModule.swift`): Registered `Prop("dragAxis")` on `FxSurfaceView`,
  wired to `setDragAxis(_:)`.
- **Android** (`packages/android/.../FxModule.kt`): Registered `Prop("dragAxis")` on
  `FxSurfaceView`, wired to `setDragAxis(value)`.

### Prop plumbing

- **iOS** (`packages/ios/FxSurfaceView.swift`): `pendingDragAxis` stashes the prop value;
  `setDragAxis(_:)` normalizes empty strings to nil. `updateInteraction(mode:)` forwards
  `pendingDragAxis` to the press handler.
- **Android** (`packages/android/.../FxSurfaceView.kt`): `pendingDragAxis` stashes the prop;
  `setDragAxis(value)` normalizes blank strings to null. `applyResolvedConfig()` forwards
  `pendingDragAxis` to the press handler.

### Recognizer change (THE SPIKE TARGET)

Both platform `FxPressHandler` `shouldFail` predicates changed from "any Euclidean movement
past slop fails" to "cross-axis movement past slop that dominates the claimed axis fails":

- **iOS** (`packages/ios/FxPressHandler.swift:155-182`): When `mode == .active` and `dragAxis`
  is set, the new axis-aware path runs:
  - `"horizontal"` (claims X): fails when `|dy| > allowableMovement && |dy| > |dx|`
  - `"vertical"` (claims Y): fails when `|dx| > allowableMovement && |dx| > |dy|`
  - `"both"` (claims both): never fails through slop
  - Unset `dragAxis`: falls through to default Euclidean check (today's behavior, unchanged)
- **Android** (`packages/android/.../FxPressHandler.kt:129-157`): Identical logic with
  `touchSlop` instead of `allowableMovement`. When `dragAxis` is set and the movement stays
  along the claimed axis, `shouldFail` returns false → `handleMove` keeps
  `requestDisallowInterceptTouchEvent(true)` and continues. When cross-axis dominates,
  `shouldFail` returns true → releases disallow + cancels, yielding to the ancestor scroller.

The `update(mode:dragAxis:)` signature on both platforms compares both values before
short-circuiting, so a `dragAxis` change alone re-applies the handler config without
requiring a mode change.

### Spike example screen

- **`example/screens/drag-axis-spike.tsx`**: Five sections inside a vertical `ScrollView`:
  1. `dragAxis="horizontal"` inside vertical scroller (spike target)
  2. `dragAxis="vertical"` inside horizontal scroller (cross-axis case)
  3. `dragAxis="both"` (claims both axes, never yields)
  4. No `dragAxis` (today's default — yields all movement)
  5. `dragAxis="horizontal"` with `interactionMode="passive"` (proves inertness)
- Registered in `example/data/tasks.ts` as task DEF-011 and in `example/app/(tasks)/[taskId].tsx`.

### Tier-1 test

- **`packages/src/__tests__/manifest-conformance.test.ts`**: Added `dragAxis prop plumbing
  (DEF-011 Phase 1)` describe block with 5 tests:
  1. Type union assertion on `NativeFxSurfaceProps`
  2. `FxModule.swift` prop registration
  3. `FxModule.kt` prop registration
  4. `FxPressHandler.swift` axis-aware shouldFail (confirms "horizontal"/"vertical"/"both"
     strings in source)
  5. `FxPressHandler.kt` axis-aware shouldFail (same check)

## Why (a log, not narrative)

- **The change is in `shouldFail` only.** No new state, no new state machine paths, no new
  gesture recognizer. The existing press/pressIn/pressOut/longPress event path is untouched
  when `dragAxis` is unset.
- **iOS `shouldRecognizeSimultaneouslyWith` stays `true`.** The yield is done by
  self-failing the recognizer (the shipped mechanism), not by denying simultaneity.
- **Android keeps `requestDisallowInterceptTouchEvent(true)` on DOWN and releases only on
  cross-axis-dominated MOVE.** The flow matches the spec exactly — no additional
  interceptions, no mid-frame parent calls.
- **`dragAxis='both'` never fails through slop.** This means the shader captures all drag
  input indefinitely — the ancestor scroller never gets it. This is intentional for a
  stand-alone interactive shader (not inside a scroller), and it's the caller's choice.
- **Axis-aware path only activates under `interactionMode === 'active'`.** In `passive`
  mode, the handler still runs but `didBeginActivePress` is false, so no press events fire
  anyway — but the `shouldFail` default path (Euclidean) runs regardless, yielding on any
  slop-exceeding movement. This matches "inert unless active."

## Headless gates (all green)

| Gate | Result |
|---|---|
| `bun run lint` (Biome) | PASS — 37 files, no fixes |
| `bun run tsc` (packages) | PASS — no errors |
| `bun run tsc` (example) | PASS — no errors |
| `bun run test` (packages) | PASS — 78/78 (all green; the gate script runs via `internal/module_scripts/test.js`) |
| `bun run swift:lint` | PASS — clean |
| `compileDebugKotlin` (example Android) | BUILD SUCCESSFUL |
| `pod install` (iOS) | PASS |
| `xcodebuild -scheme ReactNativeFx` (iOS) | BUILD SUCCEEDED |

## Unverified claims (awaiting device spike)

1. **Axis claim coexists with cross-axis scroller (iOS):** A `dragAxis="horizontal"` shader
   inside a vertical `ScrollView` should claim horizontal drags while the scroller scrolls on
   vertical drags. The inverse for `dragAxis="vertical"` inside a horizontal scroller.

2. **Axis claim coexists with cross-axis scroller (Android):** Same test — the shader
   captures its claimed axis; the scroller scrolls the cross-axis.

3. **`dragAxis="both"` prevents scroller scrolling:** The shader claims all drag input; the
   ancestor scroller should not scroll when dragging begins on the shader surface.

4. **No regression on unset `dragAxis`:** Existing behavior (any movement past slop yields
   to scroller) is unchanged when `dragAxis` is not set.

5. **`dragAxis` is inert without `active` mode:** Setting `dragAxis="horizontal"` with
    `interactionMode="passive"` should behave identically to unset `dragAxis` (yields on any
    slop-exceeding movement).

6. **Press/longPress behavior when finger leaves the shape along the claimed axis (F2):**
    The axis-aware `shouldFail` branch drops the `containsInteractiveShape` check that the
    default path has. This is correct for drag (the offset keeps growing beyond the shape),
    but it means a press riding the same recognizer no longer cancels when the finger leaves
    the shape along the claimed axis. The device spike should confirm press and longPress
    still behave sanely with `dragAxis` set — a press that starts inside and drifts along
    the claimed axis should still deliver.

7. **Android cross-axis scroll catch on DOWN (F3):** Android claims via
    `requestDisallowInterceptTouchEvent(true)` on `ACTION_DOWN` and releases only on
    cross-axis-dominated `ACTION_MOVE`. The first few pixels of a cross-axis scroll are
    therefore captured by the shader then released to the scroller — a possible perceptible
    hitch at scroll start. The device spike should judge whether cross-axis scroll start
    feels natural, or whether the brief catch is noticeable.

## Spike-harness fix (F1, post-review)

Section 2 (horizontal scroller) now has a horizontal row with the `FxSurfaceView` cell
(300px) flanked by two spacer cells (300px each), giving the scroller 900px of content in a
~viewport-wide container — sufficient scroll travel to demonstrate the horizontal scroller
scrolling on horizontal drag while the shader claims vertical.

## Next: human runs the device spike

The spike screen at `example/screens/drag-axis-spike.tsx` is wired as task DEF-011 in the
example app. Navigate to it on both platforms and verify the claims above.

If the device spike falsifies axis arbitration (the cross-axis scroller doesn't scroll, or
the claimed axis yields too eagerly), re-open the axis-declaration fork documented in the
task README. Do not proceed to Phase 2 (uniforms/settle/spring-back) until the spike
confirms coexistence.

## Files changed (inventory)

```
packages/src/runtime/FxSurfaceView.types.ts   — added dragAxis type
packages/ios/FxModule.swift                   — registered Prop("dragAxis")
packages/ios/FxSurfaceView.swift              — pendingDragAxis, setDragAxis, plumb to handler
packages/ios/FxPressHandler.swift             — dragAxis field, update sig, axis-aware shouldFail
packages/android/src/main/java/expo/modules/reactnativefx/FxModule.kt        — registered Prop("dragAxis")
packages/android/src/main/java/expo/modules/reactnativefx/FxSurfaceView.kt   — pendingDragAxis, setDragAxis, plumb
packages/android/src/main/java/expo/modules/reactnativefx/FxPressHandler.kt  — dragAxis field, update sig, axis-aware shouldFail
packages/src/__tests__/manifest-conformance.test.ts   — Tier-1 tests (5)
example/screens/drag-axis-spike.tsx           — spike example screen
example/data/tasks.ts                         — DEF-011 task entry
example/app/(tasks)/[taskId].tsx              — drag-axis-spike case
research/7-implementation/tasks/DEF-011/preflight.md  — preflight findings
research/7-implementation/tasks/DEF-011/notes.md       — this file
```
