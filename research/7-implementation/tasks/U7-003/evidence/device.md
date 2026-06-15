# U7-003 — Device verification

## Date

2026-06-12

## Result

PASS — all four Android rows pass on POCO F1.

## Device and build

- Device: POCO F1, Android 15, API 35, id `69424da8`.
- Branch/commit: `integration/0.1.x` at `5069c91`.
- Build: `./gradlew :app:assembleDebug` passed with the temporary U7-003 logcat harness.
- APK timestamp: `2026-06-12 21:31:39 +0700`, newer than the touched source files
  (`21:30:50` to `21:31:23 +0700`).
- Install: `adb install -r example/android/app/build/outputs/apk/debug/app-debug.apk` -> `Success`.
- Runtime setup: `adb reverse tcp:8081 tcp:8081`, `svc power stayon true`, and
  `wm dismiss-keyguard` before the run.
- Raw log: `android-raw.log`.

## Rows

### 1. No-overshoot — PASS

Presence envelopes used the catalog spring (`stiffness=1500.0`, `dampingRatio=1.0`) and the
translation channel stayed within `[0, 176]` in both directions.

Enter excerpts:

```text
21:33:24.370 animateTo ... translationY=0.0 ... stiffness=1500.0 dampingRatio=1.0 retarget=false reduceMotion=false
21:33:24.379 frame property=translationY value=176.0 velocity=0.0
21:33:24.399 frame property=translationY value=146.36801 velocity=-2403.1155
21:33:24.449 frame property=translationY value=43.411343 velocity=-1228.2627
21:33:24.566 frame property=translationY value=1.0380107 velocity=-35.32457
21:33:24.582 frame property=translationY value=0.0 velocity=0.0
```

Exit excerpts:

```text
21:33:27.320 animateTo ... translationY=176.0 ... stiffness=1500.0 dampingRatio=1.0 retarget=false reduceMotion=false
21:33:27.337 frame property=translationY value=0.0 velocity=0.0
21:33:27.354 frame property=translationY value=22.602343 velocity=2273.0105
21:33:27.423 frame property=translationY value=148.73886 velocity=812.02454
21:33:27.523 frame property=translationY value=174.92607 velocity=36.523205
21:33:27.540 frame property=translationY value=176.0 velocity=0.0
```

Three full on/off repetitions were captured. No enter sample crossed below `0`, and no exit sample
crossed above `176`.

### 2. Default-spring positive control — PASS

The scratch trigger drove the same content driver with no spring parameter. The log shows the stock
default path (`dampingRatio=0.5`) and clear overshoot past rest, proving the probe detects bounce.

```text
21:33:54.922 animateTo ... translationY=0.0 ... stiffness=1500.0 dampingRatio=0.5 retarget=false reduceMotion=false
21:33:54.939 frame property=translationY value=176.0 velocity=0.0
21:33:54.991 frame property=translationY value=25.47619 velocity=-2832.347
21:33:55.008 frame property=translationY value=-11.653991 velocity=-1522.8531
21:33:55.025 frame property=translationY value=-27.305296 velocity=-378.4515
21:33:55.109 frame property=translationY value=3.3947585 velocity=160.66325
21:33:55.192 frame property=translationY value=-0.16368242 velocity=-47.326332
21:33:55.209 frame property=translationY value=0.0 velocity=0.0
```

The second positive-control tap repeated the same overshoot (`-27.305298` minimum).

### 3. Retarget regression — PASS

The calibrated rerun used a 20 ms tap offset to land mid-flight on the POCO F1. Both directions show
continuous values, `retarget=true`, the interrupted event before the retargeted settle event, and one
completion for the surviving envelope.

Enter -> exit:

```text
21:37:21.662 animateTo ... translationY=0.0 ... retarget=false reduceMotion=false
21:37:21.741 frame property=translationY value=49.93779 velocity=-1384.227
21:37:21.758 frame property=translationY value=30.690548 velocity=-903.99335
21:37:21.759 transitionEnd phase=enter finished=false interrupted=true
21:37:21.760 animateTo ... translationY=176.0 ... retarget=true reduceMotion=false
21:37:21.774 frame property=translationY value=25.855927 velocity=967.9167
21:37:21.976 transitionEnd phase=exit finished=true interrupted=false
```

Exit -> enter:

```text
21:37:38.998 animateTo ... translationY=176.0 ... retarget=false reduceMotion=false
21:37:39.101 frame property=translationY value=147.91574 velocity=834.2762
21:37:39.117 frame property=translationY value=158.70541 velocity=533.4452
21:37:39.118 transitionEnd phase=exit finished=false interrupted=true
21:37:39.120 animateTo ... translationY=0.0 ... retarget=true reduceMotion=false
21:37:39.134 frame property=translationY value=158.62932 velocity=-1216.7592
21:37:39.336 transitionEnd phase=enter finished=true interrupted=false
```

The earlier 120 ms calibration attempts are left in the raw log but not used for the verdict because
the second toggle landed at the rest boundary.

### 4. Reduce-motion — PASS

With `animator_duration_scale=0` and `transition_animation_scale=0`, both toggles used the instant
path: `reduceMotion=true`, no frame samples between `animateTo` and `transitionEnd`, and semantic
completion still fired.

```text
21:34:56.442 animateTo ... translationY=176.0 ... stiffness=1500.0 dampingRatio=1.0 retarget=false reduceMotion=true
21:34:56.443 transitionEnd phase=exit finished=true interrupted=false
21:34:59.660 animateTo ... translationY=0.0 ... stiffness=1500.0 dampingRatio=1.0 retarget=false reduceMotion=true
21:34:59.660 transitionEnd phase=enter finished=true interrupted=false
```

## Restore and cleanup

- Restored `animator_duration_scale` to `1`.
- Restored `transition_animation_scale` to `1`.
- Cleared the POCO stay-awake override with `svc power stayon false`.
- Reverted all temporary instrumentation and the scratch default-spring trigger.
- Diff check after revert showed no code, dependency, or lockfile drift. The remaining intended
  changes are this evidence write-up, the raw log, and the task notes update.

Next: maintainer ratifies the device PASS, then owns the human gates (`device-verified`, MOT-001
closure, docs-closed, and merge).
