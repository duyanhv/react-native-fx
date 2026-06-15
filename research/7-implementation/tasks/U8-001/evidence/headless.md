# U8-001 — Device scenario

## Goal

Verify the cooperative press recognizer, native uniform writes, semantic press events, scroller yield, and full-bounds SDF fallback on both platforms.

## Steps

1. Build and install the example app from the current branch.
2. Add or navigate to an `FxSurfaceView` shader case that uses `shader="dots"` and `interactionMode="passive"`, with visible logging for all `onShader*` events.
3. Drag a finger across the shader without lifting.
4. Switch the same case to `interactionMode="active"`.
5. Press and release inside the shader.
6. Press and hold past the platform long-press threshold, then release.
7. Place the active shader inside a plain `ScrollView`. Start a press, drag past platform slop, and continue scrolling.
8. Place an RN `Pressable` below the shader surface. Tap inside and outside the shader bounds.
9. Rapidly tap the shader for at least 30 seconds while watching frame pacing and logs.
10. Re-run the U6/U7 regression trio: driver retarget, presence enter/exit, and reduce-motion single-frame placement.

## Expected result

- Passive mode updates the shader touch uniform natively and emits no press events.
- Active tap emits `onShaderPressIn`, `onShaderPressOut`, then `onShaderPress`, with `{ x, y }` in view points.
- Active long press emits one `onShaderLongPress` after the platform threshold and still completes the normal release path.
- Scroll slop cancels the active press, springs `pressDepth` back to zero, and emits no `onShaderPress`.
- The current shipped shader set has no separate shape description, so hit-testing uses the full-bounds fallback from the `32` contract.
- Rapid touch does not introduce visible jank or repeated load/error events.
- The U6/U7 regression trio still passes.

## Failure signs

- JS receives per-move events or repeated load/error events during touch movement.
- Passive mode blocks scrolling or emits press events.
- Active scroll yield fires `onShaderPress`.
- Long press fires more than once for a single press.
- `pressDepth` sticks above zero after cancel, release, unmount, or mode change.
- Android shader rendering stops after background/foreground or off-window navigation.
- Presence or content-motion retarget behavior regresses.

## Platform

- iOS: yes, simulator is acceptable for build and basic tap; use a physical device if scroller feel is ambiguous.
- Android: yes, physical Android required for AGSL rendering, touch feel, scroller yield, and rapid-touch cost.
