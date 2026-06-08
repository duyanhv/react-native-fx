# U3-006 — Device Scenario

## Goal

Prove that all ten curated shaders render through native MSL/AGSL on the hosted
substrate, update from discrete public uniforms, and pause/resume their native
clock without JS driving frames.

## Steps

1. Open the example app's U3-006 shader screen.
2. Select each shader id: `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`,
   `dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`.
3. Leave each shader visible for at least five seconds.
4. Move the intensity control from low to high and back.
5. Switch rapidly across all ten shader ids.
6. Navigate away from the shader screen, then return.
7. Background the app, wait two seconds, then foreground it.

## Expected result

- Every shader renders visible pixels immediately, with no blank frame, crash, or
  stale previous shader.
- Animated shaders advance while visible.
- Intensity changes affect the render smoothly after a discrete prop update.
- Navigation and backgrounding pause the native clock; returning resumes without a
  black frame or GPU stall.
- Touches pass through decorative hosted shader overlays when they sit above RN
  content.

## Failure signs

- Black frame, blank view, crash, corrupted output, or stale pixels after switching.
- Frozen animation while the view is visible.
- Intensity changes require per-frame JS or do not affect output.
- Native clock continues off-window or in the background.
- Decorative hosted shader blocks RN content touches.

## Platform

- iOS: yes, iOS 17+; simulator is acceptable for Metal pixels.
- Android: yes, API 33+; physical Android device is strongly preferred for AGSL.
