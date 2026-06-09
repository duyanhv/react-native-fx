# U3-006 — Device Verification

## Date

2026-06-08

## Result

pass — Android and iOS both verified by the maintainer (2026-06-08).

## Platform / build

- Android: POCO F1, API 35 (above the API-33 AGSL floor); post-fix build (commit `de4e306`).
- iOS: verified by the maintainer on iOS 17+. Shaders render through the hosted Metal path, which
  means the `FxShaders.bundle` metallib resolves the `fx_stitchable_*` functions in the running app
  (the empirical REAL-002 concern holds; the ledger closure itself stays with U3-005).

## Findings (Android — all checks pass)

- **Render:** `fractal-clouds` renders immediately, no black/blank frame, no crash; animation
  advances smoothly when idle.
- **Regression #1 — blank on switch (FIXED):** tapping each of the other nine chips renders that
  shader's own pixels immediately; no blank box, no stale previous shader; rapid switching across
  all ten ids does not crash or corrupt.
- **Regression #2 — flicker on intensity drag (FIXED):** dragging the intensity slider end-to-end
  on `plasma`/`edge-glow` changes brightness continuously and smoothly — no flicker, no blank
  frames.
- **Clock continuity:** during an intensity drag the animation keeps advancing from where it was —
  no reset to t=0, no stutter.
- **Lifecycle:** navigating away pauses and returning resumes immediately with no black frame;
  background/foreground resumes cleanly with no GPU stall.
- **Touch passthrough:** the decorative hosted shader does not swallow touches to RN content
  beneath it.

This confirms the AGSL runtime read path renders all ten curated ids on a physical device, and that
discrete `intensity` updates mutate the live uniform in place (no per-tick remount).

## Evidence

- Observed live by the maintainer: Android on the connected POCO F1 (API 35), iOS on iOS 17+.
  No screenshots/logs captured.

## Outstanding

- None for U3-006's device gate — both platforms pass. REAL-002 (iOS metallib) and REAL-003
  (Android AGSL runtime read) ledger closures remain owned by U3-005, not this task.
