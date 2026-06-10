# structure.ios — iOS realization
Status: researched
Feeds: 02-capability-ir-and-lowering.md (renders its iOS column), the capability docs, 30-interaction

This is the **sole authority for iOS mechanics**. It expands the iOS column of the
capability manifest (`02`): first the fundamentals every capability sits on, then a
section per IR node that turns the manifest's iOS rungs into concrete native work.
Cross-platform docs reference this file and never restate a recognizer config or an
API level. The Android peer is `structure.android.md`.

## § Platform fundamentals

### Substrates

- **`hosted`** — a SwiftUI view hosted inside RN via Expo's `Host` / `RNHostView`
  (`UIHostingController`). Decorative or self-gesturing. The auto-Host boundary
  (expo/expo#46549) owns sizing (writes back through `shadowNodeProxy.setStyleSize`)
  and offers only a coarse `pointerEvents` hit-test lever. This is the **main path**
  for generative effects.
- **`expo-view`** — a plain `ExpoView` (`UIView`) hosting an `MTKView`/`CAMetalLayer`
  surface **or wrapping RN content**. A first-class UIKit citizen: recognizers attach
  directly and scroll/RNGH arbitration mediates for free. Carries the **owned runtime** —
  interaction (G) **and** content motion (the wrapped-content presentation, `33`–`36`).
  Required for fx-managed interaction *and* wrapped-content motion.

**Rule:** decorative/generative ⇒ `hosted`; interactive *or wrapped-content motion* ⇒
`expo-view`. fx owns its
own views (`requireNativeView('ReactNativeFx', …)`); it is **not** built as an
`@expo/ui` universal component, so it is never auto-Hosted and never hands its
layout/hit-testing to a `UIHostingController`.

### Hosting mechanics (when on `hosted`)

- A full-surface effect must set `pointerEvents="none"`/`box-none` so touches reach
  RN content below; `UIHostingController` captures touches across its whole bounds,
  and passthrough only works in empty regions.
- **Landmine:** `RNHostView` attaches an RN touch handler to its first child UIView
  (`ExpoUITouchHandlerHelper.createAndAttachTouchHandler`). Never nest an interactive
  fx view as the first child of an `RNHostView` — it double-handles touches.
- fx hosts SwiftUI itself with a boundary it controls (own the `pointerEvents` +
  sizing), rather than riding the universal auto-Host.

### Clock (what advances `time`)

- **`hosted`** → `TimelineView(.animation)` schedules the SwiftUI redraw; the shader
  reads its date for `time`.
- **`expo-view`** → `CADisplayLink` driving the `MTKView` render loop. Pause when
  off-window or backgrounded (`31`).

### Render paths

- **SwiftUI generative**: gradients, `MeshGradient`, materials, `.glassEffect`,
  `Canvas`.
- **Shader, hosted**: `.colorEffect`/`ShaderLibrary` against a build-time
  `.metallib`.
- **Shader, expo-view**: `MTLRenderPipelineState` + `MTKView`. Runtime
  `makeLibrary(source:)` is available but build-time `.metallib` is the default.
- `.metal` files in the target compile into `default.metallib` at build; functions
  are referenced by name. The podspec uses `resource_bundles` (not `source_files`,
  because the pod is `static_framework`) with `MTL_LIBRARY_OUTPUT_DIR` redirecting
  the compiled output to `FxShaders.bundle/default.metallib`. At runtime, the hosted
  shader path resolves `ShaderLibrary(url:)` against `FxShaders.bundle`, falling
  back to `ShaderLibrary.default`. Uniforms upload via `setFragmentBytes` (`<4 KB`)
  at buffer index 0; `time`/`resolution` are native-injected each frame, never
  from JS.

### Touch contract

- **`hosted`**: the only lever is `pointerEvents`. Coarse and rectangular — fine for
  decorative overlays, insufficient for shaped interaction.
- **`expo-view`**: `UILongPressGestureRecognizer(minimumPressDuration = 0)`,
  `cancelsTouchesInView = false`, delegate `shouldRecognizeSimultaneouslyWith → true`;
  read `location(in:)` each callback; spring back on `.cancelled`. `hitTest` override
  carries the shaped/SDF pass-through (U8) and the animated-container mid-flight caveat
  (U4) — the same override composes both concerns. Full mechanics in `30`.
- **Severing rule:** applying `.layerEffect` to live RN content requires hosting that
  content in SwiftUI, which severs RN/RNGH touch. Hence `content-distort` is
  out-of-scope on iOS.

### Lifecycle

- Pause the loop off-window/backgrounded; tear down the `MTKView`, pipeline, and
  recognizer on `deinit` (`31`). The fx `ExpoView` is never flattened by Fabric.

### Version gates

| iOS | Unlocks |
|---|---|
| 13 | `Linear/Radial/Angular/EllipticalGradient` |
| 15 | `TimelineView`, `Canvas`, materials (`.ultraThinMaterial`…) |
| 17 | shader effects (`.colorEffect`/`.distortionEffect`/`.layerEffect`), `ShaderLibrary`, `symbolEffect`, `phaseAnimator`, `keyframeAnimator`, `.visualEffect`, `.scrollTransition` |
| 18 | `MeshGradient`; symbol effects `.breathe`/`.rotate`/`.wiggle` |
| 26 | Liquid Glass (`.glassEffect`, `GlassEffectContainer`), `.backgroundExtensionEffect` |

## § Per-capability realization

Each section expands the iOS rungs from `02`. Format mirrors a manifest rung:
**primitive/lower · requires · applyVia · clock · behavior · fallback**.

### `fill`
- **Gradient family** — `type: linear|radial|angular` → SwiftUI
  `LinearGradient`/`RadialGradient`/`AngularGradient` (also `EllipticalGradient`) ·
  `requires {os:13, hosted}` · `applyVia:.overlay` · static by default. The whole gradient
  family, not one primitive.
- **MeshGradient** (the `mesh` kind) — `requires {os:18, substrate:hosted}` ·
  `applyVia:.overlay` · `clock:timeline` (animate vertex positions/colors off `TimelineView`).
  Behavior: semantic uniforms = grid points + colors, resolved in JS. Mesh degrades to a
  linear gradient below 18.

### `material`
- **SwiftUI-hosted glass** (the shipped rung) — `.glassEffect` · `requires {os:26, hosted}` ·
  `applyVia:.glassEffect`. fx's iOS substrate is SwiftUI, so the shipped rung is the SwiftUI
  modifier, **backed by the same system glass UIKit surfaces as `UIGlassEffect` /
  `UIVisualEffectView`** (the API names `21` cites at the capability level) — **one rung, not
  a separate UIKit rung.** `GlassEffectContainer` is the SwiftUI realization of the
  **`FxGroup`/`FxItem`** compound (`57`) when multiple glass shapes must morph; glass can't
  sample glass. Self-gesturing via `.interactive()` (≈ UIKit `isInteractive`; owns its own tap
  response — `interaction:'self'`). The `21` config lowers onto the modifier's `Glass` value:
  `variant` maps `regular`/`clear` to `Glass.regular`/`Glass.clear` (↔ `UIGlassEffect.Style`),
  and `interactive` applies the `Glass.interactive(_:)` combinator —
  `.glassEffect(glass.interactive(bool))`. SwiftUI also exposes `Glass.identity`; fx does not
  adopt it (`21` ships `regular`/`clear` only). Unknown variant values fall back to the
  regular glass.
- **`.ultraThinMaterial`** — `requires {os:15, hosted}` · `applyVia:.background`.
  Fallback below 26.

### `shader`
- **Decorative** — `lower:shader, asset:metal` · `requires {os:17, hosted}` ·
  `applyVia:.colorEffect` · `clock:timeline`. The Aurora-class generative glow; draws
  itself, samples nothing; host with `pointerEvents:none`.
- **Interactive** — `lower:shader, asset:metal` · `requires {os:17, expo-view}` ·
  `applyVia:MTLRenderPipelineState` · `clock:display-link`. Carries the recognizer +
  G runtime; press/pointer feed `pressDepth`/`glowX`/`glowY` natively.
- **BYO** — same two rungs with developer-supplied `.metal`; no special path.

### `filter`
- **`.blur`/`.saturation`/`.hueRotation`/`.shadow`/`.drawingGroup`** —
  `requires {hosted}`. Applied to the effect's **own** hosted content only — never as
  a wrapper around live RN content (that re-raises the severing problem). A step inside an
  `EffectStack` (mounted by `<Fx>`/`FxView effect`, `55`/`57`), not a general RN-content modifier.

### `motion`
The driver node (`02`) lowers two ways, by **target**:
- **content target** — render-server-first springs on the **intermediate container's**
  `CALayer` · `requires {os:17, expo-view}` · `applyVia:CALayer` (ratified DOC-009).
  Fire-once envelopes — the common presence/state case — commit the iOS 17 unified spring
  (`UIView.animate(springDuration:bounce:)` / `CASpringAnimation` with Apple's defaults),
  so Core Animation runs them in the **render server**, off the app's main thread. On an
  actual mid-flight retarget, capture the presentation-layer value and hand off to a
  `CADisplayLink` loop stepping `SwiftUI.Spring` behind the **`FxSpring`** facade (a
  substrate-free solver — pure `VectorArithmetic` math, no view hosted, rule #4 untouched):
  carry velocity, clip inertia opposing the new target, write one transform+opacity
  envelope to the model layer per tick, rest-test, emit a single completion event. Below
  iOS 17 the ladder is empty — `{via:'none'}`, instant placement (consistent with the
  reduce-motion posture). `FxSurfaceView` hosts the children in a nested container and the
  animator targets that container's `CALayer` transform/opacity; Fabric tracks only the
  outer `FxSurfaceView` and never overwrites the container. Transform/opacity only ⇒ touch
  survives. **Child routing follows the proven RCT/Expo nested-container pattern, not a
  one-sided override.** RN itself hosts Fabric children one level down via `currentContainerView`
  (`references/react-native` `RCTViewComponentView.mm`), and `expo-glass-effect`'s `GlassView.swift`
  + gesture-handler's `RNGestureHandlerButtonComponentView.mm` ship it. Two valid realizations:
  route children through the view's `contentView`/`currentContainerView` slot so the default
  mount/unmount machinery targets the container automatically, **or** override
  `mountChildComponentView` **and** `unmountChildComponentView` as a **symmetric pair** against
  the *same* container — never mount alone (the default unmount asserts the child's superview is
  the container). On unmount the child must `removeFromSuperview()` (RN asserts a detached child
  has no superview — `SwiftUIHostingView.swift`). iOS has no child-accessor methods to proxy. **Caveat (`34`):**
  on the committed render-server path, hit-testing reads the **model layer** (the target),
  so touch is correct at rest and, mid-flight, lands at the element's destination rather
  than its on-screen position; while the `FxSpring` integrator runs (retarget only), the
  model layer is written each tick, so touch tracks the **visual** position — same as
  Android. A `hitTest` override against the presentation layer is deferred to U6/U8 if
  mid-transition interaction proves to matter. Spring defaults come from the iOS 17
  unified spring's own defaults (the law); `tune` adjusts within that family, authored as
  `{ duration, bounce }` (`41` decision 11). Presence (`42`/`54`) composes this rung into enter/hold/exit
  via `FxPresenceCoordinator`; the deferred-unmount handshake is `35`.
  **Effect surface visibility:** the `metalView` (GPU surface) is hidden when no effect is
  active (`pendingShader` empty or invalid), so it never obscures the content-motion
  container. The effect surface sits above the container in z-order; when both are active
  the composition concern (SPINE-004, background/overlay/surface) intersects the U3 V2
  interactive surface and is not yet decided.
- **effect target** — `phaseAnimator`/`keyframeAnimator`/`.animation`
  (`requires {os:17 · 16 for .animation, hosted}`). Drive a hosted effect's own targets
  (intro/outro/state) — the native side of the eased-`transition` channel (`40`); JS sets
  discrete targets, SwiftUI animates between them.

### `symbol`
- **`.symbolEffect`** — `requires {os:17, hosted}` (`.breathe`/`.rotate`/`.wiggle`
  need 18); `.contentTransition(.symbolEffect)` for symbol→symbol. Self-contained,
  self-gesturing where relevant. No `expo-view` rung.

### `content-distort` — out-of-scope on iOS
- **`.layerEffect`** — `requires {os:17, hosted}`, `status:out-of-scope`. Sampling a
  live RN subtree severs RN touch (above). Recorded here so the limit stays in data.

### presence presets (the iOS default catalog — device-pending)

Presence presets (`transient`/`sheet`/`modal`, `42`/`56`) are orchestrations over the
`motion` content rung, not IR nodes — but their **concrete iOS shape + spring** is the iOS
column of `42`'s per-platform default catalog, and it lives here once verified on device.
Each must name an iOS source (system banner, `.sheet` presentation, alert) and pass the law
test (`41`). Device-pending.

## § Open questions / schema feedback

Writing this column fed gaps back into `02` — now closed:

- ~~`shape-morph` has no node~~ → **resolved:** `02` carries `shape-morph` (Android-only;
  the empty iOS ladder degrades to `{via:'none'}`).
- ~~`interactive` is too binary~~ → **resolved:** `02` uses `interaction: 'none' | 'self' | 'fx'`.
- **Per-substrate clock confirmed** — `clock` on the rung (not the node): `shader` is
  `timeline` hosted, `display-link` on `expo-view`.
- **The iOS default-catalog values** (presence-preset shapes/springs) are device-pending.

## § Sources

- `02-capability-ir-and-lowering.md` — the manifest this column expands.
- `01-substrates-and-hosting.md`, expo/expo#46549 — the hosting model and auto-Host.
- `30-interaction-and-gestures.md` — the `expo-view` recognizer mechanics.
- Apple docs — MeshGradient, glassEffect, colorEffect/ShaderLibrary, TimelineView,
  symbolEffect, MTKView/CADisplayLink (this doc's § version gates is the index).
