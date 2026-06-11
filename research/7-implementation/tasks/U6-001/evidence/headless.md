# U6-001 — Device scenario

## Goal

Prove the internal content-motion driver moves the `FxSurfaceView` intermediate container with a native spring, retargets without snapping, preserves wrapped-content touch at rest, cancels cleanly, and honors reduce motion.

## Setup

Use a temporary instrumented harness and revert it after the run. Do not publish a JS motion API for this task.

Add a local-only control in the example that mounts an `FxSurfaceView` wrapping a tappable RN child, then calls the native internal driver from the platform side with these target vectors:

- `rest`: `opacity=1`, `scale=1`, `translationX=0`, `translationY=0`, `rotation=0`
- `offRight`: `opacity=0.4`, `scale=0.92`, `translationX=160`, `translationY=0`, `rotation=0`
- `offLeft`: `opacity=0.7`, `scale=1`, `translationX=-120`, `translationY=0`, `rotation=0`

Log one line for each completion, cancel, and retarget. On iOS, log whether the render-server path hands off to the display-link path and the captured presentation value at handoff. On Android, log each `animateToFinalPosition()` retarget.

## Steps

1. Launch the instrumented example on iOS 17 or newer and on Android API 24 or newer.
2. Tap "start" once to animate `rest -> offRight`.
3. Wait for rest and verify exactly one completion log line.
4. Tap the wrapped RN child at rest and verify its normal RN tap handler fires.
5. Tap "start", then within 150 ms tap "retarget" to animate toward `offLeft`.
6. Watch the content continue from its visible position with no snap, no jump to either endpoint, and no restart from `rest`.
7. Wait for rest and verify exactly one completion log line for the retargeted envelope.
8. Tap "start", then within 150 ms tap "cancel".
9. Verify the content stays at its current visible position, no completion fires for the canceled envelope, and the display link or dynamic animation stops.
10. Enable reduce motion or animation scale `0`.
11. Tap "start" again and verify the target applies in a single frame and exactly one completion fires.

## Expected result

- Fire-once animation is smooth and native-owned.
- Completion fires once per completed envelope.
- Mid-flight retarget continues from the visual position with no snap and no double animation.
- iOS logs the render-server path before retarget and the display-link handoff on retarget.
- Android logs `SpringAnimation.animateToFinalPosition()` for retarget.
- Wrapped RN content rides the container and is tappable at rest.
- Cancel settles in place and stops native frame work.
- Reduce motion applies the target immediately and completes once.

## Failure signs

- Any per-frame JS logging or bridge traffic is required for motion.
- The content jumps to the old target, new target, or initial position on retarget.
- More than one completion fires for a single envelope.
- Cancel keeps a display link or spring running.
- Wrapped RN content is not tappable at rest.
- Reduce motion still animates.

## Platform

- iOS: yes, iOS 17 or newer for the spring rung; below iOS 17 should instant-place.
- Android: yes, API 24 or newer.
