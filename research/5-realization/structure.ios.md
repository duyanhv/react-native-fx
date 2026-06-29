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
- **Persistent host:** the hosted substrate keeps ONE `UIHostingController` per view
  whose root view reads an observable props holder (`@Published` snapshot of the
  resolved props, the Expo `SwiftUIHostingView` idiom). A prop batch mutates the
  holder and SwiftUI diffs the change into the live tree — in-flight symbol-effect
  state, the shader clock, and glass press state survive unrelated prop changes,
  which is what the eased-uniform `transition` channel rides on. The controller is
  torn down only when the effect identity changes its class of realization
  (SwiftUI-hosted ↔ the UIKit glass surface — the two mount paths stay exclusive)
  or the host unmounts.
- **Accessibility default:** hosted decorative effect views are excluded from the
  accessibility tree (`accessibilityElementsHidden` on iOS,
  `importantForAccessibility="no"` on Android) — a hosted SF Symbol image would
  otherwise surface its own VoiceOver label. The interactive glass surface stays IN
  the tree: it is self-gesturing. (Open: the interactive glass's VoiceOver
  semantics — label, trait, announced state — are owned by the interactive-surface
  work, not pinned here.)

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
- **`expo-view`**: a stock `UILongPressGestureRecognizer(minimumPressDuration = 0)`,
  `cancelsTouchesInView = false` (deliberate divergence from RNGH's `YES` — fx hosts RN
  children and never severs their touch stream), delegate
  `shouldRecognizeSimultaneouslyWith → true`; read `location(in:)` each callback; spring
  back on `.cancelled`. The FSM lives on `FxPressHandler` (plain class), fed by the
  recognizer callbacks. **Slop self-failure is the scroller yield, not a defense** —
  simultaneity opts fx out of the OS auto-cancel when an ancestor pan activates, so past
  the movement slop (`translationX² + translationY² > allowableMovement²`, OR outside the
  hitSlop-inset bounds when `shouldCancelWhenOutside`) the handler force-fails the stock
  recognizer with the `isEnabled` false→true toggle (the RNGH mechanism,
  `RNLongPressHandler.m` `touchesMoved`; a stock recognizer's `state` is
  subclass-settable only) — the OS delivers `.cancelled`, the handler maps it to
  `failed`, springs the uniforms back, and emits nothing. **The handler owns the
  long-press timer** (press-begin rides `minimumPressDuration = 0`, so the recognizer
  cannot time the long-press): a posted timeout at the UIKit 0.5 s convention, cancelled
  on slop/exit (U8-001 preflight, 2026-06-12). `hitTest` override carries the shaped/SDF
  pass-through (U8, `32` D4–5: claim only inside the shader's own shape, evaluated in UV)
  and the animated-container mid-flight caveat (U4) — the same override composes both
  concerns. **The bare-surface hit set is the view itself, the `MTKView`, *and* the
  always-present intermediate container** (a full-bounds `UIView` `super.hitTest` resolves
  to even with zero RN children). Only the container *view itself* counts as bare surface; a
  mounted RN child inside it is a genuine target and returns early untouched. Without the
  container in the set the override never returns `nil` in `none`/outside-shape, and the
  touch dies in the empty container instead of passing through to content composited behind.
  Full mechanics in `30`.
- **`controlled` mode (DEF-020):** attaches **no recognizer** (identical to `none` for the
  gesture system), but enables an imperative write path via `setUniform(name, value)` and
  `setHighlight(x, y)` as Expo `AsyncFunction(view, …)` ref methods. The write lands in the
  same `FxUniforms` buffer the `CADisplayLink` loop already reads (`30` § two input sources,
  one buffer). `setUniform` is guarded by known-uniform name (`intensity`, `pressDepth` —
  unknown names are a no-op). `setHighlight` is sugar over the `touch`/`pressDepth` uniforms
  in `[0,1]` y-up UV (RT-005). The **clobber rule** is the design crux: an imperative override
  is tracked in `imperativeOverrides`; `applyResolvedConfig()` skips reapplying the prop-derived
  value for any overridden uniform. `setUniform(name, nil)` clears the override, letting the
  prop value win again on the next batch. Discrete writes only — no per-frame JS loop.
- **Axis-aware drag/tilt (`active` + `dragAxis`, DEF-011, device-verified 2026-06-18):** with
  `dragAxis` set under `active`, `shouldFail` refines from fail-on-any-movement to *yield only when
  cross-axis movement past slop dominates the claimed axis* — the shader keeps its axis while an
  ancestor scroller scrolls the cross-axis. The stock recognizer's built-in `allowableMovement` is
  set to `.greatestFiniteMagnitude` so UIKit never auto-fails on movement and `shouldFail` is the
  sole arbiter (the handler's own slop constant still governs the default, no-`dragAxis` yield) —
  without this, the 10 pt built-in cap fails the recognizer mid-drag before `shouldFail` runs and
  the press/drag uniforms spring back. Each callback writes `drag` (axis-masked
  `currentTouchUV − originTouchUV`) and `tilt` (full-2D `clamp((currentTouchUV − 0.5)·2, −1, 1)`) as
  vec2 uniforms, signed `[-1,1]`, in the `[0,1]` y-up touch-UV basis (RT-005), into the same
  `FxUniforms` buffer; release eases both to `(0,0)` on the `0.35` press-depth spring.
  `dragAxis="both"` keeps `cancelsTouchesInView = false` + simultaneous recognition and does **not**
  suppress the parent — inside a scroller the scrolling axis belongs to the scroll, so `both` is
  **standalone-only** on iOS (out of scope, not a bug; rule #4).
- **Severing rule:** applying `.layerEffect` to live RN content requires hosting that
  content in SwiftUI, which severs RN/RNGH touch. Hence `content-distort` is
  out-of-scope on iOS.

### Recognizer hosts (cooperatively shared via host protocol)

The `FxPressHandler` FSM (recognizer + arbitration) is decoupled from its hosts via a small **host protocol** that receives press begin/change/end/cancel/long-press callbacks and supplies hit-test information. Both hosts implement the protocol; the FSM stays in `FxPressHandler` and never duplicates.

**Host protocol:**
- `hitTarget(point: CGPoint) -> Bool`: hit-test at a point (effect surface: shader shape via `containsInteractiveShape`; content: full bounds).
- `handlePressBegin(point: CGPoint, depth: Int)`: called on recognizer state `.began`; surface applies uniforms, content applies feedback.
- `handlePressChanged(point: CGPoint, depth: Int)`: called on recognizer state `.changed`; surface updates uniforms, content does nothing.
- `handlePressEnd(point: CGPoint, includePressEvent: Bool)`: called on recognizer state `.ended`; surface resets uniforms, content restores feedback and emits press event if parameter is true.
- `handlePressCancel(point: CGPoint)`: called on recognizer state `.cancelled`; both reset to idle.
- `handleLongPress(point: CGPoint)`: called after long-press timer fires; only active surface responds.
- `attachRecognizer(_:)` / `detachRecognizer(_:)`: add/remove the gesture recognizer from the host's view.

**FxSurfaceView host behavior** (unchanged from U8, now behind protocol):
- Hit-test: `containsInteractiveShape(point:)` for `active` mode, always true for `passive`.
- Feedback: `updatePressUniforms(point:, depth:)` on begin/changed, reset on end/cancel.
- Long-press: `dispatchShaderLongPress(point:)` fires the event.
- Press end: `dispatchShaderPressOut(point:)` fires on end/cancel; `dispatchShaderPress(point:)` fires press only if `includePressEvent == true` (unless long-press fired); `dispatchShaderPressIn(point:)` fires on begin.

**FxPressableView host behavior** (new, content-press):
- Hit-test: full view bounds (no shape testing).
- Feedback: iOS press-in scale ~0.97 + opacity dip on `intermediateContainer` (managed `UIView` wrapping RN children), springs back on end/cancel using `FxSpring` timing (CASpringTimingFunction-based). Android: RippleDrawable foreground on the container.
- Long-press: emits `onLongPress` event to JS.
- Press end: emits `onPress` event if `includePressEvent == true`; `onPressIn/Out` fire on begin/end/cancel.
- Cancellation (slop yield / out-of-bounds): emits `onPressOut` only, no `onPress`.

**iOS feedback (`feedback="native"`):**
Reuses the `FxSpring` timing primitive (a `CABasicAnimation` with a `CASpringTimingFunction`) for the spring-back. On press-in, scales `intermediateContainer` to 0.97 and opacity to 0.8; on release/cancel, animates both back to 1.0 and 1.0 respectively over the spring curve. The spring parameters (damping, stiffness, mass) match FxSpring's defaults. The container is the sole target; no transform of child RN views.

**Android feedback (`feedback="native"`):**
A bounded `RippleDrawable` foreground on the container. Ripple uses a radius cap at ~half the smaller of width/height, color from `?colorControlHighlight` or fallback `#20000000`. Transform feedback on Android is **deferred to a future `feedback` variant** if device testing proves necessary.

**FxStateView host behavior** (new, state-driven content motion):
- Wraps RN children in a Fabric-invisible `intermediateContainer` (`UIView`). `FxAnimationDriver` animates `intermediateContainer`'s `transform`/`alpha` — the same driver used for presence motion, reused as-is.
- `FxStateViewCoordinator` manages an N-state "current → target" FSM. The first prop application snaps without animation (`isFirstApplication` guard). Same-target re-drives are no-ops. An in-flight retarget fires `onFxStateChange` with `{ state, finished: false, interrupted: true }` for the superseded transition, then retargets the driver; the settled transition fires `{ state, finished: true, interrupted: false }`. Exactly one settle event per drive.
- `lift` preset (V1): `idle` → identity transform + opacity 1; `selected` → scale 1.03 + `translationY –3 pt`. Device-tuned at the gate. `stateMotion` overrides the preset per-state.
- Props cross as `state` (string), `preset` (string), `stateMotion` (`[FxStateMotionEntry]`, an array of `{ state, spec }` records — dynamic-key maps cannot cross as Expo Records). `OnViewDidUpdateProps` batches all three before driving.
- Event name: `onFxStateChange`. Payload: `{ state: String, finished: Bool, interrupted: Bool }`.
- The `effect` decoration is **not** a native prop on the state host — `FxView` composes it in JS as a `pointerEvents="none"` `<Fx>` first child. The standard child-mount routes it into the `intermediateContainer` behind the content (earlier child = lower z-order), so it lifts with the content under the same transform. Decorative, behind-content only; an on-top overlay is a future composition decision. No deferred-unmount handshake (all states are always mounted).

### Lifecycle

- Pause the loop off-window/backgrounded; tear down the per-view `MTKView` (drop its
  delegate, pause it) and recognizer on `deinit` (`31`). The fx `ExpoView` is never
  flattened by Fabric.
- **Lazy effect surface.** `FxSurfaceView` builds its `MTKView` only on the first active
  `shader` — a surface used purely as a content-motion wrapper (no `shader`) allocates no
  GPU view. The intermediate content container is always present; the GPU view is added in
  front of it on first need. This keeps a long list of motion wrappers off the GPU (each RN
  card animating a transform allocates nothing, as RN's own driver does).
- **Process-shared Metal context.** The `MTLDevice`, command queue, compiled shader library,
  and the `shaderId → MTLRenderPipelineState` cache are process-wide statics shared by every
  surface, not per-instance: the system vends one default device, the queue is reusable, the
  library is the one bundled `default.metallib`, and a pipeline depends only on its functions
  and the fixed `bgra8Unorm` pixel format — identical for every surface. The context is
  process-lived and never torn down (only the per-view `MTKView` is released on `deinit`); all
  access is on the main thread (Expo prop application and the `MTKView` display link).

### Layout read (the post-layout frame)

How `FxLayoutObserver` (`33`/`36`) reads the RN-assigned frame of `FxSurfaceView` natively —
event-driven, read-only, no JS round-trip.

- **Where RN applies the frame.** Fabric resolves Yoga layout *before* mounting
  (`references/react-native` `ShadowTree.cpp:417`), then applies each view's metrics in
  `updateLayoutMetrics:oldLayoutMetrics:` by setting **`center` then `bounds`** (never `frame`,
  because of transforms) — `references/react-native`
  `React/Fabric/Mounting/UIView+ComponentViewProtocol.mm:84-110`. The applied rect is
  `RCTCGRectFromRect(layoutMetrics.frame)`: **origin relative to the parent's outer border, in
  points** (`ReactCommon/react/renderer/core/LayoutMetrics.h:24`).
- **The read point: KVO on `\.bounds` of the host view.** `updateLayoutMetrics` itself is not
  reachable from Swift — its signature takes `const facebook::react::LayoutMetrics &`, so
  overriding it needs an ObjC++ shim against renderer internals (rejected — rule #7's
  no-shadow-tree-C++ stance). The sanctioned mechanism is expo-modules-core's own in-house
  template, `ExpoSwiftUI.UIViewFrameObserver`: observe `\.bounds`
  (`references/expo` `expo-modules-core/ios/Core/Views/SwiftUI/SwiftUIViewFrameObserver.swift:16-31`).
  Bounds is set **after** center, so the origin is already current when the observation fires;
  both setters run on every frame change, so **origin-only relayouts notify too**. The captured
  frame is `CGRect(origin: view.frame.origin, size: bounds.size)` — parent space, points.
  **Rejected:** `layoutSubviews` as the read point (fires on size changes only — misses
  origin-only relayouts), any polling/`CADisplayLink` layout watcher, and a JS `onLayout`
  round-trip.
- **Window-space reads are live, not captured.** The window origin
  (`convert(bounds.origin, to: nil)`) and edge-travel distances (window bounds vs the frame in
  window space) change when an ancestor scrolls or transforms — with no local layout event — so
  they are computed at read time; only the parent-space frame is captured on layout events.
  Safe-area insets read on demand from `UIView.safeAreaInsets`.
- **Threading + lifecycle.** Fabric mounting and the KVO notification run on the main thread;
  all reads are main-thread synchronous. The observation is created with `FxSurfaceView` and
  invalidated in its `deinit` — no observation after detach, no retain cycle (the observer
  holds the view unowned; the KVO handler captures weakly).

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
- **V1: static hosted gradient** — `FxFillView` draws a fixed platform-default `MeshGradient`
  (`requires {os:18, hosted}`) / `LinearGradient` fallback (`requires {os:13, hosted}`),
  `applyVia:.overlay`. `intensity` drives the layer's opacity; nothing animates and no per-call
  vertices/colors are read in shipped V1 (no `clock:timeline`, no JS-resolved grid).
- **Deferred (fill wire-through)** — configurable colors/angle/kind and animated mesh drift (the
  full gradient family + `TimelineView`-driven `MeshGradient`) are the planned wire-through; not
  built until it lands.

### `material`
- **UIKit glass surface** (the shipped iOS-26 rung) — `UIVisualEffectView` + `UIGlassEffect` ·
  `requires {os:26, hosted}` · `applyVia:UIVisualEffectView`. `FxHostedView` mounts an
  `FxGlassSurfaceView` (a `UIView` owning an autoresizing-mask-filled `UIVisualEffectView`)
  **directly as a UIKit subview, not through `UIHostingController`**. This overturns the
  earlier claim that the shipped rung is the SwiftUI `.glassEffect` modifier ("one rung, not a
  separate UIKit rung"): the device spike (`research/wip/interactive-glass-touch-delivery.md`)
  proved the SwiftUI modifier cannot present a clear backdrop and the system interaction view
  at once — a clear-filled shape never installs `UIPlatformGlassInteractionView`, so the
  interactive press and the clear fill are mutually exclusive on that rung. The `21` config
  lowers onto `UIGlassEffect`: `variant` maps `regular`/`clear` to
  `UIGlassEffect.Style.regular`/`.clear` (unknown values fall back to the regular glass), and
  `interactive` sets `UIGlassEffect.isInteractive` — the system interaction view owns the
  press and its arbitration (`interaction:'self'`; fx installs no recognizer). fx does not
  adopt an identity/none style (`21` ships `regular`/`clear` only). The **`FxGroup`/`FxItem`**
  compound (`57`) uses the UIKit `UIGlassContainerEffect` — not the SwiftUI
  `GlassEffectContainer` — because the items are UIKit surfaces (`FxGlassSurfaceView`).
  `FxGroupView` owns a `UIVisualEffectView` carrying `UIGlassContainerEffect` (guarded
  `@available(iOS 26.0)` + `NSClassFromString("UIGlassContainerEffect") != nil`) and routes
  children into `containerEffectView.contentView` via `mountChildComponentView`, making
  sibling glass surfaces direct siblings under the container effect layer so the system can
  merge them. Below iOS 26 or when the class is absent: a plain passthrough; items render
  their own glass rung individually (the ratified shape-native divergence, DOC-006). `FxItem`
  is minimal JS — a React Fragment passthrough with no native view — so the glass mounts as
  directly as possible under `FxGroupView`.
- **Glass lifecycle (pinned mechanic)** — `UIGlassEffect` must be (re)created during
  `layoutSubviews()`, not `didMoveToWindow()` (creating it there does not render —
  expo/expo#43732). Toggling `isInteractive` requires clearing the prior effect
  (`effect = UIVisualEffect()`) before assigning the new `UIGlassEffect`. On window re-entry
  the view calls `setNeedsLayout()`, because `layoutSubviews` may not fire when geometry is
  unchanged. Precedent: `references/expo/packages/expo-glass-effect/ios/GlassView.swift`.
- **Press delivery and scroll coexistence (device-grounded, 2026-06-10)** — the UIKit rung
  installs no separate hittable interaction *view* (unlike the SwiftUI modifier's
  `UIPlatformGlassInteractionView`): `isInteractive` rides interaction objects
  (`_UIFlexInteraction`, `_UIUpdateLinkViewInteraction`) attached to the
  `UIVisualEffectView` itself, present only while interactive. The backdrop-independent
  verification signal for the press is therefore the effect view's interaction set (or a
  live tap), never a hit-test winner class and never frame-diff over an animated backdrop.
  Inside an RN scroller the rung is scroll-through: a drag beginning on the interactive
  glass pans the parent list; only a tap produces the press. The system owns that
  arbitration — fx installs no recognizer on `hosted` (`01` decision 6).
- **Glass shape** — the host layer's `cornerRadius` (`self.layer.cornerRadius`), read at
  `layoutSubviews()` time, flows into the effect view's `cornerConfiguration` as a single
  uniform radius. If the host layer reports `cornerRadius == 0`, the glass renders as a sharp
  rectangle — the fallback when the layer has no rounded corner (or when Fabric does not set
  it). Radius changes update `cornerConfiguration` in place; they never remount the rung.
- **`tint` + `colorScheme` (iOS-26 rung)** — `tint` (a `#RGB`/`#RRGGBB`/`#RRGGBBAA` hex
  string) maps to `UIGlassEffect.tintColor` via a local hex parser (nil/unrecognised → no
  tint, the untinted system glass). The Android peer parses the same format set + byte order. `colorScheme` maps to `effectView.overrideUserInterfaceStyle`: `system` →
  `.unspecified`, `light` → `.light`, `dark` → `.dark`; it is applied to the
  `UIVisualEffectView`, not the `UIGlassEffect` (mirrors
  `references/expo/packages/expo-glass-effect/ios/GlassView.swift`). Both are applied
  in-place via the existing `setMaterialConfig` diff path — no remount.
- **`colorScheme` on the below-26 fallback** — `colorScheme` passes through to
  `FxMaterialView` as a SwiftUI `ColorScheme?` and is applied via
  `.environment(\.colorScheme, scheme)`. `tint` has no equivalent on SwiftUI adaptive
  materials and degrades silently on this rung — the system material has no tint API.
- **`.ultraThinMaterial`** — `requires {os:15, hosted}` · `applyVia:.background`.
  Fallback below 26.

#### Glass compositing limit

`.glassEffect` samples only what is behind its own SwiftUI host, not a sibling RN-layered
hosted view. If an app wants glass to refract a backdrop that is an `FxHostedView` (e.g.,
an `aurora` shader), both views must be composed inside the same `UIHostingController` as
the glass. That arrangement is supported because fx-drawn content is not RN content (rule #4
applies to RN content, not to fx-drawn effects). The `FxGroup`/`FxItem` compound is the
intended tool for in-host glass composition.

### `shader`
- **Decorative** — `lower:shader, asset:metal` · `requires {os:17, hosted}` ·
  `applyVia:.colorEffect` · `clock:timeline`. The Aurora-class generative glow; draws
  itself, samples nothing; host with `pointerEvents:none`.
- **Interactive** — `lower:shader, asset:metal` · `requires {os:17, expo-view}` ·
  `applyVia:MTLRenderPipelineState` · `clock:display-link` · `cadence:display-rate`. Carries
  the recognizer + G runtime; press/pointer feed `pressDepth`/`glowX`/`glowY` natively. The
  raster path implements a subset of the curated catalog (the rest render only on the
  decorative `.colorEffect` path); `fragmentName(for:)` returns nil for an id with no raster
  function, so the pipeline is nil and the surface fires `onFxError` rather than drawing the
  wrong shader.
- **BYO** — same two rungs with developer-supplied `.metal`; no special path.
- **Runtime compilation (DEF-008 — registry-sourced; spike resolved → expo-view only).** A BYO
  shader registered with inline source (`registerShader({ source: { ios, android } })`) compiles
  at runtime instead of needing a build-time `.metallib`. The first-party runtime compile path is
  **`MTLDevice.makeLibrary(source:)`** → a `MTLFunction` → `MTLRenderPipelineState`, used by the
  **expo-view raster rung**. **Spike result (DEF-008 step 1): the hosted `.colorEffect` path
  cannot take a runtime shader, so runtime-source shaders lower through the expo-view Metal path
  even for decorative use.** The SwiftUI `Shader` surface admits a function only through a
  `ShaderLibrary`, whose only public initializers are `.default`, `init(url:)`, and `init(data:)`
  (a *compiled* `.metallib` URL/blob) — there is no public initializer over an `MTLLibrary`,
  `MTLFunction`, or MSL source string (verified, iOS 26.5 SDK), and `makeLibrary(source:)` yields
  an `MTLLibrary` with no public path back to metallib `Data`. So a runtime-compiled library has
  no bridge into `.colorEffect`; the negative is an API-surface fact, not a render quirk. The
  on-device render of the expo-view lowering is confirmed by the DEF-008 device scenario (point
  5). **Runtime BYO consumes via the `FxSurfaceView` (expo-view) `shader` prop on both platforms.**
  The runtime fragment ABI mirrors the bundled raster path: the author supplies MSL that defines
  `fragment half4 fx_fragment(VSOut in [[stage_in]], constant FxUniforms &u [[buffer(0)]])`; fx
  prepends a fixed preamble (the `FxUniforms` + `VSOut` struct definitions) and links the bundled
  `fx_fullscreen_vertex` with the runtime fragment. Compiled pipelines cache by the **source
  string** (which encodes platform=iOS, the fixed `fx_fragment` name, and the default compile
  options) in a process-wide runtime cache distinct from the curated `shaderId` cache — so two ids
  with different source never collide and the same source never recompiles; compile failure →
  `onFxError`. A registered id with no iOS source degrades to `{via:'none'}` (silent, the pair
  rule); an unknown id (neither curated nor registered) fires `onFxError`. **Re-registration is a
  clean dev-time replacement:** re-registering an id with new source overwrites the registry entry;
  the next mount compiles the new source under its own cache key (the prior pipeline lingers,
  process-lived and harmless); re-registering identical source is an idempotent no-op.
- **Load/error events** — `FxSurfaceView` dispatches `onFxLoad`/`onFxError` once per shader
  change (never per frame — rule #1): a usable id whose pipeline compiles loads, clearing to
  empty is silent, anything else errors. This is the signal a BYO consumer falls back on
  (`22` §Events). Payload `{ shader, reason? }`.
- **Absent ⟺ empty ⟺ no effect** — Expo omits an `undefined` prop from the batch, so the
  native setter never fires and a previously set shader would stick. The JS binding coerces
  `shader ?? ''` so the prop is always present; native treats `""` as no effect (hides the
  surface, pauses the loop). Setting `shader` back to `undefined` clears it.

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
  discrete targets, SwiftUI animates between them. `.animation(value:)` realizes the `state`
  rung; `PhaseAnimator`/`KeyframeAnimator` are the `clock.phase`/`clock.keyframes` rungs in the
  grammar sequence (`41` decision 15). Those two are **additive future rungs** — confirmed to
  exist but not yet signature-extracted (`UnitCurve` likewise); they build when a consumer pulls
  them, with no public API frozen here.

### `source`

**Shipped (DEF-014, device-ratified 2026-06-14).** The third driver node (`02` decision 14) —
a native **scroll** value mapped to presentation
natively, the render-server-fidelity tier of the `source` driver. iOS hosted is the only
substrate where the guarantee is both zero per-frame JS *and* zero per-frame main-thread work
(`02` d14); the rung is hosted-only and drives fx's **own** content, never wrapped RN content.

- **Render-server scroll source** — `requires {os:17, substrate:hosted}` · `target:'effect'` ·
  `applyVia:.scrollTransition` / `.visualEffect`. fx hosts its own SwiftUI `ScrollView`; the
  effect items inside it carry `.scrollTransition { content, phase in … }` (the standard
  per-item edge transition) or `.visualEffect { content, proxy in … }` reading
  `proxy.frame(in:)` against the scroll coordinate space. SwiftUI runs the mapping in the
  **render server**, off the main thread — the only tier where both per-frame guarantees hold.
- **The default mapping is SwiftUI's own** standard scroll transition (edge fade + scale) — the
  shape-native law, not an invented cross-platform curve. An explicit `source` binding maps
  scroll progress to the effect's animatable properties; the resting (on-screen, fully-scrolled-in)
  shape is identity.
- **Content is fx-owned; the scroll source is fx's hosted `ScrollView`.** Applying a
  scroll-linked SwiftUI effect to live RN content would require hosting it, severing RN touch —
  the same severing rule that puts `content-distort` out of scope (§Touch contract, rule #4). An
  fx view dropped inside an RN `UIScrollView` has no SwiftUI scroll ancestor for
  `.scrollTransition` / the `.scrollView` coordinate space to resolve against, so render-server
  fidelity is inherently the self-contained-hosted case.
- **Clock.** The advancing value is scroll offset, read by SwiftUI's scroll pipeline — no
  `CADisplayLink`, no `TimelineView`. The scroll *is* the clock; at rest nothing advances.
- **Hosting boundary.** The hosted `ScrollView` mounts through the proven persistent-
  `UIHostingController` path (§Hosting mechanics); confirm it sizes through the auto-Host
  boundary (`shadowNodeProxy.setStyleSize`) and that its own scroll gesture stays self-contained
  (rule #3 self-gesturing) — never nest interactive RN content as the first child of the
  `RNHostView` (the §Hosting mechanics landmine).
- **fallback.** Below iOS 17 the ladder is empty → `{via:'none'}`: content renders static, no
  scroll-linked motion. The ambient-RN-scroll best-effort tier (a native `contentOffset` reader
  feeding the hosted view) and the Android rung are separate later rungs, not this one.

### `symbol`
- **`.symbolEffect`** — `requires {os:17, hosted}` (`.breathe`/`.rotate`/`.wiggle`
  need 18); `.contentTransition(.symbolEffect)` for symbol→symbol. Self-contained,
  self-gesturing where relevant. No `expo-view` rung. The displayed glyph is
  `replaceWith ?? name`: setting `replaceWith` arms
  `.contentTransition(.symbolEffect(.automatic))` and the system animates the
  symbol→symbol transition when the resolved glyph changes; while set, `replaceWith`
  takes precedence over `name`.

### `content-distort` — out-of-scope on iOS
- **`.layerEffect`** — `requires {os:17, hosted}`, `status:out-of-scope`. Sampling a
  live RN subtree severs RN touch (above). Recorded here so the limit stays in data.

### presence presets (the iOS default catalog)

Presence presets (`transient`/`sheet`/`modal`, `42`/`56`) are orchestrations over the
`motion` content rung, not IR nodes — but their **concrete iOS shape + spring** is the iOS
column of `42`'s per-platform default catalog, and it lives here once verified on device.
Each must name an iOS source (system banner, `.sheet` presentation, alert) and pass the law
test (`41`).

**`transient` — device-verified (U7-002, 2026-06-12), kept-default.** Source: the system
banner. Enter: top-edge slide **down** + fade (away vector `opacity 0, translationY =
-contentHeight` → identity). Exit: the idiomatic retraction — slide **up** the way it came,
fading, then the deferred unmount releases the child. Spring: `SwiftUI.Spring()` default
(`duration 0.5, bounce 0`), no overshoot, settle ≈ 0.75 s — the platform's own family, no
adjustment demanded by the law test (the settle tail reads marginally longer than a live
banner's, but the nameable-source default wins over invented timing). `sheet`/`modal` stay
deferred with the MOT-001 rider.

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
