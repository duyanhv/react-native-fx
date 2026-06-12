# U7-003 notes

## Unverified claims

- Android transient presence should no longer overshoot with the non-bouncy spring token.
- Android presence retarget behavior should remain continuous under the new damping ratio.
- Android reduce-motion should remain single-frame for presence envelopes.

## Changes

- Added `FxAnimationSpring` and an optional `spring` argument to `FxAnimationDriver.animateTo`, with the no-argument path resetting to the stock `SpringForce` defaults.
- Routed the optional spring through `FxSurfaceView.animateContentTo`.
- Passed `SpringForce.STIFFNESS_MEDIUM` plus `SpringForce.DAMPING_RATIO_NO_BOUNCY` from `FxPresenceCoordinator` for the `transient` presence envelope.
- Left iOS and the driver default path unchanged.
- Wrote the Android device scenario in `evidence/headless.md`.

## Verification

- `bun install` from the repo root: no dependency changes.
- `bunx tsc --noEmit` from `packages/`: pass.
- `bun run build` from `packages/`: pass.
- `bun run lint` from `packages/`: pass.
- `bun run swift:lint` from `packages/`: pass.
- `bun run test` from `packages/`: pass, 58 tests.
- `./gradlew :react-native-fx:compileDebugKotlin` from `example/android/`: BUILD SUCCESSFUL.

Next: run the Android device scenario, then close MOT-001 only after PASS evidence and source-doc propagation.
