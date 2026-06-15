# U3-003 — device verification results

Scenario: `evidence/headless.md` (B1, FX-003). Human gate — this file records the agent-device
run and a PASS/FAIL recommendation; the maintainer ratifies `device-verified`.

## Results — 2026-06-11 · POCO F1 (Android 15 / API 35), agent-device — **PASS (recommend)**

Fresh `./gradlew :app:assembleDebug` build, `adb install -r` (APK timestamp current), driven via
agent-device. The B1 scenario is split across the two screens that wire the material: the
**hosting-parity glass section** (U3-002 card) drives `effect="material"` + `materialConfig`
(variant + press-response over a moving `loop` shader); the **android-material screen** (U3-003
card) drives `effect="material" intensity={…}` over an animated, recoloring block (the slider on
the glass section drives the `loop` shader, not the material, so intensity is exercised on the
android-material screen). Stills in `evidence/device-run-2026-06-11/`.

### B1-1 · material renders — **PASS**
The material tile renders a **translucent frosted panel over its own stack** on both screens — not
absent (no sharp backdrop showing through an empty host), not a flat or dark box.
`B1-1-render-variant-regular.png` (glass section, frost over the loop shader) and `intensity-*.png`
(android-material, frost over the block).

### Intensity (live, in place) — **PASS**
On the android-material screen, intensity **0.20** (`intensity-low.png`) vs **0.98**
(`intensity-high.png`): the blur radius **visibly increases** — the block goes from crisp edges at
low to heavily softened at high. The change applied **live with no flash/remount** (discrete slider
taps each updated the running view — the in-place `setIntensity` path). Overlay-opacity difference
is present but subtle against the white stage background; the blur-radius difference is unmistakable.

### Variant — **PASS**
Glass section, `regular` (`variant-regular.png`) vs `clear` (`variant-clear.png`) at matched
framing: `regular` is a heavier, more opaque frost (the loop-shader bands are strongly obscured);
`clear` is visibly lighter / more transparent (bands show through). Consistent with the scrim
weights (regular 0.55 vs clear 0.28). The switch applied in place.

### Interactive (inert) — **PASS**
Glass section, press-response toggled to `interactive`, then the tile pressed (tap + 800 ms
long-press) (`interactive-inert-pressed.png`): **no crash, no behavior change** — the tile renders
identically to `static`, no press feedback (no scale/ripple). App process unchanged (PID stable),
no `FATAL`/exception in logcat. The `interactive` knob is accepted silently on Android, as designed.

### Scroll — **PASS**
With the material mounted, scrolling the stage held **UI 59.8 fps** with **0 stutters (4+)** on the
dev HUD (`scroll-perf-hud.png`); cumulative session dropped-frame rate ~0.9% — no jank regression
against the B2 ~60 fps parity baseline.

### Staleness (bonus observation)
The android-material block moves and recolors (red→green→blue) behind the blur; the blurred output
**tracks the live content** (green block → blurred green), so no `RenderEffect` staleness is present.

### Not exercisable on this device
Below-API-31 degradation (the unblurred stack) is not reachable on an API 35 device — covered by the
`Build.VERSION.SDK_INT` guard in `FxMaterialView.applyBlur` and the manifest `select()` tests.

## Recommendation
All B1 sub-scenarios **PASS**. Recommend the maintainer ratify `device-verified`; FX-003 closes in
`21` only after that tick. Leave U3-003 `device-pending` until ratified.
