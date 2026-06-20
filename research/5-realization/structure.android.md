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

- **`hosted`** — a host view fx owns, decorative or self-gesturing; the main path for
  generative effects. **V1 ships a plain `View`** that draws the effect directly
  (`RuntimeShader` through a `Paint` in `onDraw`, gradients via `LinearGradient`, materials
  via `RenderEffect`), driven by a `Choreographer` clock. Jetpack Compose (the `ShaderBrush`/
  `Brush.*`/`withFrameNanos` idiom) is the intended future rung, deferred until the
  library-module Compose setup is resolved (§ Render paths).
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
   **not** sever touch — the inverse of iOS. This is why `content-distort` ships on
   Android (the curated `ripple` demonstrator, DEF-009, device-proven) while it is
   out-of-scope on iOS.
3. **Three capability gaps.** No native `MeshGradient` (use AGSL), no Liquid Glass
   (blur + overlay, or the Haze/Cloudy libs), no SF Symbols (Animated Vector
   Drawables or Lottie). One reverse-freebie: native **shape morph** via M3
   Expressive.

### Hosting mechanics (when on `hosted`)

- Host view via Expo's Android `RNHostView` equivalent — a plain `View` in V1 (Compose
  deferred, § Substrates). The auto-Host boundary (#46549) covers Android too. For
  decorative full-surface effects, keep the host non-intercepting so touches reach RN
  content below.
- **Child layout on the plain-`View` host.** When the host swaps its decorative child
  on a prop update (effect or `intensity` change recreates the inner render view), the
  new child is added natively *outside* RN's layout pass. `ExpoView` defaults
  `shouldUseAndroidLayout = false`, which swallows the child's `requestLayout()`, so a
  child added after the host's initial layout never gets measured and renders at 0×0
  (blank). The hosting `ExpoView` subclass therefore sets
  `shouldUseAndroidLayout = true`, which re-runs `measureAndLayout()` (via `post`) on
  every `requestLayout`. Because that flag alone "does not guarantee accurate layout"
  (per `ExpoView`), the host also overrides `onLayout` to lay its decorative child
  explicitly to the host bounds — mirroring `ExpoComposeView`'s hosting-child handling.
  This reads the host's RN-assigned bounds; it never writes layout back to Yoga. This is
  Android-local: iOS recreates the hosted controller the same way per prop batch, but
  UIKit constraints re-size the new subview automatically, so only Android needs it.
- **Discrete uniform change vs remount.** A discrete `intensity` change updates the *live*
  child's uniform in place (`setIntensity` → `invalidate()`); the host remounts the child
  only when the effect *id* actually changes. This is the Android realization of the
  discrete-prop rule: a dragged slider mutates one uniform per frame instead of recreating
  the view each tick, which would flash a blank frame, reset the shader clock
  (`baseTimeNanos`), and reparse the AGSL. iOS reaches the same no-flicker outcome through
  SwiftUI's reactive re-render, so the divergence is implementation-local.

### Clock (what advances `time`)

- **`hosted`** → a `Choreographer.FrameCallback` on the plain-`View` host, advancing
  `time` and invalidating each frame (the V1 path). `withFrameNanos` /
  `rememberInfiniteTransition` is the equivalent Compose idiom, deferred with the Compose
  rung.
- **`expo-view`** → a `Choreographer` frame callback driving the render. Pause on
  `onDetachedFromWindow`/background (`31`). Resource release is a separate renderer-owned
  lifecycle step, not part of ordinary detach.

### Render paths

- **Compose generative**: `Brush` gradients, `Canvas`/`DrawScope`.
  **V1 deviation (2026-06-08):** the hosted `fill` renderer uses a plain `View`
  with `android.graphics.LinearGradient` drawn in `onDraw()` — no Compose.
  The Compose compiler dependency at library level is deferred; the `hosted`
  substrate's intended Compose path (`Brush.linearGradient`, `Canvas`/`DrawScope`)
  is activated when the library-module Compose setup is resolved.
- **Shader**: a `RuntimeShader` (AGSL) drawn through a `Paint` in `onDraw()` on the
  plain-`View` host — the path for a *generative* shader that produces its own pixels.
  `RenderEffect.createRuntimeShaderEffect` is deliberately **not** used here: it filters
  *existing* view content through an `eval`'d input shader, which a generative shader does
  not have. (`createRuntimeShaderEffect` + `Modifier.graphicsLayer` / `ShaderBrush` is the
  Compose-era mechanism, deferred with the Compose rung.) AGSL source files ship under
  `src/main/assets/shaders/` and are read at runtime via
  `context.assets.open("shaders/<id>.agsl")`. No build-time shader compile step is required.
  Below API 33 the shader rung guards out and degrades to `{ via: 'none' }`.
- **Filter/blur**: `RenderEffect` (`createBlurEffect`, color filter, chained).

### Touch contract (when on `expo-view`)

- Handle at `dispatchTouchEvent` first, then fall through to child dispatch when fx does not
  consume. Android has no iOS-style ancestor recognizer that can observe a descendant touch
  stream without becoming the target; passive mode must keep receiving `MOVE` while it feeds
  uniforms, so the surface owns the stream as one interactive unit until slop yield. The FSM
  lives on `FxPressHandler` (plain class), mirroring the RNGH single-handler shape
  (`core/LongPressGestureHandler.kt`: initialize on `ACTION_DOWN`, post the long-press timeout
  at `ViewConfiguration.getLongPressTimeout()`, fail past `scaledTouchSlop`, map
  `ACTION_CANCEL` → cancelled). Defend briefly with
  `requestDisallowInterceptTouchEvent(true)` on `ACTION_DOWN`, release past
  `scaledTouchSlop`; spring back on `ACTION_CANCEL` (the analogue of iOS `.cancelled`).
  **Resolved (DEF-011 hardware gate, 2026-06-18):** the W-F3 watch — RNGH's lone press handler
  never calls the disallow, so the brief `ACTION_DOWN` disallow could in principle lag scroll-start
  — was checked on device and showed **no perceptible scroll-start lag**, so the disallow is
  **retained** (not dropped for the RNGH-aligned shape). Full mechanics in `30`.
- **`none`-mode pass-through.** RN Android delivers JS touches geometrically from the root via
  `TouchTargetHelper`, which targets the topmost react-tagged view (the fx surface) over content
  composited behind it — so a native `dispatchTouchEvent` return cannot route a `none`-mode touch
  to a sibling `Pressable`. The lever is `com.facebook.react.uimanager.ReactPointerEventsView`
  (`pointerEvents = BOX_NONE` in `none`, `AUTO` for `passive`/`active`): `TouchTargetHelper`
  reads `getPointerEvents()` on every view it walks, so `BOX_NONE` makes the surface itself
  untargetable while RN children inside stay targetable — the native parity of the iOS
  bare-surface pass-through, never `NONE` (which would also block children). `FxSurfaceView`
  implements the interface and updates the value where the mode is applied
  (`applyResolvedConfig`), not per event. This is the **Android-native peer** of the iOS
  `hitTest` lever: same semantic (surface untargetable in `none`), mechanism localized here —
  RN Android needs an explicit interface where UIKit infers untargetability from the view tree
  (REAL-005). **Build coupling (shipped):** the lever is compiled against
  `compileOnly("com.facebook.react:react-android")` on the library module — the
- **`controlled` mode (DEF-020):** attaches **no recognizer** (identical to `none` for the
  gesture system), but enables an imperative write path via `setUniform(name, value)` and
  `setHighlight(x, y)` as Expo `AsyncFunction(view, …)` ref methods. The write lands in the
  same `RuntimeShader` uniform buffer the `Choreographer` loop already reads (`30` § two input
  sources, one buffer). `setUniform` is guarded by the source-declaration scan
  (`declaredUniforms` — the `extractUniformNames` regex over the AGSL source); unknown names
  are a no-op. `setHighlight` is sugar over the `touch`/`pressDepth` uniforms in `[0,1]`
  y-up UV (RT-005). The **clobber rule** is the design crux: an imperative override is tracked
  in `imperativeOverrides` on `FxSurfaceView`; `updateEffectSurfaceVisibility()` skips
  `setIntensity()` for any overridden uniform. `setUniform(name, null)` clears the override,
  letting the prop value win again on the next batch. Discrete writes only — no per-frame JS
  loop.
  `expo-module-gradle-plugin` classpath does not carry `react-android` transitively
  (`expo-modules-core` exposes its React dependency non-transitively), and `compileOnly` is the
  standard RN-view-library shape (compile against it; the host app provides it at runtime, never
  bundled — a clean `assembleDebug` confirms no bundled copy). This is the library's first direct
  `com.facebook.react.*` reference — it participates in RN's native view system, *not* the
  JS↔native boundary rule #7 governs (events still cross via the Expo `EventDispatcher`; props via
  Expo setters). The interface and the unversioned `compileOnly` coupling are compile-proven
  (`:react-native-fx:compileDebugKotlin` resolves the interface).
- **Axis-aware drag/tilt (`active` + `dragAxis`, DEF-011, device-verified 2026-06-18):** with
  `dragAxis` set under `active`, the slop yield refines from fail-on-any-movement to *yield only
  when cross-axis movement past `scaledTouchSlop` dominates the claimed axis*: the `ACTION_DOWN`
  `requestDisallowInterceptTouchEvent(true)` is **retained** while the claimed axis dominates (the
  parent scroller stays blocked) and **released** on cross-axis dominance (the scroller scrolls).
  `ACTION_MOVE` writes `drag` (axis-masked `currentUV − originUV`) and `tilt` (full-2D
  `clamp((currentUV − 0.5)·2, −1, 1)`) — both signed `[-1,1]` in the `[0,1]` y-up touch-UV basis
  (RT-005); the uniform stays y-up while a shader-local `uv` flip handles AGSL's y-down sampling —
  gated on per-shader `declaredUniforms` membership; release eases both to `(0,0)` on the `0.35`
  spring. `dragAxis="both"` releases the disallow for neither axis, so Android **does** block the
  parent for `both` — the ratified divergence from iOS (where `both` is standalone-only, rule #4).
- **The surface lever alone is insufficient — the decorative/wrapper children must also be
  marked (round 5).** Source-confirmed against the running RN 0.85.3 `TouchTargetHelper.kt`
  (`example/node_modules`): `getPointerEvents()` *is* consulted on any `view is
  ReactPointerEventsView` (`:320`, not only `ReactViewGroup`), so `FxSurfaceView`'s `BOX_NONE`
  is honored — but `BOX_NONE` descends into children (`:355` → `:216`), and the surface's two
  full-bounds children — the AGSL `FxSurfaceShaderView` and the `intermediateContainer`
  `FrameLayout` — each default to `AUTO` and claim a bare tap as a `SELF` target (`:388-410`),
  remapping to the surface's tag and swallowing it (this is also why an inside child is occluded
  behind the shader). The fix is the Android analogue of the iOS `hitTest` excluding `metalView`
  + `intermediateContainer`: `FxSurfaceShaderView` implements `ReactPointerEventsView` → `NONE`
  (purely decorative, never a target — `:339` skips it), and `intermediateContainer` returns
  `BOX_NONE` (its RN children stay targetable; the container itself is never a target, so a bare
  tap falls through to content composited behind). With all three layers set, a `none`-mode bare
  tap reaches the sibling behind and an inside RN child stays tappable even under an active
  shader. The JS-`pointerEvents` fallback is retired — it sets only the surface's pointer-events
  and never the occluding children, so it would fail identically. Device-pending the round-5
  re-re-gate.
- **JS press events report view points (dp).** Touch coordinates arrive in physical px; the
  `dispatchShader*` helpers divide by `context.resources.displayMetrics.density` before building
  the payload, matching the RN `locationX/Y` convention and iOS. The internal shape test
  (`containsInteractiveShape`) and the UV uniform math stay in px — only the JS-facing payload
  converts.
- Because effects are draw-time, an effect applied to content never interferes with
  `dispatchTouchEvent`/hit-testing.

### Recognizer hosts (cooperatively shared via host interface)

The `FxPressHandler` FSM (recognizer + arbitration) is decoupled from its hosts via a small **host interface** that receives press begin/change/end/cancel/long-press callbacks and supplies hit-test information. Both hosts implement the interface; the FSM stays in `FxPressHandler` and never duplicates.

**Host interface (Kotlin):**
```kotlin
internal interface FxPressHost {
  fun hitTarget(x: Float, y: Float): Boolean
  fun handlePressBegin(x: Float, y: Float, depth: Int)
  fun handlePressChanged(x: Float, y: Float, depth: Int)
  fun handlePressEnd(x: Float, y: Float, includePressEvent: Boolean)
  fun handlePressCancel(x: Float, y: Float)
  fun handleLongPress(x: Float, y: Float)
  fun attachRecognizer(recognizer: GestureDetector)
  fun detachRecognizer(recognizer: GestureDetector)
}
```

**FxSurfaceView host behavior** (unchanged from U8, now behind interface):
- Hit-test: `containsInteractiveShape(x, y)` for active/passive.
- Feedback: native shader uniforms on begin/changed, reset on end/cancel.
- Long-press: `dispatchShaderLongPress(point)` fires the event.
- Press end: `dispatchShaderPressOut(point)` on end/cancel; `dispatchShaderPress(point)` if `includePressEvent == true`; `dispatchShaderPressIn(point)` on begin.

**FxPressableView host behavior** (new, content-press):
- Hit-test: full view bounds.
- Feedback: a `RippleDrawable` foreground on the `intermediateContainer` (FrameLayout wrapper, Fabric-invisible), color from `?colorControlHighlight` or fallback `#20000000`. Because the FSM consumes the touch, the framework never runs its own pressed-state path, so the host proxies it: `intermediateContainer.drawableHotspotChanged(x, y)` + `isPressed = true` on begin, hotspot update on move, `isPressed = false` on end/cancel. The ripple is bounded by an opaque `RectShape` mask (a default `ShapeDrawable()` has a null shape and can let the highlight fill the foreground) and left at `RADIUS_AUTO` so the framework fills the masked bounds (a fixed `min/2` radius inscribes a small circle on a wide control).
- Long-press: keeps the pressed feedback until the actual up/cancel; emits the long-press event.
- Press end: emits the press event if `includePressEvent == true`; press-in/out on begin/end/cancel.
- Cancellation (slop self-fail / out-of-bounds): clears the pressed state, emits press-out only, no press.
- Events cross as `onFx`-prefixed names (`onFxPressIn`/`onFxPressOut`/`onFxPress`/`onFxLongPress`) to avoid React Native's reserved `topPress`; the public `onPress*` props map onto them in JS (as the shader surface does with `onShaderPress*`).

### Lifecycle

- Pause frame callbacks in `onDetachedFromWindow` and while the app is backgrounded. Treat
  detach as transient because React Native can move or reattach Android views without
  destroying the renderer.
- Release concrete renderer resources only when the backing render surface is destroyed or
  invalidated by that backend's own lifecycle callback. If a backend releases resources after
  an invalidation with no immediate replacement surface, lazily recreate them on the next
  attach or surface-available callback. The shared `ExpoView` boundary does not clear backend
  resources on ordinary detach.

### Layout read (the post-layout frame)

How `FxLayoutObserver` (`33`/`36`) reads the RN-assigned frame of `FxSurfaceView` natively —
event-driven, read-only, no JS round-trip.

- **Where RN applies the frame.** Fabric's mounting layer assigns the frame directly:
  `SurfaceMountingManager.updateLayout` calls `view.measure(...)` with `EXACTLY` specs and then
  `view.layout(x, y, x + width, y + height)` — `references/react-native`
  `ReactAndroid/src/main/java/com/facebook/react/fabric/mounting/SurfaceMountingManager.kt:829-859`.
  The coordinates are **parent-relative, in px**.
- **The read point: `View.OnLayoutChangeListener` on the host view.** `View.layout()` dispatches
  registered layout-change listeners whenever any of left/top/right/bottom actually changed —
  origin-only moves included — *independent of the `onLayout` body*. That independence is
  load-bearing here: `FxSurfaceView` already overrides `onLayout` without calling `super` (the
  intermediate-container mechanic above), and the listener keeps the observer decoupled from
  that override. Expo precedent: `references/expo`
  `expo-ui/android/src/main/java/expo/modules/ui/RNHostView.kt:131-135` (layout-change listener
  feeding native state). **Rejected:** a second read inside the `onLayout` override (entangles
  the two mechanics), any polling/`Choreographer` layout watcher, and a JS `onLayout`
  round-trip.
- **Window-space reads are live, not captured.** The window origin (`getLocationInWindow`) and
  edge-travel distances (against the root view's window size) change when an ancestor scrolls —
  with no local layout event — so they are computed at read time; only the parent-space frame is
  captured on layout events. Insets read on demand via `ViewCompat.getRootWindowInsets` (RN's
  own pattern — `references/react-native`
  `ReactAndroid/src/main/java/com/facebook/react/runtime/ReactSurfaceView.kt:50-70`).
- **Threading + lifecycle.** Mounting-layer layout and listener dispatch run on the UI thread;
  all reads are UI-thread synchronous. The observer is created with `FxSurfaceView`, the view
  holds the listener on itself (no external reference, lifetime bound to the view — no leak),
  and `detach()` removes the listener for an explicit teardown.

### Version gates

| API | Android | Unlocks |
|---|---|---|
| 21 | 5.0 | Compose `Brush` gradients, `Canvas`/`DrawScope` |
| 31 | 12 | `RenderEffect` (blur, color filter, chain) |
| 33 | 13 | AGSL `RuntimeShader`, `createRuntimeShaderEffect` |
| 23* | 6.0 | Material 3 Expressive (opt-in, **library**-gated): `MotionScheme` physics springs, **shape morph** (`MaterialShapes`, 35 shapes). Floor pinned in § `shape-morph`. |

*Not OS-gated like the rows above: API 23 is the floor only because the pinning artifact
(Compose Material3 ≥ 1.4.0) requires it; the binding gate is the library's runtime presence
(`feature:m3-expressive`), not the OS level. See § `shape-morph`.

## § Per-capability realization

Each section expands the Android rungs from `02`.

### `fill`
- **V1: static hosted gradient** — `FxFillView` draws a fixed platform-default `LinearGradient`
  on a plain `View` (`Canvas.onDraw`) · `via:native` · `requires {os:21, hosted}`. `intensity`
  drives paint alpha; no per-call colors/angle/kind are read, and there is no AGSL mesh fill rung
  in shipped V1.
- **Deferred (fill wire-through)** — the configurable gradient family (Compose `Brush.*`) and an
  AGSL mesh shader for the `mesh` kind are the planned wire-through; not built until it lands.

### `material`
- **Own-content composition + `RenderEffect.createBlurEffect`** — `via:native` ·
  `requires {os:31, hosted}` · `applyVia:View.setRenderEffect`. The Android material is an
  fx-drawn translucent stack — a white frost scrim plus a vertical highlight gradient,
  drawn in `onDraw` on the plain-`View` hosted path (the V1 no-Compose idiom, § render
  paths) — softened by `RenderEffect.createBlurEffect(radius, radius, CLAMP)` applied to
  fx's **own** view via `View.setRenderEffect` (the same RenderNode-backed mechanism as
  the `expo-view` shader rung, not `Modifier.graphicsLayer`). There is no Liquid Glass
  equivalent and **no backdrop capture**: sampling parent/RN content is costly and
  stale-prone on Android and would host RN content to sample it (rule #4) — and the iOS
  rung does not refract sibling fx hosts either (the glass compositing limit,
  `structure.ios` §material), so own-content composition is the cross-platform-consistent
  default in practice. Equal polish, not pixel parity.
- **Pinned constants (intensity normalization).** JS speaks `intensity` 0–1 only. On
  Android it maps linearly to a blur radius of **0–24dp** (converted to px at the device
  density; radius 0 clears the effect — `createBlurEffect` rejects non-positive radii) and
  scales the overlay alphas: frost-scrim alpha = variant weight × intensity; highlight
  gradient = white **0.35 → 0.05** (top → bottom) × intensity. The variant weights are
  **`regular` = 0.55** (heavier frost) and **`clear` = 0.28** (lighter, more transparent);
  unknown variants fall back to `regular`. Intensity and variant changes update the live
  view in place (`setIntensity`/`setMaterialConfig` → `invalidate()`), never remount.
- **`interactive` is inert on Android.** The press response is the iOS-26 system glass's
  own behavior; Android has no system equivalent, and the law forbids simulating another
  platform's behavior. The knob is accepted silently (the `MaterialConfig` Record carries
  it) and ignored — no crash, no recognizer, no synthetic animation.
- **Below API 31** — the same translucent stack **without** blur (`RenderEffect` requires
  31): `via:draw` · `requires {os:21, hosted}`. Degraded but never a flat box (`21`
  decision 4).
- **Haze** (lib) — `via:lib` · `requires {os:21, hosted}` · **`status:planned`**,
  non-selectable in V1 (the same treatment as the Android `symbol` rung). The true
  backdrop-blur library rung is documented and deferred until backdrop blur is genuinely
  demanded; when it lands it is an optional peer dependency (`53` decision 6) — no Compose
  dependency and no optional-peer machinery now.

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
- **Load/error events** — `FxSurfaceView` dispatches `onFxLoad`/`onFxError` once per shader
  change (never per frame — rule #1): it opens the curated `.agsl` asset and compiles a
  `RuntimeShader` to prove the load — success fires `onFxLoad`, a failure fires `onFxError`
  (`22` §Events). Below API 33 the rung degrades to `{via:'none'}`, a graceful no-op rather
  than an error, so no event fires. Payload `{ shader, reason? }` (an `expo.modules.kotlin`
  `Record`). The interactive surface render itself stays a later (U8) concern; the load proof
  lands now so the BYO fallback signal exists. Clearing `shader` to empty is silent.
- **Interactive-uniform support is read from the shader source, never probed by a write.** The
  `pressDepth`/`touch` uniforms exist only in interactive shaders (`dots`); a decorative shader
  (`aurora`) omits them. Determine which the loaded shader declares by scanning the in-hand AGSL
  source text for the uniform declaration — the `uniform` keyword plus the declared name on a
  word boundary, so an in-body use (the local `touchPoint`) never reads as a declaration — and
  write each interactive uniform per frame only when its flag is set. Never test existence by
  calling `setFloatUniform` for an absent uniform inside a try/catch: on API 33 the platform's
  `RuntimeShader` error path corrupts its own native message string and CheckJNI aborts the
  process on mount. Scanning is safe because AGSL strips only *unused* uniforms, and an
  interactive shader both declares and uses `pressDepth`/`touch`, so a declared uniform is
  always present to write.

- **Runtime compilation (DEF-008 — registry-sourced).** Android already compiles
  `RuntimeShader(agslString)` at runtime from a bundled asset; the DEF-008 delta is small —
  accept the AGSL string from JS (`registerShader({ source: { ios, android } })`) into a
  process-wide registry (`FxShaderRegistry`, keyed by id) and compile it the same way. The
  `shader`-prop path resolves a registered id's source from the registry instead of opening an
  asset; a curated id still reads its asset. The `FxSurfaceShaderView` reconstructs its
  `RuntimeShader` only when the resolved **id** changes (the `shaderId` guard), not on
  intensity/uniform changes — so a uniform change never recompiles, and two ids resolve to two
  instances with their own source (no collision). A re-registered id keeps rendering its prior
  source on a live view and picks up the new source on the next mount (the fresh view resolves the
  current registry entry). A `RuntimeShader`
  carries mutable per-instance uniform state, so it cannot be shared across views; each view owns
  its instance (construction from an in-memory source string is a cheap parse — the curated asset
  read is the only file I/O, and BYO has none). A missing `android` source degrades Android to
  `{via:'none'}` (silent, the pair rule); a registered id whose AGSL fails to compile fires
  `onFxError`; an unknown id (neither curated nor registered) fires `onFxError`. **Uniform writes
  are guarded by the same source-declaration scan** the interactive uniforms use — `time`,
  `resolution`, and `intensity` are written only when the loaded AGSL declares them, so a BYO
  shader that omits one never hits the API-33 absent-uniform abort. The interactive raster render
  of runtime shaders rides whatever the interactive renderer becomes (the deferred Android
  interactive-render gap); the decorative draw-through-`Paint` path takes the runtime-compiled
  shader directly. **Re-registration is a clean replacement:** a new source for an existing id
  overwrites the registry entry and the next mount reconstructs; identical source is an idempotent
  no-op.

### `filter`
- **`RenderEffect`** chain — `via:native` · `requires {os:31, hosted}`. Draw-time;
  unlike iOS, may be applied over content without severing touch (still a step inside an
  `EffectStack` mounted by `<Fx>`/`FxView effect` for V1 consistency, `55`/`57`).

### `motion`
The driver node (`02`) lowers two ways, by **target**:
- **content target** — `ViewPropertyAnimator` / `androidx.dynamicanimation`
  `SpringAnimation` on the **intermediate container** `View` · `requires {os:21, expo-view}` ·
  `applyVia:View` · the animator owns timing. `FxSurfaceView` creates an intermediate
  container `View` inside itself and hosts the RN children in it; the animator targets the
  container's translation/scale/alpha. Fabric tracks only the outer `FxSurfaceView` and never
  overwrites the container. Animates the container fx owns (`33`), translation/scale/alpha
  only ⇒ touch survives. **Child routing must follow Expo's proven pattern, not a partial
  override** — a naive `addView` + `getChild*` proxy violates Android's
  `getChildAt(i).getParent() == this` invariant (and `SurfaceMountingManager`'s direct-`getChildAt`
  fallback), which crashes on mount. Two sanctioned options: **(preferred)** route children via
  Expo's `GroupView { AddChildView/GetChildCount/GetChildViewAt/RemoveChildViewAt }` ViewManager
  DSL (`references/expo` `GroupViewManagerWrapper.kt`) — the framework-blessed seam; **or (if
  overriding the `View` directly)** mirror `expo-blur`'s `ExpoBlurTargetView.kt` exactly: add the
  container via `super.addView` guarded by identity; report the container's children from
  `getChildCount`/`getChildAt`/`indexOfChild` with the container itself **excluded**; override the
  **full** add / remove / `removeViewAt` / `removeAllViews` / `updateViewLayout` family (not just
  `addView`); and size the container in `onMeasure`/`onLayout`. **Caveat (`34`):** unlike iOS, property
  animators update the real view each frame, so touch tracks the **visual** position
  throughout — a deliberate platform divergence (the law). **Retarget is stock (ratified
  DOC-009):** `SpringAnimation.animateToFinalPosition()` redirects the running animation
  with value and velocity carried ("continuous movement since last frame") — no custom
  integrator; the on-device proof is U6-002 (RT-016). Spring defaults to the platform's
  **standard** `androidx.dynamicanimation` `SpringForce` (always available, API 21); where
  **M3 Expressive** is present (the Compose rung with `material3` ≥ 1.4.0 — § `shape-morph`)
  it upgrades to the `MotionScheme` spring (progressive enhancement). `tune` adjusts within whichever is
  active, authored as `{ stiffness, dampingRatio }` — `SpringForce` values or tokens
  (`STIFFNESS_HIGH`=10000 · `MEDIUM`=1500 · `LOW`=200 · `VERY_LOW`=50; Compose adds
  `StiffnessMediumLow`=400; `DAMPING_RATIO_HIGH_BOUNCY`=0.2 · `MEDIUM_BOUNCY`=0.5 ·
  `LOW_BOUNCY`=0.75 · `NO_BOUNCY`=1.0), per `41` decision 11. **Reduce-motion gate:**
  duration animators auto-respect `ANIMATOR_DURATION_SCALE`, but springs/physics do
  **not** — gate them manually via `ValueAnimator.areAnimatorsEnabled()` (`34`).
  Presence (`42`/`54`) composes this rung via `FxPresenceCoordinator`; the unmount handshake
  is `35`.
  **Explicit layout required.** The container is a `FrameLayout` holding the RN child tree; it
  is added outside RN's layout pass. `FxSurfaceView` sets `shouldUseAndroidLayout = true`
  (so Expo re-runs `measureAndLayout()`) and overrides `onLayout` to measure the container
  with exact specs and then lay it to the host bounds. Without this, the container renders at
  0×0 (blank). The same mechanic as the hosted renderer above — one mechanic, one home.
  **Effect surface visibility:** the effect surface is hidden when no effect is active
  (`pendingShader` blank), so it never obscures the content-motion container. When the
  Android shader renderer is implemented, the visibility rule controls the effect surface
  view. The composition concern (SPINE-004, background/overlay/surface) intersects the
  U3 V2 interactive surface and is not yet decided.
- **effect target** — Compose `animate*AsState` / `updateTransition` / `keyframes` /
  `spring` (`requires {os:21, hosted}`); spring defaults to Compose's standard `spring()`,
  upgrading to **M3 Expressive** `MotionScheme` springs where present (`material3` ≥ 1.4.0 —
  § `shape-morph`; progressive enhancement). The native side of the eased-`transition`
  channel (`40`).

### `source` — deferred (iOS-hosted first)

The `source` driver (`02` decision 14) ships its render-server-fidelity rung on iOS hosted
first (structure.ios.md § `source`); Android has **no rung yet** → empty ladder, `{via:'none'}`.
Android's equivalent is the **best-effort** tier of the same driver (zero per-frame JS, but a
main-thread/UI-thread reader, not render-server fidelity — `02` d14): a Compose
`scrollable`/`nestedScroll` offset or a native scroll-offset reader mapped to the effect, the
Compose analogue of SwiftUI's `scrollTransition`/`visualEffect`. It lands with its own task when
the Android `source` rung is triggered; this is a documented platform asymmetry, not a defect.

### `symbol` — planned / optional (deferred from V1)
- **AVD / Lottie** — `via:native`(AVD) or `via:lib`(Lottie) · `requires {os:21, hosted}` ·
  **`status:planned`**. `symbol` stays **iOS-only in V1**; Android AVD/Lottie support is
  deferred until a future task defines the asset contract and renderer. There is no system
  symbol vocabulary, so the future Android path is a per-platform-different **lowering /
  asset contract**, **not a different public component** — the public surface stays `<Fx>`
  (`24`). Lottie remains a possible `via:'lib'` optional peer dependency (`53`).

### `content-distort` — ripple demonstrator (Android-only, DEF-009)

The inverse of the `§shader` path: where a generative shader produces its own pixels
(and deliberately does **not** use `createRuntimeShaderEffect`, § Render paths), a
content-distort shader *filters live content* — exactly the `eval`'d input-shader use
that note set aside. It is the one effect that runs **over live RN children**, which
Android permits and iOS cannot: `RenderEffect` is draw-time, so distorting the content
never touches input dispatch (the iOS severing reason — rule #4 — does not apply because
nothing is reparented into a host; the children stay a plain RN view tree).

- **Rung** — `via:shader, asset:agsl` · `applyVia:RenderEffect` · `clock:frame-nanos` ·
  `requires {os:33, expo-view}`. The iOS rung stays `out-of-scope` (`02`).
- **Mechanic.** An AGSL **sampler** shader declares `uniform shader content;` plus
  `resolution`/`time`/`intensity`, and returns `content.eval(distortedCoord)`. The effect
  is applied to **`FxSurfaceView`'s content container** (the `FxPassthroughContainer` that
  already holds the routed RN children) via
  `container.setRenderEffect(RenderEffect.createRuntimeShaderEffect(rippleShader, "content"))`
  — the second argument names the `content` uniform the program declares, which the platform
  binds to the container's own rendered output. No reparenting, no host: the same view tree,
  one draw-time filter on its `RenderNode`.
- **Touch survives.** `setRenderEffect` is a RenderNode/draw-time concern; `dispatchTouchEvent`
  and `TouchTargetHelper`'s walk are unaffected, so a child inside the distorted content stays
  tappable. This is the load-bearing device proof — visible distortion *and* live child touch.
- **Clock.** A `Choreographer` frame loop advances `time` and refreshes the effect each frame:
  update the `RuntimeShader` uniform, then **re-set** the `RenderEffect` so the change takes —
  the conservative per-frame `setRenderEffect(createRuntimeShaderEffect(…))` re-call ran ~60 fps
  on one surface (POCO F1 / Adreno 630, DEF-009), so it stays; no `invalidate()`-alone motivation.
  The loop is paused off-window through `FxSurfaceView`'s existing
  `pausePresentationLoop`/`resumePresentationLoop` (rule #1, no per-frame JS). Strength rides the
  existing `intensity` (0–1). Uniform writes are guarded by the same source-declaration scan the
  `§shader` path uses — never a `setFloatUniform` probe (the API-33 absent-uniform CheckJNI abort).
- **Loop start — the container's own attach, not the parent's.** The loop must start off the
  **content container's** `View.OnAttachStateChangeListener` (`onViewAttachedToWindow → start`,
  `onViewDetachedFromWindow → stop`), never off the parent `FxSurfaceView`'s `onAttachedToWindow`.
  A `ViewGroup` dispatches its *own* `onAttachedToWindow` **before** its children attach, so a
  start driven off the parent signal sees the container still detached and bails with no retry —
  the ripple then never animates on first mount or after navigate-back (device-found, DEF-009).
  `isLooping`/`stop` keep the listener idempotent with `update`/`resume`. Mirrors how the sibling
  `FxSurfaceShaderView` (itself a `View`) self-manages its own attach.
- **V1 scope — one curated demonstrator.** A single `ripple` sampler, a private bundled AGSL
  asset (`assets/shaders/content_ripple.agsl`) loaded via `AssetManager` alongside the curated
  generative catalog — not a manifest `ShaderId` (it is not a generative catalog entry). A
  missing or malformed asset clears the effect rather than crashing. A broader distortion catalog
  and a BYO-distortion contract are deferred to real demand (SPINE-001); the task proves the
  runtime fact, not the final ergonomics.
- **Surface (deliberately minimal).** A mechanical native/runtime prop `contentDistortion` on
  `FxSurfaceView` — `'ripple'` is the only recognized value; absent or unrecognized = no effect.
  Named mechanically, **never `effect`**, so it cannot be confused with the generative `shader`
  surface, and it is **not** the long-term public API: any high-level sugar is a separate surface
  decision, deferred. Combining `contentDistortion` with a generative `shader` on the same surface
  is out of scope for V1 (undefined).
- **Degradation.** Below API 33 (`createRuntimeShaderEffect`/`RuntimeShader` are 33+, § Version
  gates) the effect is not applied and content renders normally — `{via:'none'}`, never an error.
  iOS ignores the prop (out-of-scope). Closes FX-008.

### `shape-morph` — Android-only (a node in `02`)
- **M3 Expressive shape morph** — native, `requires {os:23, hosted, feature:m3-expressive}`
  (matching `02`). A node in `02` with an **empty iOS ladder** (→ `{via:'none'}` on iOS); the
  canonical way a platform-only capability is expressed.
- **The concrete M3 Expressive floor (pinned).** Two opt-in artifacts:
  - **`androidx.compose.material3:material3` ≥ `1.4.0`** (first stable carrying M3 Expressive,
    2025-09-24) — supplies `MaterialShapes` (the 35-shape library) and the `MotionScheme`
    physics springs (`MotionScheme.expressive()` / `MotionScheme.standard()`).
  - **`androidx.graphics:graphics-shapes` ≥ `1.0.0`** (first stable, 2024-08-21) — the
    `RoundedPolygon` + `Morph` engine `MaterialShapes` draws through; pulled transitively by
    `material3`.
- **Detection — an optional peer dependency, never bundled** (the `via:'lib'` contract, `53`
  decision 6 — same treatment as the Haze / Lottie rungs). The app installs `material3`
  ≥ 1.4.0; fx confirms it at runtime by resolving a sentinel symbol (e.g.
  `androidx.compose.material3.MaterialShapes`) and adds `'m3-expressive'` to the selector's
  `features` set only when present. Absent ⇒ the flag stays unset, the ladder degrades to
  `{via:'none'}`, and motion stays on the standard `SpringForce`. **Bundling is rejected:** it
  would force Compose + `material3` on every consumer (V1 ships no Compose — § Substrates) and
  make M3 the de-facto default, breaking the law (rule #2 — M3 Expressive is progressive
  enhancement over the always-available standard spring, never the default).
- **API 23, not 21.** Compose 1.8 raised the Compose minSdk from 21 to 23, so `material3`
  ≥ 1.4.0 — and every `MaterialShapes` / `MotionScheme` API — runs only on **API 23+**. The
  `graphics-shapes` engine alone is API 21, but the pinned Compose realization is the binding
  floor, so the rung is `os:23` (reconciled in `02` and the shipped manifest). Because these
  are Compose APIs (`applyVia:graphicsLayer`), the rung can only resolve once the hosted
  **Compose** rung is active (deferred — § Substrates / § render paths); the V1 plain-`View`
  path exposes no shape-morph rung and always runs the standard `SpringForce`.

### presence presets (the Android default catalog)

Presence presets (`transient`/`sheet`/`modal`, `42`/`56`) lower through the `motion` content
rung; their **concrete Android shape + spring** is the Android column of `42`'s per-platform
default catalog and lives here once verified. Each must name an Android source (Material
snackbar, bottom-sheet, dialog) and pass the law test (`41`) — and may **diverge in shape**
from iOS (the point of shape-native).

**`transient` — shape device-verified (U7-002, 2026-06-12); spring device-verified
(U7-003, 2026-06-12).** Source: the Material snackbar. Enter: bottom-edge slide **up** + fade (away
vector `opacity 0, translationY = +contentHeight` → identity). Exit: the idiomatic dismiss —
slide back **down**, then the deferred unmount releases. Spring: the law test caught the one
parity gap — the shipped `SpringForce()` default (`STIFFNESS_MEDIUM 1500, dampingRatio
DAMPING_RATIO_MEDIUM_BOUNCY 0.5`) overshoots ~16 %, and a snackbar does **not** bounce. The
catalog value is `dampingRatio = DAMPING_RATIO_NO_BOUNCY (1.0)` at `STIFFNESS_MEDIUM`
(settle ≈ 100–150 ms), shipped as a per-envelope spring parameter from the presence
coordinator to the driver — the driver's no-params default stays the stock `SpringForce`
family — and confirmed on device by per-frame value capture with a default-spring positive
control (U7-003). `sheet`/`modal` stay deferred (DEF-018, trigger:
presence-under-navigation settled).

## § Open questions / schema feedback

The earlier `02` schema gaps are now closed; what's left is Android-specific and
device-bound:

- ~~`shape-morph` needs a node~~ → **resolved:** it is a node in `02` (Android-only, empty
  iOS ladder).
- ~~`content-distort` / unavailable-not-error~~ → **resolved:** `02` decision 9 — a node with
  no satisfiable rung degrades to `{via:'none'}`, never throws.
- ~~`lib` dependency contract~~ → **resolved:** `via:'lib'` is an optional peer dependency,
  app-installed, guards out if absent (`53` decision 6); the manifest may name the package.
- ~~M3 Expressive is opt-in and version-fluid — pin a concrete minimum~~ → **resolved:** the
  floor is pinned in § `shape-morph` — `androidx.compose.material3:material3` ≥ `1.4.0` over
  `androidx.graphics:graphics-shapes` ≥ `1.0.0`, **API 23**, detected as an optional peer
  dependency; springs/morph stay progressive enhancement over the standard `SpringForce`. The
  standard-spring fallback is device-proven (the stock `SpringForce` path ran on M3-less MIUI
  hardware — see the Unit 6 motion device runs).
- **Android default-catalog values** (presence-preset shapes/springs) are device-pending.

## § Sources

- `02-capability-ir-and-lowering.md` — the manifest this column expands.
- `01-substrates-and-hosting.md` — substrate model; the auto-Host (#46549) Android side.
- `30-interaction-and-gestures.md` — the `onTouchEvent`/`ACTION_CANCEL` mechanics.
- Android docs — AGSL/RuntimeShader, RenderEffect, Material 3 Expressive motion (this
  doc's § version gates is the index).
