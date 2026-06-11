# U6-001 notes

## Unverified claims

- Device proof still needs to confirm smooth fire-once envelopes, no-snap retarget, single completion, wrapped-content tap at rest, cancel teardown, and reduce-motion instant placement on both platforms.
- RT-007 remains open until the maintainer completes and ratifies the device gate.

## Changes

- Added iOS `FxAnimationDriver` for the `FxSurfaceView` intermediate container: render-server spring for fire-once envelopes, `CADisplayLink` + `FxSpring` handoff on retarget, cancel-in-place, reduce-motion instant placement, and one internal completion callback.
- Added iOS `FxSpring` and `FxAnimationVector` for native transform/opacity spring stepping, velocity carry, opposing-inertia clipping, rest testing, and target application.
- Added Android `FxAnimationDriver` for the intermediate container using `SpringAnimation.animateToFinalPosition()` across alpha, scale, translation, and rotation, with manual reduce-motion gating and cancel-in-place.
- Wired both drivers into `FxSurfaceView` as internal owned objects without adding a public JS motion API.
- Declared direct AndroidX dependencies for the Android module's own imports: `androidx.core:core:1.17.0` and `androidx.dynamicanimation:dynamicanimation:1.0.0`.
- Wrote the maintainer handoff scenario at `evidence/headless.md`; it requires temporary example instrumentation and reversion after the device run.
- Round 1 corrections: cleared render-server provenance at iOS retarget handoff, matched the fire-once spring duration to the `FxSpring` solver, changed content-motion completion to an internal hook instead of `onFxTransitionEnd`, added code comments for the non-obvious driver mechanics, and made Android pause non-destructive.

## Verification

- `bun install` from repo root: pass.
- `bunx tsc --noEmit` from `packages/`: pass.
- `bun run build` from `packages/`: pass.
- `bun run lint` from `packages/`: pass.
- `bun run swift:lint` from `packages/`: pass.
- `bun run test` from `packages/`: pass after rerun with Watchman cache access; 34 tests passed.
- Swift XCTest: not run; the repo has no existing Swift XCTest target, so `FxSpring` convergence, velocity-carry, and clipping need the device scenario's logged values.
- `pod install` from `example/ios`: pass after rerun with CocoaPods cache access.
- `xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build` from `example/ios`: pass.
- `./gradlew :app:assembleDebug` from `example/android`: pass after rerun with Gradle cache access.
- Round 1 rerun: package checks, iOS xcodebuild, Android assembleDebug, and `git diff --check` pass after corrections.
- `git diff --check`: pass.

Next: maintainer runs the U6-001 device scenario and, if it passes, closes RT-007 in the owning source docs.
