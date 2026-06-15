# DEF-009 — Choreographer loop lifecycle (logcat)

Device: POCO F1, Android 15 / API 35, hardware GPU. App: `expo.modules.fx.example`.

Captured via temporary `Log.d("FxContentDistortGate", …)` instrumentation added to
`FxContentDistortion.kt` (startLoop / stopLoop / resume / update->enable / every 30th frame).
The instrumentation was reverted with targeted edits after capture (see device.md).

`target` in the logs is the `intermediateContainer` child the effect attaches to;
`attached` is `target.isAttachedToWindow` at that instant.

## 1. Fresh mount — ripple ON by default, screen untouched (DEFECT)

```
D FxContentDistortGate: update->enable (attached=false)
D FxContentDistortGate: resume (enabled=true attached=false)
```

No `startLoop`, no `frame #…`. The loop never starts on initial mount: at
`applyResolvedConfig` the child container is not yet attached, and the `resume()` fired from
the parent `FxNativeView.onAttachedToWindow()` runs before the child attaches — both
`startLoop()` calls are skipped. Content renders crisp (undistorted) despite "ripple on".

## 2. Manual ripple toggle off→on (loop starts — workaround)

```
D FxContentDistortGate: update->enable (attached=true)
D FxContentDistortGate: startLoop (attached=true)
D FxContentDistortGate: frame #30 t=0.48732477
D FxContentDistortGate: frame #60 t=0.98865414
D FxContentDistortGate: frame #90 t=1.4898146
D FxContentDistortGate: frame #120 t=1.9912492
```

By toggle time the view is fully attached, so `startLoop()` runs and `time` advances at ~60 fps.

## 3. Background (HOME) then foreground (loop pauses and resumes — rule #1 honored)

```
>>> HOME
D FxContentDistortGate: stopLoop
   (5 s of total silence — no frame # lines)
>>> foreground
D FxContentDistortGate: resume (enabled=true attached=true)
D FxContentDistortGate: startLoop (attached=true)
D FxContentDistortGate: frame #750 t=0.11729934
D FxContentDistortGate: frame #780 t=0.618941
D FxContentDistortGate: frame #810 t=1.1201546
D FxContentDistortGate: frame #840 t=1.6214769
```

The frame loop stops while backgrounded and resumes on return (here the view stays attached, so
`resume()` succeeds).

## 4. Navigate away to the task list, then back into DEF-009

```
>>> navigate away
D FxContentDistortGate: frame #1950 t=20.167837
D FxContentDistortGate: frame #1980 t=20.669039
D FxContentDistortGate: frame #2010 t=21.17029
D FxContentDistortGate: stopLoop
>>> navigate back
D FxContentDistortGate: update->enable (attached=false)
D FxContentDistortGate: resume (enabled=true attached=false)
```

Navigating away stops the loop on detach (correct — no off-screen frames). Navigating back hits
the same mount-start defect as §1: no `startLoop`, ripple inert until toggled again.
