# U7-003 notes

## Status

Closed — maintainer-ratified PASS 2026-06-12; MOT-001 closed; merged on integration/0.1.x.
Review: `reviews/U7-003.md`. Raw logcat stays local (`evidence/android-raw.log`, gitignored
per the U6-002 precedent); the load-bearing excerpts are in `evidence/device.md`.

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

## Run log

- 2026-06-12: Prepared the temporary Android logcat harness locally: per-frame `U7-003`
  spring samples, an `animateTo` target/stiffness/damping/retarget line, native transition-end
  ordering logs, and a scratch default-spring positive-control trigger. `bunx tsc --noEmit`
  passed in `packages/`, `:react-native-fx:compileDebugKotlin` passed, and `bunx tsc --noEmit`
  passed in `example/`.
- 2026-06-12: Rebuilt the example APK from gate commit `5069c91` with the temporary harness.
  `:app:assembleDebug` passed. The APK timestamp was `2026-06-12 21:27:23 +0700`, newer than
  the touched source files (`21:26:01` to `21:26:35 +0700`).
- 2026-06-12: Device run blocked before install: `adb devices -l` returned an empty device list.
  `agent-device devices --platform android` also failed after it could not start its daemon cleanly.
  No U7-003 logcat rows were captured, no `evidence/device.md` was written, and no raw log file was
  saved.
- 2026-06-12: Reverted all temporary instrumentation and scratch demo code. `git status --short`
  showed only this notes update afterward; no dependency or lockfile drift.
- 2026-06-12: POCO F1 reconnected (`69424da8`, Android 15 / API 35). Reapplied the temporary
  U7-003 harness, rebuilt and installed the example APK from gate commit `5069c91`, verified the
  APK timestamp (`21:31:39 +0700`) was newer than the touched source files, and ran the four
  required rows from `evidence/headless.md`.
- 2026-06-12: Device result PASS. No-overshoot presence envelopes used
  `stiffness=1500.0` / `dampingRatio=1.0` and stayed within `[0, 176]`; the default-spring
  positive control used `dampingRatio=0.5` and overshot to `-27.305298`; the calibrated retarget
  rerun used a 20 ms offset and produced `retarget=true` in both directions before rest;
  reduce-motion emitted no frame samples and still fired semantic completion.
- 2026-06-12: Restored `animator_duration_scale=1`, `transition_animation_scale=1`, and cleared
  `svc power stayon`. Reverted all temporary instrumentation and the scratch default-spring
  trigger. Post-revert diff check showed no code, dependency, or lockfile drift.

- 2026-06-12: Planner review of the device evidence: no-overshoot verified against the FULL
  raw log (the only out-of-range samples sit in the two positive-control windows; −27.3 px
  ≈ 15.5 % matches the predicted ~16 % bounce); four genuine `retarget=true` events with
  `interrupted:true` strictly preceding each retargeted settle and one completion each;
  reduce-motion rows frame-free. Maintainer ratified PASS.
- 2026-06-12: Closure executed (planner): MOT-001 → resolved (ledger row + reconciliation
  row); the `sheet`/`modal` rider re-homed to DEF-018 (trigger: presence-under-navigation
  settled); `data-layer` §Presence presets markers + intro and `structure.android.md`
  §presence presets flipped to verified; `reviews/U7-003.md` written; lifecycle ticked
  through merged. Unit 7 fully closed.

Next: U8-001 spec pass (the press recognizer) — consider a references preflight first.
