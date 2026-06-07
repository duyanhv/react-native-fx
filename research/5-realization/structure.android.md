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
- **`expo-view`** — a plain `ExpoView` (`View`/`ViewGroup`) hosting the render surface
  **or wrapping RN content**; a first-class Android view in the dispatch hierarchy. Carries
  the **owned runtime** — interaction (G) **and** content motion (the wrapped-content
  presentation, `33`–`36`). Required for fx-managed interaction *and* wrapped-content motion.

**Rule:** decorative/generative ⇒ `hosted`; interactive *or wrapped-content motion* ⇒
`expo-view`. Same split as iOS; fx owns its own views and is not an `@expo/ui` universal
component.

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
- **Gradient family** — `type: linear|radial|angular` → Compose
  `Brush.linearGradient`/`Brush.radialGradient`/`Brush.sweepGradient` · `via:native` ·
  `requires {os:21, hosted}` · `applyVia:background`. The whole gradient family, not one
  primitive.
- **AGSL mesh shader** — the `mesh` kind has no native primitive, so it lowers to a generated
  shader · `lower:shader, asset:agsl` · `requires {os:33, hosted}` · `applyVia:ShaderBrush` ·
  `clock:frame-nanos`; degrades to a linear `Brush` below 33.

### `material`
- **`RenderEffect.createBlurEffect`** — `via:native` · `requires {os:31, hosted}` ·
  `applyVia:graphicsLayer`. Glassmorphism = blur + gradient + overlay layering; there
  is no Liquid Glass equivalent.
- **Haze** (lib) — `via:lib` · `requires {os:21, hosted}`. Fallback below 31.

### `shader`
- **Decorative** — `lower:shader, asset:agsl` · `requires {os:33, hosted}` ·
  `applyVia:RenderEffect` · `clock:frame-nanos`.
- **Interactive** — `lower:shader, asset:agsl` · `requires {os:33, expo-view}` ·
  `applyVia:View.setRenderEffect` · `clock:frame-nanos`. On `expo-view` the surface is a
  plain `View`/`ViewGroup` (not a Compose modifier surface), so the AGSL shader applies via
  `View.setRenderEffect(RenderEffect.createRuntimeShaderEffect(…))` (RenderNode-backed) or a
  custom native render surface — **not** `Modifier.graphicsLayer`. Draw-time, so touch
  survives even while shading.
- **BYO** — same rungs with developer-supplied `.agsl`.

### `filter`
- **`RenderEffect`** chain — `via:native` · `requires {os:31, hosted}`. Draw-time;
  unlike iOS, may be applied over content without severing touch (still a step inside an
  `EffectStack` mounted by `<Fx>`/`FxView effect` for V1 consistency, `55`/`57`).

### `motion`
The driver node (`02`) lowers two ways, by **target**:
- **content target** — `ViewPropertyAnimator` / `androidx.dynamicanimation`
  `SpringAnimation` on the **wrapped container** `View` · `requires {os:21, expo-view}` ·
  `applyVia:View` · the animator owns timing. Animates the host view fx owns (`33`),
  translation/scale/alpha only ⇒ touch survives. **Caveat (`34`):** unlike iOS, property
  animators update the real view each frame, so touch tracks the **visual** position
  throughout — a deliberate platform divergence (the law). Spring defaults to the platform's
  **standard** `androidx.dynamicanimation` `SpringForce` (always available, API 21); where
  **M3 Expressive** is present it upgrades to the motion-scheme spring (progressive
  enhancement — § version gates / open questions). `tune` adjusts within whichever is active.
  Presence (`42`/`54`) composes this rung via `FxPresenceCoordinator`; the unmount handshake
  is `35`.
- **effect target** — Compose `animate*AsState` / `updateTransition` / `keyframes` /
  `spring` (`requires {os:21, hosted}`); spring defaults to Compose's standard `spring()`,
  upgrading to **M3 Expressive** `MotionScheme` springs where present (progressive
  enhancement). The native side of the eased-`transition` channel (`40`).

### `symbol` — planned / optional (V1 scope open, `24`)
- **AVD / Lottie** — `via:native`(AVD) or `via:lib`(Lottie) · `requires {os:21, hosted}` ·
  **`status:planned`**. Whether Android ships `symbol` in V1 (via Lottie/AVD) or `symbol`
  stays **iOS-only in V1** is an open scope decision owned by `24`. If it ships: no system
  symbol vocabulary, so it is a per-platform-different **lowering / asset contract**, **not a
  different public component** — the public surface stays `<Fx>` (`24`). Lottie is a
  `via:'lib'` optional peer dependency (`53`).

### `content-distort` — planned (Android-only)
- **AGSL via `RenderEffect`** — `requires {os:33, expo-view}` · `status:planned`.
  Draw-time means a shader can distort live, still-touchable content — the capability
  iOS structurally can't offer. Deferred to V2.

### `shape-morph` — Android-only (a node in `02`)
- **M3 Expressive shape morph** — native, `requires {os:21, hosted, feature:m3-expressive}`
  (matching `02`; `os:21` is the schema-shaped floor until the concrete M3 library/API level
  is pinned — § open questions).
  A node in `02` with an **empty iOS ladder** (→ `{via:'none'}` on iOS); the canonical way a
  platform-only capability is expressed.

### presence presets (the Android default catalog — device-pending)

Presence presets (`transient`/`sheet`/`modal`, `42`/`56`) lower through the `motion` content
rung; their **concrete Android shape + spring** is the Android column of `42`'s per-platform
default catalog and lives here once verified. Each must name an Android source (Material
snackbar, bottom-sheet, dialog) and pass the law test (`41`) — and may **diverge in shape**
from iOS (the point of shape-native). Device-pending.

## § Open questions / schema feedback

The earlier `02` schema gaps are now closed; what's left is Android-specific and
device-bound:

- ~~`shape-morph` needs a node~~ → **resolved:** it is a node in `02` (Android-only, empty
  iOS ladder).
- ~~`content-distort` / unavailable-not-error~~ → **resolved:** `02` decision 9 — a node with
  no satisfiable rung degrades to `{via:'none'}`, never throws.
- ~~`lib` dependency contract~~ → **resolved:** `via:'lib'` is an optional peer dependency,
  app-installed, guards out if absent (`53` decision 6); the manifest may name the package.
- **M3 Expressive is opt-in and version-fluid** — pin a concrete minimum once the Android
  backend starts; treat its springs/morph as progressive enhancement (device).
- **Android default-catalog values** (presence-preset shapes/springs) are device-pending.

## § Sources

- `02-capability-ir-and-lowering.md` — the manifest this column expands.
- `01-substrates-and-hosting.md` — substrate model; the auto-Host (#46549) Android side.
- `30-interaction-and-gestures.md` — the `onTouchEvent`/`ACTION_CANCEL` mechanics.
- Android docs — AGSL/RuntimeShader, RenderEffect, Material 3 Expressive motion (this
  doc's § version gates is the index).
