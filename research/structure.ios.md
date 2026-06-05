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
  surface. A first-class UIKit citizen: recognizers attach directly and scroll/RNGH
  arbitration mediates for free. Carries the runtime (G). Required for any
  fx-managed interaction.

**Rule:** decorative/generative ⇒ `hosted`; interactive ⇒ `expo-view`. fx owns its
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
  are referenced by name. Uniforms upload via `setFragmentBytes` (`<4 KB`) at buffer
  index 0; `time`/`resolution` are native-injected each frame, never from JS.

### Touch contract

- **`hosted`**: the only lever is `pointerEvents`. Coarse and rectangular — fine for
  decorative overlays, insufficient for shaped interaction.
- **`expo-view`**: `UILongPressGestureRecognizer(minimumPressDuration = 0)`,
  `cancelsTouchesInView = false`, delegate `shouldRecognizeSimultaneouslyWith → true`;
  read `location(in:)` each callback; spring back on `.cancelled`. `hitTest` override
  carries the shaped/SDF pass-through. Full mechanics in `30`.
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
- **MeshGradient** — `requires {os:18, substrate:hosted}` · `applyVia:.overlay` ·
  `clock:timeline` (animate vertex positions/colors off `TimelineView`). Behavior:
  semantic uniforms = grid points + colors, resolved in JS.
- **LinearGradient** — `requires {os:13, hosted}` · `applyVia:.overlay` · static.
  Fallback below 18.

### `material`
- **`.glassEffect`** — `requires {os:26, hosted}` · `applyVia:.glassEffect`. Use
  `GlassEffectContainer` when multiple glass shapes must morph; glass can't sample
  glass. Self-gesturing via `.interactive()` (owns its own tap response).
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
  a wrapper around live RN content (that re-raises the severing problem). Bundle them
  inside an effect component, not as a general RN-content modifier.

### `motion`
- **`phaseAnimator`/`keyframeAnimator`/`.animation`** — `requires {os:17, hosted}`.
  Drive a hosted effect's targets (intro/outro/state). These realize the native side
  of the eased-`transition` channel owned by `40`; JS sets discrete targets, SwiftUI
  animates between them.

### `symbol`
- **`.symbolEffect`** — `requires {os:17, hosted}` (`.breathe`/`.rotate`/`.wiggle`
  need 18); `.contentTransition(.symbolEffect)` for symbol→symbol. Self-contained,
  self-gesturing where relevant. No `expo-view` rung.

### `content-distort` — out-of-scope on iOS
- **`.layerEffect`** — `requires {os:17, hosted}`, `status:out-of-scope`. Sampling a
  live RN subtree severs RN touch (above). Recorded here so the limit stays in data.

## § Open questions / schema feedback

Writing this column surfaced gaps to feed back into `02`:

- **`shape-morph` has no node.** M3 Expressive gives Android a native shape-morph;
  iOS has no clean equivalent. It needs a canonical node (with an iOS `none`/`planned`
  rung) or an explicit "Android-only capability" carve-out.
- **`interactive` is too binary.** `material`/`symbol` are *self-gesturing* — neither
  fx-managed (`expo-view`) nor inert. Consider `interaction: 'none' | 'self' | 'fx'`
  instead of a boolean, so the selector doesn't push self-gesturing system components
  toward the G substrate.
- **Per-substrate clock confirmed** — putting `clock` on the rung (not the node) is
  correct: `shader` uses `timeline` hosted but `display-link` on `expo-view`.

## § Sources

- `02-capability-ir-and-lowering.md` — the manifest this column expands.
- `01-substrates-and-hosting.md`, expo/expo#46549 — the hosting model and auto-Host.
- `30-interaction-and-gestures.md` — the `expo-view` recognizer mechanics.
- Apple docs — MeshGradient, glassEffect, colorEffect/ShaderLibrary, TimelineView,
  symbolEffect, MTKView/CADisplayLink (this doc's § version gates is the index).
