# U3-003 — device scenario

## Goal

Verify the Android material on device (sweep finding B1, FX-003): the own-content
translucent composition + `RenderEffect` blur renders, `intensity` and `variant` drive it
live, and `interactive` is inert. Human gate.

## Device

Any Android 12+ (API 31+) device or emulator — the POCO F1 (Android 15 / API 35) is the
sweep baseline. Below-31 degradation (the unblurred stack) is **not exercisable on an
API 35 device**; it is covered by the code path (`Build.VERSION.SDK_INT` guard in
`FxMaterialView.applyBlur`) and the manifest gate (`select()` test: below 31 the ladder
degrades to the `via:draw` rung, never `none`).

## Steps

### B1-1 · material renders

1. Install the Debug build and open the U3-002 task → the `hosting-parity` screen → the
   glass section (it drives `effect="material"` + `materialConfig`).
2. The material tile renders a translucent frosted panel over its own stack — not absent
   (the B1-1 failure mode: the empty host showing the backdrop sharp), not a flat or dark
   box. Capture a still.

### Intensity

3. Set the intensity slider low (~0.2), capture a still; set it high (~1.0), capture a
   still. The two stills visibly differ in blur radius and overlay opacity. The change
   must apply live (no flash/remount — the in-place `setIntensity` path).

### Variant

4. With variant `regular`, capture a still; switch to `clear`, capture a still. `clear`
   is visibly lighter/more transparent than `regular` (scrim weight 0.28 vs 0.55).

### Interactive (inert)

5. Toggle the press-response switch on and press the tile: no crash, no behavior change —
   the knob is accepted silently on Android. Capture a still and record a one-line
   reading.

### Scroll

6. Scroll the stage with the material mounted: no jank regression worth flagging against
   the B2 parity baseline (~60 fps).

## Failure signs

- The tile is absent/transparent (the host mounted nothing — the original B1-1 defect).
- A flat opaque box (the degradation law violated).
- A crash when `materialConfig` arrives or `interactive` toggles.
- The tile flashes blank on intensity drag (remount instead of in-place update).

## Evidence

Stills only into `evidence/device-run-<date>/` — no video recordings committed.
