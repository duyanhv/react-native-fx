# structure.android — Android realization
Status: researched
Feeds: 02-capability-ir-and-lowering.md (renders its Android column), the capability docs, 30-interaction

This is the **sole authority for Android mechanics**. It expands the Android column
of the capability manifest (`02`): the fundamentals, then a section per IR node that
turns the manifest's Android rungs into concrete native work. Android is a peer of
iOS, not a port — but it diverges in three load-bearing ways, called out below. The
iOS peer is `structure.ios.md`.

## § Platform fundamentals

### Substrates

- **`hosted`** — a Jetpack Compose composable hosted inside RN via Expo's Compose
  host. Decorative or self-gesturing. The main path for generative effects.
- **`expo-view`** — a plain `ExpoView` (`View`/`ViewGroup`); a first-class Android
  view in the dispatch hierarchy. Carries the runtime (G). Required for fx-managed
  interaction.

**Rule:** decorative/generative ⇒ `hosted`; interactive ⇒ `expo-view`. Same split as
iOS; fx owns its own views and is not an `@expo/ui` universal component.

### The three divergences from iOS (don't relitigate)

1. **Shader language is AGSL, not MSL.** Same algorithm, different file. A `shader`
   node ships both `.metal` (iOS) and `.agsl` (Android), or a BYO author supplies
   both.
2. **Effects are draw-time and touch-safe.** `RenderEffect`/AGSL apply on the view's
   `RenderNode`, independent of input dispatch. So shading *over live content* does
   **not** sever touch — the inverse of iOS. This is why `content-distort` is
   `planned` on Android while out-of-scope on iOS.
3. **Three capability gaps.** No native `MeshGradient` (use AGSL), no Liquid Glass
   (blur + overlay, or the Haze/Cloudy libs), no SF Symbols (Animated Vector
   Drawables or Lottie). One reverse-freebie: native **shape morph** via M3
   Expressive.

### Hosting mechanics (when on `hosted`)

- Compose host via Expo's Android `RNHostView` equivalent. The auto-Host boundary
  (#46549) covers Android too. For decorative full-surface effects, keep the host
  non-intercepting so touches reach RN content below.

### Clock (what advances `time`)

- **`hosted`** → `withFrameNanos` / `rememberInfiniteTransition` (Compose, on the
  `Choreographer`).
- **`expo-view`** → a `Choreographer` frame callback driving the render. Pause on
  `onDetachedFromWindow`/background (`31`).

### Render paths

- **Compose generative**: `Brush` gradients, `Canvas`/`DrawScope`.
- **Shader**: `RuntimeShader` (AGSL) applied via
  `RenderEffect.createRuntimeShaderEffect` + `Modifier.graphicsLayer`, or as a
  `ShaderBrush`.
- **Filter/blur**: `RenderEffect` (`createBlurEffect`, color filter, chained).

### Touch contract (when on `expo-view`)

- Handle in `onTouchEvent`; defend briefly with
  `requestDisallowInterceptTouchEvent(true)` on `ACTION_DOWN`, release past
  `scaledTouchSlop`; spring back on `ACTION_CANCEL` (the analogue of iOS
  `.cancelled`). Full mechanics in `30`.
- Because effects are draw-time, an effect applied to content never interferes with
  `dispatchTouchEvent`/hit-testing.

### Lifecycle

- Clear backend resources and stop the `Choreographer` callback in
  `onDetachedFromWindow` (`31`).

### Version gates

| API | Android | Unlocks |
|---|---|---|
| 21 | 5.0 | Compose `Brush` gradients, `Canvas`/`DrawScope` |
| 31 | 12 | `RenderEffect` (blur, color filter, chain) |
| 33 | 13 | AGSL `RuntimeShader`, `createRuntimeShaderEffect` |
| — | recent | Material 3 Expressive (opt-in): physics springs, **shape morph**, 35 shapes |

## § Per-capability realization

Each section expands the Android rungs from `02`.

### `fill`
- **AGSL mesh shader** — `lower:shader, asset:agsl` · `requires {os:33, hosted}` ·
  `applyVia:ShaderBrush` · `clock:frame-nanos`. Mesh has no native primitive, so it
  lowers to a generated shader.
- **`Brush.sweepGradient`** — `via:native` · `requires {os:21, hosted}` ·
  `applyVia:background`. Fallback below 33.

### `material`
- **`RenderEffect.createBlurEffect`** — `via:native` · `requires {os:31, hosted}` ·
  `applyVia:graphicsLayer`. Glassmorphism = blur + gradient + overlay layering; there
  is no Liquid Glass equivalent.
- **Haze** (lib) — `via:lib` · `requires {os:21, hosted}`. Fallback below 31.

### `shader`
- **Decorative** — `lower:shader, asset:agsl` · `requires {os:33, hosted}` ·
  `applyVia:RenderEffect` · `clock:frame-nanos`.
- **Interactive** — `lower:shader, asset:agsl` · `requires {os:33, expo-view}` ·
  `applyVia:graphicsLayer.renderEffect` · `clock:frame-nanos`. Draw-time, so touch
  survives even while shading.
- **BYO** — same rungs with developer-supplied `.agsl`.

### `filter`
- **`RenderEffect`** chain — `via:native` · `requires {os:31, hosted}`. Draw-time;
  unlike iOS, may be applied over content without severing touch (still bundle inside
  effect components for V1 consistency).

### `motion`
- **Compose animation** — `animate*AsState`, `updateTransition`, `keyframes`,
  `spring`; **M3 Expressive** `MotionScheme` physics springs. Realizes the native
  side of the eased-`transition` channel (`40`).

### `symbol`
- **AVD / Lottie** — `via:native`(AVD) or `via:lib`(Lottie) · `requires {os:21,
  hosted}`. No system symbol vocabulary; this node is a per-platform-different
  component, not a unified one.

### `content-distort` — planned (Android-only)
- **AGSL via `RenderEffect`** — `requires {os:33, expo-view}` · `status:planned`.
  Draw-time means a shader can distort live, still-touchable content — the capability
  iOS structurally can't offer. Deferred to V2.

### `shape-morph` — Android-only freebie (no node yet)
- **M3 Expressive shape morph** — native, `requires {recent, hosted}`. Has no iOS
  equivalent and no canonical node in `02` — see schema feedback.

## § Open questions / schema feedback

Same gaps surfaced as in `structure.ios`, plus Android-specific:

- **`shape-morph` needs a node** (Android-native, iOS `none`), or an explicit
  per-platform-capability carve-out in `02`.
- **`content-distort` is genuinely asymmetric** — `out-of-scope`/iOS,
  `planned`/Android. The schema already carries this via per-rung `status`; confirm
  consumers treat a node with *no supported rung on a platform* as "unavailable here,"
  not "error."
- **M3 Expressive is opt-in and version-fluid** — pin a concrete minimum once the
  Android backend starts; treat its springs/morph as progressive enhancement.
- **`lib` rungs need a dependency contract** — `via:lib` (Haze/Lottie) implies an
  optional peer dependency; decide whether the manifest names the package.

## § Sources

- `02-capability-ir-and-lowering.md` — the manifest this column expands.
- `01-substrates-and-hosting.md` — substrate model; the auto-Host (#46549) Android side.
- `30-interaction-and-gestures.md` — the `onTouchEvent`/`ACTION_CANCEL` mechanics.
- Android docs — AGSL/RuntimeShader, RenderEffect, Material 3 Expressive motion (this
  doc's § version gates is the index).
