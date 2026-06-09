# U3-006 notes

## 2026-06-09

- **`reviewed` gate passed.** Maintainer reviewed and confirmed U3-006 done. Checklist `reviewed`
  ticked; `progress.md` detail-block `State:` corrected from the stale `headless-done` to
  `ready-to-merge` (the table already read `ready-to-merge`). Only `merged` remained — the human gate.
- **`merged` gate passed.** Maintainer authorized the finishing commit on `integration/0.1.x`;
  `State:` and the `merged` checkbox flipped to done. U3-006 is now fully closed.
- Next: close the REAL-002/IMPL-001/U1-001 loop — U3-006's iOS device pass is candidate evidence for
  REAL-002, owned by U3-005.

## Unverified claims

- **Render path VERIFIED on both platforms (2026-06-08).** Android: all ten AGSL shaders on a
  POCO F1 (API 35), both regression fixes confirmed live (no blank on switch, no flicker/clock-jump
  on intensity drag). iOS: verified by the maintainer on iOS 17+ (hosted Metal path renders). See
  `evidence/device.md`. The `device-verified` gate is met. REAL-002 (iOS metallib) and REAL-003
  (Android AGSL read) ledger closures remain owned by U3-005, not U3-006.
- **Android:** the `<API-33` degradation is verified on an API-29 emulator (`shader = null` →
  blank, as designed).
- **iOS:** shader render unverified; depends on REAL-002 (`FxShaders.bundle/default.metallib`
  actually bundling the `fx_stitchable_*` functions). The hosted box was black until the library
  was pointed at the fx bundle (fixes #3); on-device render still to confirm.
- Device verification batches with U3-005 (REAL-002 metallib + REAL-003 AGSL asset path).
- The latest mechanics are in **Post-review fixes #3** below — earlier "iOS rendering" / "Android
  rendering" / Android-1/2/3 entries describe approaches #3 superseded.

## What changed and why

- **Implemented** — 10 `[[stitchable]]` MSL fragment functions appended to `FxShaders.metal`:
  - 5 mirror the existing 5 curated shaders in `[[stitchable]]` form (reuse same helpers; individual uniforms)
  - 5 new effects: aurora (flowing ribbon curtains), noise-field (layered noise × palette), plasma (sinusoidal × color centers), caustics (underwater light refraction), edge-glow (rim light with animated color)
  - Shared helpers (`hash21`, `vnoise`, `fbm`, `palette`, `prism`) reused unchanged
  - Existing 5 non-stitchable fragment functions kept byte-for-byte
- **iOS rendering** — new `FxShaderView.swift`: `TimelineView(.animation)` + `GeometryReader` + `.colorEffect`; maps all 10 ids via `ShaderLibrary.default[dynamicMember: name](args...)`; `pressDepth` and `touch` stay idle defaults on the hosted path. The `shaderFor` helper is `@available(iOS 17.0, *)` so the `Shader` return type compiles below iOS 17.
- **iOS dispatch** — `FxHostedView.swift`'s `makeSwiftUIView` now dispatches all 10 shader ids to `FxShaderView`
- **Android AGSL** — 10 `.agsl` files under `packages/android/src/main/assets/shaders/`: one per curated id; each self-contained with helpers (hash21/vnoise/fbm/palette/prism as needed) and `half4 main(float2 fragCoord)`. AGSL uses `clamp(x, 0.0, 1.0)` for saturate, `vec2`/`vec3`/`vec4` for float types.
- **Android rendering** — new `FxShaderView.kt`: loads AGSL source once from assets; `Choreographer.FrameCallback` drives `time` uniform each frame; `RenderEffect.createRuntimeShaderEffect` on API 33+ (`setRenderEffect`); below API 33, view stays transparent (matches `{via:'none'}` per structure.android.md + 02 select)
- **Android dispatch** — `FxHostedView.kt`'s `mountEffect` dispatches all 10 shader ids to `FxShaderView`
- **TypeScript** — `catalog.ts` widened `ShaderId` from 5 to 10 ids; build output verified all 10 in `.d.ts`
- **Example** — `example/App.tsx` gains a U3-006 shader screen with id selector grid + intensity step buttons; navigable from U3-001 screen
- **Headless** — all 6 checks pass: `tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test` (18 passed), `git diff --check`

### Post-review fixes (2026-06-08)

- **iOS-1** — `.colorEffect` signature: all 10 stitchable functions changed from `(float2 position, Shader::SwiftUI::Layer layer, ...)` to `(float2 position, half4 color, ...)`. `.colorEffect` passes the implicit pixel color, not a layer; `Shader::SwiftUI::Layer` is the `.layerEffect` signature. Removed `#include <SwiftUI/SwiftUI_Metal.h>`.
- **iOS-2** — time precision: `FxShaderView.swift` wraps the absolute `timeIntervalSinceReferenceDate` with `truncatingRemainder(dividingBy: 100.0)` before casting to `Float`, keeping per-frame deltas within Float32 resolution.
- **Android-1** — all 10 `.agsl` files now declare the full uniform contract (`time`, `resolution`, `intensity`, `pressDepth`, `touch`, `fx_shader`) so `RuntimeShader.setFloatUniform` never throws on an undeclared uniform.
- **Android-2** — every `.agsl` declares `uniform shader fx_shader;` so `createRuntimeShaderEffect(shader, "fx_shader")` has a valid uniform binding target.
- **Android-3** — `FxShaderView.kt` caches the `RuntimeShader` in `init` (parsed once); per-frame only writes uniforms and creates a new `RenderEffect`.
- **Android-4** — added `onWindowFocusChanged` to pause/resume the `Choreographer.FrameCallback` when the app backgrounds/foregrounds (complements `onAttachToWindow`/`onDetachedFromWindow` for navigation).
- **<API 33 reconciliation** — the transparent no-op fallback matches `structure.android.md`'s single `shader`/decorative rung at `os:33` with no sub-33 rung, and the `02` selector's `{via:'none'}` when no rung qualifies. No ad-hoc fallback invented.

### Post-review fixes #2 (2026-06-08)

- **iOS Metal compile** — `fx_stitchable_loop` had a local `float3 color` that redefined the `half4 color` parameter (`.colorEffect` implicit input). Renamed to `float3 loopColor`. No other stitchable function had this conflict.
- **Android duplicate callbacks** — `onAttachedToWindow` and `onWindowFocusChanged` could both schedule frame callbacks without a guard. Added `isCallbackScheduled` flag; `startLoop()` is idempotent, `stopLoop()` just clears `isActive`. The callback resets `isCallbackScheduled = false` on inactive `doFrame`.
- **Android time precision** — absolute `frameTimeNanos / 1_000_000_000.0f` cast to Float loses per-frame delta at uptime magnitudes. Now tracks `baseTimeNanos` from first frame, computes `elapsedNanos % 100_000_000_000L` (100s window), then converts to Float seconds.

### Post-review fixes #3 — device debugging (2026-06-08)

Supersedes the iOS/Android rendering descriptions above.

- **iOS black box — wrong shader library.** `FxShaderView` resolved functions via
  `ShaderLibrary.default` (the *app's* default.metallib), but the `fx_stitchable_*` functions live
  in the fx pod's `FxShaders.bundle/default.metallib`. Now resolves `ShaderLibrary(url:)` against
  that bundle using the same search list as `FxSurfaceView` (`Bundle(for: FxHostedView.self)` +
  resource/bundle URLs), falling back to `.default`. REAL-002 still gates whether the metallib
  ships the functions.
- **Android rendering — generative path.** Switched from `RenderEffect.createRuntimeShaderEffect` /
  `setRenderEffect` to `Paint.setShader` + `canvas.drawRect` in `onDraw`, per the Android AGSL
  docs: `createRuntimeShaderEffect` filters *existing* view content via an `eval`'d input shader; a
  generative shader draws straight through a `Paint`. The frame callback now `invalidate()`s.
- **AGSL uniform trim.** Dropped `uniform shader fx_shader`, `pressDepth`, `touch` from all 10
  `.agsl` (only the RenderEffect/interactive path needed them); `dots.agsl` hardcodes `bulge = 0.0`
  on the decorative path. Contract is now `time`/`resolution`/`intensity`, matched exactly in
  `onDraw`. (This corrects fixes #1's Android-1/Android-2, which added uniforms for the now-removed
  RenderEffect path.)
- **`width == 0` guard** added in `onDraw`.
- **Device finding:** an API-29 emulator confirms the degradation (no shader); render verification
  requires API 33+.

### Post-review fixes #4 — Android remount blank (2026-06-08)

Symptom (device, API 33+): `fractal-clouds` renders on first mount, but switching to any other
shader **or** changing `intensity` blanks the preview box.

- **Root cause.** Every prop batch, `FxHostedView.applyResolvedConfig` → `mountEffect` does
  `removeHost()` + creates a **new** `FxShaderView` child. `FxHostedView` is an `ExpoView`
  (`LinearLayout`) with the default `shouldUseAndroidLayout = false`, which swallows the new
  child's `requestLayout()` (RN issue #17968) — so a child added *after* the host's initial RN
  layout pass is never measured and renders at 0×0. The first child survives only because it is
  present during the initial layout. Confirmed against `references/expo/.../ExpoView.kt:30-34`.
- **Fix.** `FxHostedView` now sets `shouldUseAndroidLayout = true` (re-runs `measureAndLayout()`
  on `requestLayout`) **and** overrides `onLayout` to lay the decorative child explicitly to the
  host bounds — distilled from the only production usage, `ExpoComposeView.kt:71-96`. Reads
  RN-assigned bounds; never writes layout to Yoga (rule #9). Pinned in `structure.android.md`
  under Hosting mechanics.
- **Parity note.** iOS recreates the hosted controller the same way per prop batch
  (`FxHostedView.swift`); UIKit constraints re-size the new subview automatically, so the defect
  is Android-local. The recreate-on-prop-batch design is unchanged on both platforms.

**Unverified:** the fix is **not device-verified** — layout + AGSL are device-gated (API 33+).
Headless Kotlin compile was not run this session (gradle build declined). Needs a human pass.

**Secondary observation (not fixed):** recreating the view on an *intensity* change resets the
native clock (`baseTimeNanos → 0`, animation restarts) and re-parses the AGSL each tap. The dead
`FxShaderView.setIntensity` shows in-place update was the original intent. Candidate follow-up:
reuse the child and mutate uniforms/shader-source in place instead of remounting.

### Post-review fixes #5 — Android intensity flicker (2026-06-08)

Symptom (device, API 33+): dragging the `intensity` slider makes the shader flicker.

- **Root cause.** `mountEffect` recreated the whole `FxShaderView` (+ a fresh `RuntimeShader`
  parse) on *every* prop batch, so a continuously-dragged slider remounted the child many times a
  second. Each remount flashed a blank frame (new child momentarily 0×0), reset the native clock
  (`baseTimeNanos → 0`, animation jump), and reparsed the AGSL on the main thread. `FxShaderView`'s
  `setIntensity` existed but was dead — never reached because the remount destroyed the child first.
- **Fix.** `FxHostedView` now tracks `mountedEffectId`; when only `intensity` changed (same effect
  id, live child), it calls the child's `setIntensity` in place and returns, remounting only on an
  actual effect-id change. Introduced an `internal interface FxEffectView { setIntensity }`
  (in `FxNativeView.kt`) implemented by both `FxShaderView` and `FxFillView`, so the host dispatches
  the in-place update without branching on concrete type. `FxFillView.alpha` became a `var` and
  re-derives from the new intensity (via `alphaFor`); its gradient is intensity-independent so it is
  not regenerated. `setIntensity` is now live, not dead code.
- **Parity note.** iOS does not flicker — SwiftUI re-renders reactively and `TimelineView` keeps its
  own clock — so the recreate-per-batch pattern is unchanged on iOS; the fix is Android-local. Pinned
  in `structure.android.md` under Hosting mechanics.

**Unverified:** device-gated (API 33+); headless Kotlin compile not run this session.

Next: Device verification on iOS 17+ and **Android API 33+** (the API-29 emulator can only confirm
degradation). Batches with U3-005 (REAL-002 metallib + REAL-003 AGSL asset loading). On Android,
verify both fixes: switch across all ten ids (no blank, no stale pixels) and drag intensity (no
flicker, no clock jump); confirm `fill` intensity fades opacity smoothly.
