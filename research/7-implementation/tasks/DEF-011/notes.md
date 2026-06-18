# DEF-011 Phase 2 — headless-done notes

**Date:** 2026-06-17
**State:** headless-done (native drag/tilt uniform writes + axis masking + native settle + visible dots wiring + example coexistence)
**Next:** Human runs the hardware device gate to verify axis claim, smooth tracking, settle, and coexistence

## What changed

### Native uniform ABI

- **iOS `FxUniforms` struct** (`packages/ios/FxSurfaceView.swift:16-17`): appended
  `var drag = SIMD2<Float>.zero` and `var tilt = SIMD2<Float>.zero` after `touch`.
- **MSL `FxUniforms` struct** (`packages/ios/Shaders/FxShaders.metal:11-12`): appended
  `float2 drag;` and `float2 tilt;` after `touch`.
- **MSL BYO runtime preamble** (`packages/ios/FxSurfaceView.swift:71`): updated the
  inline `FxUniforms` definition to include `float2 drag; float2 tilt;`.
- **All ten `[[stitchable]]` signatures** (`packages/ios/Shaders/FxShaders.metal`):
  added `float2 drag, float2 tilt` to every signature.
- **Hosted SwiftUI call site** (`packages/ios/FxShaderView.swift:66-67`): passes idle
  defaults `.float2(0, 0)` for both.
- **Android per-shader named uniforms** (`packages/android/.../FxSurfaceShaderView.kt`):
  added `supportsDragUniform`/`supportsTiltUniform` (declared-uniform membership) and
  gated `setFloatUniform("drag", x, y)` / `("tilt", x, y)` writes in `onDraw`.

### Native write + settle

- **iOS** (`packages/ios/FxSurfaceView.swift:572-602`): `updateDragTiltUniforms(origin:current:dragAxis:)`
  converts points to `[0,1]` y-up UV, computes axis-masked `drag` and full-2D `tilt`,
  clamps to `[-1,1]`, and writes them into `targetDrag`/`targetTilt`. The `draw(in:)`
  loop eases both toward their targets with the same `0.35` factor used for
  `pressDepth`.
- **iOS press handler** (`packages/ios/FxPressHandler.swift:96-156`): captures the
  gesture origin at `.began`, writes drag/tilt on `.changed`, and settles both to
  zero on `.ended`/`.cancelled`/`.failed` and on `detach`.
- **Android** (`packages/android/.../FxSurfaceView.kt:302-333`):
  `updateDragTiltUniforms(originX, originY, x, y, dragAxis)` converts view points to
  y-up UV, computes masked drag and tilt, and forwards targets to the effect view.
- **Android press handler** (`packages/android/.../FxPressHandler.kt:70-148`): captures
  origin on `ACTION_DOWN`, writes drag/tilt on `ACTION_MOVE`, and settles to zero on
  `ACTION_UP`/`ACTION_CANCEL`.
- **Android effect view** (`packages/android/.../FxSurfaceShaderView.kt:119-126`,
  `204-236`): `setDragTiltUniforms` stores targets; `onDraw` eases pending values with
  `0.35` and writes them when the shader declares the uniforms.

### Coordinate-space contract

Both platforms reuse the existing press-path point→UV conversion:

- `touch` = current pointer UV, `[0,1]`, y-up.
- `drag` = `clamp(currentTouchUV − originTouchUV, -1, 1)`, axis-masked by `dragAxis`.
- `tilt` = `clamp((currentTouchUV − 0.5) * 2, -1, 1)`, full 2D, pointer-derived, not
  axis-masked.

### Visible dots wiring (demo-only, not a catalog contract)

To make claiming observable for the hardware gate, the `dots` shader now reads
`drag` and `tilt` on both platforms:

- **MSL** (`packages/ios/Shaders/FxShaders.metal:178-185`):
  - `uv += u.drag * 0.25;`
  - `float3 tiltBias = float3(u.tilt.x, u.tilt.y, 0.0) * 0.35;`
  - `col += tiltBias * mask;`
- **AGSL** (`packages/android/.../assets/shaders/dots.agsl:16-22`):
  - `uv += vec2(drag.x, -drag.y) * 0.25;` (y-down UV needs the y flip)
  - `vec3 tiltBias = vec3(tilt.x, tilt.y, 0.0) * 0.35;`
  - `col += tiltBias * mask;`

When `drag == (0,0)` and `tilt == (0,0)` the added terms are zero, so the output is
byte-for-byte the original `dots`. This wiring is intentionally kept out of the
`CapabilityManifest`, the manifest-conformance catalog tests, and the curated docs — it
is a reviewable implementation detail for the hardware gate, pending a planner
decision on whether to promote drag/tilt-reading as a guaranteed `dots` capability.

### Example spike screen

- **Extended** `example/screens/drag-axis-spike.tsx`:
  - The existing five sections now visibly track the drag/tilt through the `dots`
    wiring above.
  - Added a **@gorhom/bottom-sheet coexistence** section with a
    `dragAxis="horizontal"` `dots` shader inside a bottom-sheet. The deps were
    already in `example/package.json`; no new deps were added.

### Research docs

- **structure.ios.md § Touch contract**: added the axis-aware drag/tilt mechanic
  (claim/yield, UV basis, uniform writes, settle, standalone-only `both`).
- **structure.android.md § Touch contract**: added the same mechanic localized to
  Android's `requestDisallowInterceptTouchEvent` + `declaredUniforms` gating.

### Tier-1 tests

- Added `drag/tilt uniform ABI (DEF-011 Phase 2)` describe block in
  `packages/src/__tests__/manifest-conformance.test.ts` with 5 tests:
  1. Swift `FxUniforms` contains `drag`/`tilt`.
  2. MSL `FxUniforms` contains `float2 drag`/`float2 tilt`.
  3. Every `[[stitchable]]` signature contains `float2 drag, float2 tilt`.
  4. Hosted call site passes idle `float2(0, 0)` defaults.
  5. AGSL `dots` declares `uniform vec2 drag;` and `uniform vec2 tilt;`.
- Added `drag/tilt masking math (DEF-011 Phase 2)` describe block with 6 pure-JS
  mirror tests for tilt, horizontal/vertical/both masking, clamping, and zero drag.

## Why (a log, not narrative)

- **Native owns the loop.** Every drag/tilt write and the settle easing happen in the
  native render loop (`CADisplayLink` on iOS, `Choreographer` on Android). No JS frame
  loop, no Reanimated, no worklets.
- **The scalar-only `setUniform` path stays scalar.** `drag`/`tilt` are vec2 and are
  written natively; `controlled` mode continues to expose only `intensity` and
  `pressDepth` through `setUniform`.
- **iOS `both` does not suppress the parent scroller.** It relies on simultaneous
  recognition + `cancelsTouchesInView = false`, exactly as settled in Phase 1. The
  docs now explicitly call `both` standalone-only on iOS.
- **AGSL y-down UV requires a sign flip for drag.y.** The uniform itself stays y-up
  (same as `touch`); only the local `uv` coordinate flip is shader-local.
- **Settle shares the press-depth easing constant.** Using `0.35` on both platforms
  keeps the spring-back feel consistent with the existing press highlight.

## Headless gates (all green)

| Gate | Result |
|---|---|
| `bun run lint` (Biome, packages) | PASS — 37 files, no fixes |
| `bun run tsc` (packages) | PASS — no errors |
| `bun run build` (packages) | PASS |
| `bun run test` (packages) | PASS — 89/89 |
| `bun run swift:lint` | PASS — clean |
| `bun run tsc` (example) | PASS — no errors |
| `:react-native-fx:compileDebugKotlin` | BUILD SUCCESSFUL |
| `pod install` (example iOS) | PASS |
| `xcodebuild -scheme reactnativefxexample` (iOS 18.5 sim) | BUILD SUCCEEDED |

## Chosen dots mapping for review

The visible proof harness in `dots` translates the dot grid by `drag * 0.25` and adds
a color bias of `tilt * 0.35` to the lit dots. At rest both contributions are zero,
so there is no at-rest regression. This is flagged here as a demo wiring, not a
promoted capability.

## Unverified claims (awaiting hardware device gate)

1. **Axis claim coexists with cross-axis scroller (iOS):** A `dragAxis="horizontal"`
   shader inside a vertical `ScrollView` claims horizontal drags while the scroller
   scrolls on vertical drags; inverse for `dragAxis="vertical"` inside a horizontal
   scroller.
2. **Axis claim coexists with cross-axis scroller (Android):** Same test — the shader
   captures its claimed axis; the scroller scrolls the cross-axis.
3. **Drag offset + pointer-tilt track the finger smoothly with no per-frame JS:** The
   `dots` field should follow the finger; verify under JS-thread load.
4. **Native settle/spring-back on release:** On `.ended`/`.cancelled` both `drag` and
   `tilt` ease back to `(0,0)` using the press-depth smoothing.
5. **`dragAxis="both"` behavior:** Android suppresses the parent scroll; iOS keeps
   simultaneous recognition and does not suppress the parent (standalone-only).
6. **W-F2 press when finger leaves the shape along the claimed axis:** The press event
   path still behaves sanely when the drag carries the finger outside the surface.
7. **W-F3 Android cross-axis scroll catch at start:** The brief `requestDisallowIntercept`
   on `ACTION_DOWN` may create a perceptible hitch at scroll start; judge naturalness.
8. **U8-002 coexistence cases:** The drag-axis shader inside the bottom-sheet/RNGH
   scroller should not double-handle or sever RN touch.
9. **Loop pauses off-window (rule #1):** The shader loop stops when the surface leaves
   the window or the app backgrounds.

## Files changed (inventory)

```
packages/ios/FxSurfaceView.swift                              — FxUniforms drag/tilt, runtime preamble, updateDragTiltUniforms, draw-loop easing
packages/ios/FxPressHandler.swift                            — drag/tilt write + settle
packages/ios/FxShaderView.swift                              — stitchable call site idle defaults
packages/ios/Shaders/FxShaders.metal                         — FxUniforms drag/tilt, all stitchable sigs, dots demo wiring
packages/android/src/main/java/expo/modules/reactnativefx/FxSurfaceView.kt       — updateDragTiltUniforms
packages/android/src/main/java/expo/modules/reactnativefx/FxPressHandler.kt      — drag/tilt write + settle
packages/android/src/main/java/expo/modules/reactnativefx/FxSurfaceShaderView.kt — drag/tilt uniform support + easing
packages/android/src/main/assets/shaders/dots.agsl           — drag/tilt declarations + demo wiring
packages/src/__tests__/manifest-conformance.test.ts          — Tier-1 tests (11 new)
example/screens/drag-axis-spike.tsx                          — visible tracking + bottom-sheet coexistence section
research/5-realization/structure.ios.md                      — drag/tilt mechanic pinned
research/7-implementation/tasks/DEF-011/notes.md             — this file
```
