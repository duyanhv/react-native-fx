# U6-002 — the hard-retarget matrix (RT-016 device truth)

## Date

2026-06-12

## Result

**PASS — all nine rows on both platforms.** The shipped `FxAnimationDriver` retarget
paths survive every hard case. No row produced a clean failure, so the integrator-flip
trigger did **not** fire; the render-server-first / integrator-on-retarget (iOS) and stock
`SpringAnimation.animateToFinalPosition()` (Android) dispositions hold on device.

This is the maintainer-facing write-up. RT-016 stays open until the maintainer ratifies.

## Devices

- iOS: iPhone 17 Pro simulator, iOS 26.5. UDID `CBCEA03B-5526-4F36-867C-1327245D7671`.
  (Simulator is acceptable per the U5-001 / U6-001 precedent; a physical-iPhone re-run
  stays on the standing-gates list.)
- Android: POCO F1, Android 15, API 35 (hardware). Device id `69424da8`.

## Build and install evidence

- iOS build: `xcodebuild -workspace example/ios/reactnativefxexample.xcworkspace -scheme
  reactnativefxexample -configuration Debug -destination id=CBCEA03B-… -derivedDataPath
  ios/build-u6 build` → `** BUILD SUCCEEDED **`; installed with `xcrun simctl install`.
- Android build: `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL`; APK timestamp
  verified (`Jun 12 11:08`) before `adb install -r` → `Success`. `adb reverse tcp:8081
  tcp:8081` set so the hardware device reached Metro.
- Headless gates before the run: `bun run swift:lint` clean; example `bunx tsc --noEmit` clean.

## Instrumentation (temporary, reverted after this write-up)

The shipped driver has no public JS motion API, so the matrix was driven by a temporary
harness — the same pattern as the U6-001 gate, fully reverted afterward:

- **Driver logging** — `NSLog` (iOS) / `android.util.Log` (Android) lines tagged `U6-002`
  at start / retarget / completion / cancel, with the full transform+opacity vector. A
  `debugCurrentValue` accessor for the zero-displacement row.
- **Native scenario runner** — `FxSurfaceView.runDebugScenario(name)` schedules each row's
  retarget sequence on native timers (`DispatchQueue.main.asyncAfter` / `View.postDelayed`),
  so the whole envelope after the single trigger call runs with the JS thread idle.
- **Module trigger** — a temporary `fxDebugScenario(name)` module function driving the most
  recently created surface; wired to scenario buttons on the existing content-motion screen.

The driver mechanics themselves were **not** modified — logging and a read-only accessor only.

Raw captures: `ios-raw.log`, `android-raw.log` (this folder). Screen recordings stay local
(gitignored): `/tmp/u6-002-ios.mp4`, `/tmp/u6-002-android.mp4`.

## Envelope-duration note (calibration, not a defect)

The iOS unified spring (`Spring().duration` ≈ 0.5 s) and the Android default `SpringForce`
(stiffness MEDIUM, damping MEDIUM_BOUNCY) settle on different timescales: the offRight
envelope settles in ≈ 0.26 s on the POCO F1 versus ≈ 0.5 s+ on iOS — a platform-native
spring difference (the law), not a bug. The Android retarget offsets were recalibrated
(mid 120 ms, late 200 ms) to land inside that shorter window; a first Android pass with the
iOS-tuned 300 ms offsets fired the second target *after* settle (two fire-once envelopes,
`retarget=false`), which is correct driver behavior for a post-rest call but does not
exercise mid-flight retarget — so it was rerun. All retarget rows below are genuine
mid-flight (`retarget=true` on Android; `source=render-server`/`display-link` on iOS).

## Results — nine rows × two platforms

| # | row | iOS | Android |
|---|-----|-----|---------|
| 1 | retarget timing sweep (≈10/50/90 %) | PASS | PASS |
| 2 | reversal (clip) vs extension (carry) | PASS | PASS |
| 3 | rapid-fire (3+ retargets / one envelope) | PASS | PASS |
| 4 | zero-displacement retarget | PASS | PASS |
| 5 | retarget-after-rest boundary | PASS | PASS |
| 6 | rotation + combined channels | PASS | PASS |
| 7 | mixed-channel disagreement | PASS | PASS |
| 8 | cancel under rapid-fire | PASS | PASS |
| 9 | JS-thread silence | PASS | PASS |

## Row detail and log evidence

### 1. Retarget timing sweep — PASS / PASS

Interrupt the `rest → offRight` envelope and retarget to `offLeft` at three points. Exactly
one completion at `offLeft` each time; no snap or jump on the recording. The ≈90 % near-rest
case (the documented iOS small-displacement degenerate) retargeted cleanly — no dead stop.

**iOS** — each retarget happens on the `render-server` path; opposing channels clip to zero
velocity (timing-mid/late are reversals of direction):

```
timing-early (interrupt ~10%, presentation tx=22.5):
  start source=render-server target=…tx=160…
  retarget source=render-server target=…tx=-120… presentation=…tx=22.548… carriedVelocity=opacity=-2.709 …tx=0.000…
  completion settled=…tx=-120.000…
timing-late (interrupt ~90%, presentation tx=158.8 ≈ at offRight, velocity ~0):
  retarget source=render-server … presentation=…tx=158.778… carriedVelocity=… all 0.000
  completion settled=…tx=-120.000…   (single completion; no snap)
```

**Android** — the running spring set is redirected by `animateToFinalPosition()`
(`retarget=true`), one completion at the final target:

```
timing-mid:
  start target=…tx=160… retarget=false
  start target=…tx=-120… retarget=true
  completion settled=…tx=-120.000…
```

### 2. Reversal vs extension — PASS / PASS

- **Reversal** (retarget to the opposite direction): opposing inertia is zeroed.
- **Extension** (retarget further along the same direction): velocity is carried, no clip.

**iOS** is the explicit proof — the per-axis clip decision is visible in `carriedVelocity`:

```
reversal  (offRight → offLeft): carriedVelocity=… all 0.000          (opposing → clipped)
extension (offRight → further): carriedVelocity=…tx=151.245 scale=-0.076 opacity=-0.567   (same dir → carried)
```

A clip firing on `extension` would be the defect; it does not. **Android** carries velocity
internally inside `SpringAnimation` (per-axis), shown as `retarget=true` + one completion at
`further` (`…tx=320…`), no intermediate completion.

### 3. Rapid-fire — PASS / PASS

3+ retargets inside ~100 ms; exactly one completion, at the last target only.

**iOS** — the second and third retargets land in the `display-link` path (≥2 inside the
integrator), confirming the render-server → display-link handoff and that a superseded
target never completes:

```
start source=render-server target=…tx=160…
retarget source=render-server  target=…rotB…
retarget source=display-link   target=…tx=160…
retarget source=display-link   target=…tx=-120…
completion settled=…tx=-120.000…   (one completion, last target)
```

**Android** — three `retarget=true` redirects, one completion at `offLeft`:

```
start …tx=160… retarget=false
start …rot=-25… retarget=true
start …tx=160… retarget=true
start …tx=-120… retarget=true
completion settled=…tx=-120.000…
```

### 4. Zero-displacement retarget — PASS / PASS

Retarget mid-flight to (approximately) the current in-flight value (`debugCurrentValue`).
No snap, no stuck envelope; completion fires once.

```
iOS:     retarget source=render-server target=…tx=142.777… presentation=…tx=142.777… carriedVelocity=… 0.000
         completion settled=…tx=142.777…        (settles ~13 ms later, once)
Android: start …tx=160… retarget=false; start target=…tx=185.364… retarget=true (= current value)
         completion settled=…tx=185.364…        (once)
```

### 5. Retarget-after-rest boundary — PASS / PASS

Call animate-to again **after** the first envelope settles. Runs as a fresh fire-once.

```
iOS:     start source=render-server target=…tx=160…  → completion settled=…tx=160…
         start source=render-server target=…tx=-120… → completion settled=…tx=-120…
         (the second is render-server, NOT a display-link continuation)
Android: start …tx=160… retarget=false → completion;  start …tx=-120… retarget=false → completion
         (the second start is retarget=false — a fresh envelope, not a redirect)
```

### 6. Rotation + combined channels — PASS / PASS

Vectors with rotation ≠ 0 composed with scale and translation, retargeted mid-flight.
(iOS rotation is radians; Android `View.rotation` is degrees — platform-native vectors.)

**iOS** — the presentation read decomposes combined scale+rotation+translation correctly
mid-flight (no skew/jump at the handoff capture):

```
start    source=render-server target=…scale=0.850 rotation=0.500…
retarget source=render-server target=…scale=1.100 rotation=-0.400… presentation=…scale=0.866 tx=107.337 rotation=0.447…
completion settled=…scale=1.100 …rotation=-0.400…
```

**Android** — `rotA(30°) → rotB(-25°)` retargeted (`retarget=true`), one completion at rotB.

### 7. Mixed-channel disagreement — PASS / PASS

A retarget where some channels oppose (clip) and some extend (carry) simultaneously
(`opacity 0.4→0.9` reverses while `tx 160→320` extends).

**iOS** — per-channel clip behavior in one `carriedVelocity` line: opacity clipped, tx carried:

```
retarget source=render-server target=opacity=0.900 …tx=320… presentation=opacity=0.464 …tx=142.803…
         carriedVelocity=opacity=0.000  scale=-0.076  translationX=151.310 …
completion settled=opacity=0.900 …tx=320…
```

**Android** — each axis is its own `SpringAnimation` carrying its own velocity; `retarget=true`,
one completion at `opacity=0.900 …tx=320…`.

### 8. Cancel under rapid-fire — PASS / PASS

Cancel issued while a retarget envelope is live: settles in place, nothing fires afterward,
no lingering frame work.

```
iOS:     start source=render-server …; retarget source=render-server …(display-link armed)
         cancel displayLinkWasActive=true renderServerWasActive=false settled=opacity=0.951 …tx=2.132…
         (no completion line after the cancel)
Android: start …retarget=false; start …retarget=true
         cancel activeBefore=4 activeAfter=0 settled=opacity=0.614 …tx=38.270…
         (4 active springs stopped → 0; no completion after)
```

iOS confirms the display link was active and is torn down (`displayLinkWasActive=true`,
the loop invalidated on cancel); Android confirms the active spring set drops to zero.
Neither emits a post-cancel completion.

### 9. JS-thread silence — PASS / PASS

Across every scenario, the only JavaScript log line is the single `U6-002 trigger <name>`
emitted at the button press; every `start` / `retarget` / `completion` / `cancel` line is
native (`(Foundation)` on iOS, `I/ReactNativeFx` on Android). The whole envelope — including
the scheduled mid-flight retargets — runs on native timers with the JS thread idle. Counts:
11 JS trigger lines and 11 native scenario blocks per platform (one per scenario, no
per-frame JS). No per-frame bridge traffic drives motion. (Rule #1 holds.)

## Failure signs checked

- No driver crash on either platform across the 11 scenarios.
- No duplicate completion within a scenario block; no stale-/superseded-target completion;
  every completion settled at the row's final target.
- No post-cancel completion (rows 8).
- No visible snap or jump to a prior target on the recordings.
- iOS retarget provenance is correct (render-server for the first interrupt, display-link
  for subsequent ones; no stale render-server provenance after handoff).

## Pinned-mechanic check

Both `structure.ios.md` §motion (render-server-first, `FxSpring`/`CADisplayLink` on
retarget, velocity carry + opposing-inertia clip, single completion) and
`structure.android.md` §motion (stock `SpringAnimation.animateToFinalPosition()`, value +
velocity carried, manual reduce-motion gate) are **confirmed on device** — no divergence
from the pinned mechanics, so no pin update is warranted.

## Cleanup

All temporary instrumentation (driver logging, `debugCurrentValue`, `runDebugScenario`,
the `fxDebugScenario` module function, the example scenario buttons) is reverted after this
write-up. `progress.md` state and the RT-016 ledger row are left for the maintainer's
ratification — the agent does not tick `device-verified`/`merged` or close RT-016.
