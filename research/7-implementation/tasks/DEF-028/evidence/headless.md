# DEF-028 headless evidence

## Construction-crash headless gates (2026-06-29)

Android reveal construction is a runtime device claim. Kotlin accepts `SpringAnimation.spring` as a
platform type, so the original constructor NPE compiled and passed Jest. The device runbook now
starts with a required mount-smoke before any position or G1-G6 rows.

### Commands

- `bun run lint` — PASS
  - `Checked 52 files in 46ms. No fixes applied.`
- `bun run build` — PASS
  - `node internal/module_scripts/build.js`
- `bun run test` — PASS
  - `Test Suites: 9 passed, 9 total`
  - `Tests: 191 passed, 191 total`
  - Existing Jest console warnings from Expo logger setup still print during registry tests; they do
    not fail the suite.
- `cd example && bun x tsc --noEmit` — PASS
  - exit 0, no output
- `cd example/android && ./gradlew :react-native-fx:compileDebugKotlin` — PASS
  - `BUILD SUCCESSFUL in 1s`
  - `58 actionable tasks: 1 executed, 57 up-to-date`
- `cd example/android && ./gradlew :app:assembleDebug` — PASS
  - `BUILD SUCCESSFUL in 11s`
  - `393 actionable tasks: 71 executed, 322 up-to-date`

### Headless conformance added

- `reveal-conformance.test.ts` now guards that Android `FxRevealView` assigns a `SpringForce` to
  each chrome `SpringAnimation` before setting stiffness/damping. This is a static guard only; the
  required proof is still the Android mount-smoke device row below.

## Device runbook (maintainer)

Target devices: iPhone 17 Pro / iOS 26.5 + POCO F1 / Android API 35.

### R0 — Android mount-smoke (construction crash)

Navigate to the reveal screen on POCO F1 / Android API 35 with logcat attached.

PASS if all are true:
- Logcat shows no `Couldn't create view of type class expo.modules.reactnativefx.FxRevealView`.
- Logcat shows no `InvocationTargetException` from `FxRevealView.<init>`.
- Logcat shows no `SpringForce.setStiffness(float)` null-object crash.
- The reveal screen renders as one collapsed card, not both raw slots stacked.

FAIL if any constructor error appears or if the screen shows the fallback stacked slot Views. Stop
the Android gate here if this row fails.

### R1 — Android first-mount collapsed position re-gate

Fresh launch or fresh remount of the default reveal example on POCO F1 / Android API 35.

| Checkpoint | Expected bounds | PASS | FAIL |
|---|---|---|---|
| First mount, before any W8/full relayout | collapsed card is bottom-anchored (`left:16dp`, `right:16dp`, `bottom: insets+16dp`) | bounds match the bottom anchor, with no top flash | bounds match the prior failure (`x:0`, `y:240` / in-flow top) or snap only after W8 |

Record the actual bounds in `evidence/device-run-android/`. The prior bounds were captured while the
native reveal view was crashing and are fallback-layout artifacts: `{x:0, y:240, w:992, h:168}` first
mount and `{x:44, y:1682, w:992, h:168}` after W8. Judge this row only after R0 passes.

## Full Android G1-G6 re-gate (maintainer)

### G1 — round under morph
Open the reveal and watch the corner radius during the open and close. The corners must stay
visually circular (not elliptical/squashed) throughout the non-uniform scaleX≠scaleY morph.
PASS if corners are circular at all points in the flight. FAIL if they squash to ellipses.

### G2 — no clip overflow
During open and close, no expanded content must visibly overflow the rounded chrome boundary.
PASS if content is always clipped inside the rounded rect. FAIL if square-corner content bleeds
outside the radius.

### G3 — clipped-content touch survives (Android especially)
After the reveal is fully open, tap the Shutter button — including near the rounded corners of the
expanded panel. The tap count must increment. PASS if Shutter increments. FAIL if taps near the
clip boundary are swallowed.

### G4 — interruption sync
Rapidly open→close→open mid-flight. The corner radius and clip must retarget in lockstep with
the transform — one `onTransitionEnd` per settled phase, correct phase, no radius snap.
PASS if radius tracks the transform with no visible desync. FAIL if radius snaps while transform
springs.

### G5 — reduce-motion
Enable system reduce-motion, open and close. Transform + chrome must snap to the target together
(no half-morphed radius). PASS if both snap instantly as a unit. FAIL if radius or clip lags.

### G6 — no step-1 regression
After all above: empty-space taps fall through (no new interception); collapsed-card tap still
opens; no reflow; content sharp at the expanded target.

## iOS smoke (maintainer)

iOS already passed the DEF-028 device gate and was not touched in this rework. Smoke the card tap,
shutter increment, round radius, and no-overflow rows to catch accidental integration regressions.
