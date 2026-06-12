# U6-002 notes

## Unverified claims

- RT-016 stays open until the maintainer ratifies the device matrix. The agent ran the
  matrix and judged every row PASS, but `device-verified` and the RT-016 closure are the
  maintainer's gates — not ticked here.
- iOS evidence is from the iPhone 17 Pro **simulator** (acceptable per the U5-001/U6-001
  precedent). A physical-iPhone re-run stays on the standing-gates list, not a U6-002 blocker.

## Changes

- Wrote `evidence/matrix.md` — the nine-row hard-retarget matrix, all rows PASS on both
  platforms, with inline log lines, devices, build/install evidence, and the pinned-mechanic
  check. Raw captures `evidence/ios-raw.log` + `evidence/android-raw.log`; recordings local
  and gitignored at `/tmp/u6-002-{ios,android}.mp4`.
- Ran the matrix via agent-device on the iPhone 17 Pro sim (iOS 26.5) and POCO F1 hardware
  (Android 15, API 35). 11 scenario triggers per platform → the 9 matrix rows.
- Temporary instrumentation (all reverted after the run, tree clean, no remnants):
  - iOS `FxAnimationDriver.swift` — `NSLog` lines at start/retarget/completion/cancel with
    the transform+opacity vector; a `debugCurrentValue` accessor; an `fxDebug` formatter.
  - iOS `FxSurfaceView.swift` — a `debugLatestInstance` static + `runDebugScenario(name)`
    native-timed scenario runner (`DispatchQueue.main.asyncAfter`).
  - iOS `FxModule.swift` — a temporary `fxDebugScenario(name)` module `AsyncFunction`.
  - Android `FxAnimationDriver.kt` — `Log.i` lines at start/retarget/completion/cancel; a
    `debugCurrentValue()` + `currentValue()`/`fxDebug()` helpers.
  - Android `FxSurfaceView.kt` — a `debugLatestInstance` companion + `runDebugScenario(name)`
    (`postDelayed`).
  - Android `FxModule.kt` — a temporary `fxDebugScenario(name)` module `AsyncFunction`.
  - `example/screens/content-motion.tsx` — temporary scenario buttons + an always-visible
    child, calling the module function.
- Calibration finding (not a defect): the Android default `SpringForce` settles ≈ 0.26 s
  vs the iOS spring ≈ 0.5 s+; the Android retarget offsets were shortened (mid 120 ms, late
  200 ms) so the second target lands mid-flight. A first Android pass with the iOS-tuned
  300 ms offsets fired post-settle (two fire-once envelopes) and was rerun. Documented in
  `matrix.md` §Envelope-duration note.

## Verification

- iOS build `xcodebuild … -derivedDataPath ios/build-u6 build` → BUILD SUCCEEDED; installed
  via `simctl install`.
- Android build `./gradlew :app:assembleDebug` → BUILD SUCCESSFUL (twice — original +
  recalibration); APK timestamp checked before each `adb install -r` → Success;
  `adb reverse tcp:8081 tcp:8081` set for the hardware device.
- Post-revert hygiene: `git checkout` of all 7 touched files; `grep` confirms zero
  instrumentation remnants; `git diff --check` clean; `bun run swift:lint` clean; packages
  `bunx tsc --noEmit` clean; example `bunx tsc --noEmit` clean. Working tree clean except the
  untracked `evidence/` folder.
- Android device note: the POCO F1 was on a secure lock screen at session start and could
  not be unlocked programmatically; the maintainer unlocked it before the Android run.
  `svc power stayon true` was set to keep it awake during the run.

## Result summary

All nine rows PASS on both platforms. The shipped retarget paths (iOS render-server-first /
`FxSpring`+`CADisplayLink`-on-retarget; Android stock `SpringAnimation.animateToFinalPosition()`)
hold on device; the integrator-flip trigger did not fire. `structure.{ios,android}.md` §motion
mechanics confirmed — no divergence, no pin update warranted.

Next: maintainer ratifies the matrix (device-verified) and closes RT-016 in `34` §Findings +
the ledger; then U6-002 reviews + docs-closes. U6-003 (tune formulas / M3 floor) and U7-001
(presence FSM, already spec'd) are the next dispatchable tasks.

## 2026-06-12 — ratification (planner thread, on the maintainer's PASS)

- Spot-checked the write-up against the raw logs (extension carry 151.245, per-channel
  clip/carry in the mixed row, rapid-fire display-link provenance + completion-once,
  after-rest render-server provenance, 11 JS triggers / zero per-frame JS) — all reconcile.
- Remnant grep across packages/ + example/ clean; `git diff --check` clean.
- RT-016 → resolved (ledger + `34` annotation + status line); structure pins confirmed on
  device, deliberately unedited. Review at `reviews/U6-002.md`; README ticked through
  merged; progress → merged (maintainer, 2026-06-12).
- The calibration rerun (Android 120/200 ms offsets) accepted as correct method; the
  platform settle-time difference feeds U6-003/MOT-001, not a defect here.

Next: U6-003 scope check (planner — MOT-002 was deferred from V1 by DOC-019; the row may
need narrowing to the REAL-001 M3-floor half), then U7-001 dispatch (already spec'd).
