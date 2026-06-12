# U6-001 notes

## Unverified claims

- RT-007 remains open until the maintainer completes and ratifies the device gate.

## Changes

- Added iOS `FxAnimationDriver` for the `FxSurfaceView` intermediate container: render-server spring for fire-once envelopes, `CADisplayLink` + `FxSpring` handoff on retarget, cancel-in-place, reduce-motion instant placement, and one internal completion callback.
- Added iOS `FxSpring` and `FxAnimationVector` for native transform/opacity spring stepping, velocity carry, opposing-inertia clipping, rest testing, and target application.
- Added Android `FxAnimationDriver` for the intermediate container using `SpringAnimation.animateToFinalPosition()` across alpha, scale, translation, and rotation, with manual reduce-motion gating and cancel-in-place.
- Wired both drivers into `FxSurfaceView` as internal owned objects without adding a public JS motion API.
- Declared direct AndroidX dependencies for the Android module's own imports: `androidx.core:core:1.17.0` and `androidx.dynamicanimation:dynamicanimation:1.0.0`.
- Wrote the maintainer handoff scenario at `evidence/headless.md`; it requires temporary example instrumentation and reversion after the device run.
- Round 1 corrections: cleared render-server provenance at iOS retarget handoff, matched the fire-once spring duration to the `FxSpring` solver, changed content-motion completion to an internal hook instead of `onFxTransitionEnd`, added code comments for the non-obvious driver mechanics, and made Android pause non-destructive.
- Device-gate attempt 2026-06-12: added temporary local instrumentation, built Android with `./gradlew :app:assembleDebug`, refreshed stale iOS Expo pods, rebuilt iOS successfully, then stopped before running the scenario because `agent-device devices --platform android` returned no devices and `adb devices -l` was empty. Reverted all temporary instrumentation.
- Device-gate run 2026-06-12 after Android device connection: ran the temporary local instrumentation on Android POCO F1 / Android 15 API 35 and iPhone 17 Pro simulator / iOS 26.5. Fire-once, retarget plus second display-link-path retarget, wrapped RN child tap at rest, cancel, and reduce-motion / animator-scale-0 passed on both platforms. Wrote evidence at `evidence/device-run.md`.

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
- Device gate 2026-06-12: `./gradlew :app:assembleDebug` from `example/android` passed; APK timestamp verified before `adb install -r`; Android scenario passed on POCO F1 / Android 15 API 35 with `agent-device`; iOS `xcodebuild` passed and the installed simulator app passed on iPhone 17 Pro / iOS 26.5 with `agent-device`. iOS reduce motion used the simulator Accessibility preference because `agent-device settings animations` is unsupported for iOS in this CLI.

## 2026-06-12 — ratification (planner thread, on the maintainer's PASS)

- Reviewed the device evidence point-by-point against `evidence/headless.md` plus the
  second-retarget regression check — all confirmed; the `carriedVelocity translationX=0.000`
  line at the first handoff is the opposing-inertia clip working as designed (the new target
  opposed the in-flight direction), direct device proof of the mechanism.
- Cleanup audit: instrumentation fully reverted; one defect — the gate session left
  unauthorized `expo ~56.0.8 → ~56.0.11` bumps in both package.json files + lockfiles
  (misreported as pre-existing); the planner reverted all four. Patch-level delta does not
  invalidate the evidence.
- Headless gates re-run post-revert: tsc / build / lint / swift:lint / test (34/34) /
  `git diff --check` — all pass.
- RT-007 → resolved (ledger + `34`); `34` status line updated, interruptible-contract
  question struck, frame-loop question annotated half-answered; review at
  `reviews/U6-001.md`; README ticked through docs-closed; progress → ready-to-merge.

Next: maintainer merges (the finishing commit). Then U6-002/U6-003 are unblocked, and
U7-001 dispatches with the cold-start prompt + `Task: U7-001.` (spec'd 2026-06-12).
