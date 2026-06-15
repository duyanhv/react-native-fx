# U7-003 — Device Scenario

## Goal

Verify that Android transient presence uses the non-bouncy platform catalog spring while keeping
retarget and reduce-motion behavior intact.

## Why per-frame value capture, not slowed motion

The package pins `androidx.dynamicanimation:dynamicanimation:1.0.0`, whose physics springs ignore
the global animator duration scale — the driver gates reduce-motion manually for the same reason.
`animator_duration_scale 5` therefore does **not** stretch the ~120 ms envelope, and screen capture
cannot resolve overshoot at that duration (the U7-002 finding). Overshoot is measured from
per-frame property values in logcat instead, via temporary driver instrumentation — the same
log-and-revert pattern as the U6-001/U6-002 gates.

## Setup

- Platform: physical Android device, API 24+.
- Build: example app rebuilt and reinstalled from the gate commit — verify the APK timestamp
  against the source before `adb install -r`; set `adb reverse tcp:8081 tcp:8081` for Metro.
- Temporary instrumentation (NOT shipped — revert after the run, the U6-002 pattern): a
  `DynamicAnimation.OnAnimationUpdateListener` added to each spring in
  `FxAnimationDriver.createAnimation`, logging per-frame values tagged `U7-003`
  (property name + value), plus one line at `animateTo` carrying the target vector and the
  applied stiffness/damping. Driver mechanics unmodified — logging only.
- Screen: presence demo (`preset="transient"`, no explicit `motion`).

## Steps

1. **No-overshoot (the MOT-001 cell).** Toggle visible on, wait for rest, toggle off; repeat
   three times. Pull logcat. For each enter (`translationY: +contentHeight → 0`), assert no
   sample crosses below `0` by more than ~1 px; for each exit (`0 → +contentHeight`), no sample
   beyond `+contentHeight` by more than ~1 px. The `animateTo` line must show
   `stiffness=1500 / dampingRatio=1.0` for presence envelopes. (Translation is the unbounded
   channel that proves damping; alpha is clamped and proves nothing.)
2. **Positive control (proves the probe detects bounce).** Drive one default-spring envelope
   through the same listener — a scratch trigger that calls the content driver with no spring
   parameter (the stock U6 path). The log MUST show the translation channel crossing past its
   rest value (~16 % with `DAMPING_RATIO_MEDIUM_BOUNCY`). Without this row, "no overshoot" is
   indistinguishable from a broken probe.
3. **Retarget regression.** During an exit, toggle visible back on before rest; during an enter,
   toggle off before rest. The logged values stay continuous (no snap to the away vector); the
   cut-short `interrupted:true` transition event strictly precedes the retargeted settle event;
   exactly one completion fires per surviving envelope.
4. **Reduce-motion.** `adb shell settings put global animator_duration_scale 0` and
   `transition_animation_scale 0`, then toggle visible on and off: single-frame placement, no
   per-frame samples in the log, semantic completion still fires. Restore both scales to `1`.

## Expected result

- Enter slides up from the bottom edge and fades in; the logged translation approaches rest
  monotonically (no sign-crossing past rest).
- Exit slides down toward the bottom edge and fades out with no bounce-back in the values.
- The positive-control envelope shows measurable overshoot, validating the probe.
- Mid-flight retargets do not snap or restart; the cut-short transition event fires before the
  retargeted settle event, and only the final envelope completes.
- Reduce-motion remains single-frame: no animated frames, semantic completion still fires.

## Failure signs

- A presence envelope's translation samples cross past rest beyond the ~1 px epsilon.
- The positive control shows NO overshoot (broken probe — the run is invalid, not a PASS).
- The `animateTo` log shows default damping (`0.5`) on a presence envelope (the plumb is dead).
- Retargeting jumps to the hidden vector or emits duplicate completion events.
- Scale-0 toggles still animate the presence envelope.
- The content unmounts before the exit finishes.

## Teardown

- Revert the instrumentation patch entirely (`git checkout` the driver + any scratch trigger);
  diff-check the working tree afterward — no dependency or lockfile drift.
- Restore animator and transition scales to `1`.

## Accessibility

Presence motion should not add a decorative accessibility element. The wrapped content remains the
reachable element at rest.
