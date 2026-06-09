# U4-001 — Device Scenario

## Goal

Prove that content motion uses an intermediate container that Fabric does not track, so Fabric commits do not clobber the animation.

## Steps

1. Mount an `FxSurfaceView` with an RN child (e.g., a `<View>` with text).
2. Trigger a presence enter animation (`visible: true`).
3. While the enter animation is running, trigger a Fabric commit (e.g., update a prop on an unrelated sibling component).
4. Trigger a presence exit animation (`visible: false`).
5. While the exit animation is running, trigger another Fabric commit.

## Expected result

- The enter animation plays smoothly without being clobbered by the Fabric commit.
- The exit animation plays smoothly without being clobbered.
- The child is positioned at the animated location during the animation (it rides along).
- At rest (animation complete), the child is at the correct final position.
- Hit-testing works correctly at rest (tap the child and the event fires).

## Failure signs

- Animation snaps to the target position during a Fabric commit (clobbered).
- Child jumps or flickers when a commit occurs mid-animation.
- Hit-testing does not work at rest.
- Child is not visible during the animation.

## Platform

- iOS: yes, min 13
- Android: yes, min 21

## Evidence to capture

- [ ] screenshot / video of enter animation with concurrent Fabric commit
- [ ] screenshot / video of exit animation with concurrent Fabric commit
- [ ] confirmation that tap works at rest
