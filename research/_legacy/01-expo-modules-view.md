# Expo Modules view authoring (foundation)
Status: researched
Feeds: skills/react-native-fx/references/quickstart.md (and underpins every component)

## Why this matters
Every fx component is a native view. The research thesis's decided substrate is the
**Expo Modules API** specifically because its view layer (`View {}` DSL with
`Prop` / `Events` / `AsyncFunction`) is the most ergonomic way to author a
Fabric-backed native view, and it handles Fabric registration for us (no
hand-written Codegen specs). This doc pins exactly how that DSL works so the V1
native `ShaderView` can be implemented as a real Fabric-backed Expo view, with
native interaction and a Metal rendering surface.

## Research questions
- How the `View {}` DSL maps to a Fabric view (`Prop`, `Events`, `AsyncFunction`,
  `OnViewDidUpdateProps`, `GroupView`).
- The native view base class on each platform and where setup/children/teardown
  go — and how RN children compose around a shader surface.
- How props flow JS→native and on which thread (incl. batch ordering).
- How to emit semantic events (`onPress`, …) to JS.
- How JS binds to the native view (typed component): `requireNativeView` vs
  `requireNativeViewManager`.
- Color/enum prop coercion across the boundary — built in or hand-parsed?
- Fabric view-flattening: is an `ExpoView` auto-protected or do we need
  `collapsable={false}`?
- Min Expo SDK / RN / New Arch requirement.

## Findings

### The module + view shape
A module's `definition()` returns a `ModuleDefinition`; a `View(<NativeClass>)
{ … }` block turns that module into a native view. The `View` component "accepts
definition components such as `Prop`, `Events`, `GroupView`, and `AsyncFunction`"
and the `viewType` argument "specifies the class of the native view to be
rendered, with Android requiring the class to inherit from `ExpoView`" — the same
holds on iOS in practice. The same Swift/Kotlin file declares the props, events,
and imperative methods. [module-api]

```swift
// ios — FxShaderModule.swift
import ExpoModulesCore

public class FxShaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeFx")

    View(FxShaderView.self) {
      // Setters STASH only — see "Two-phase prop rule" below.
      Prop("shader")          { (view: FxShaderView, value: ShaderId)            in view.pending.shader = value }
      Prop("uniforms")        { (view: FxShaderView, value: ShaderUniformRecord) in view.pending.uniforms = value }
      Prop("interactionMode") { (view: FxShaderView, value: InteractionMode)     in view.pending.interactionMode = value }
      Prop("composition")     { (view: FxShaderView, value: ShaderComposition)   in view.pending.composition = value }

      Events("onPress", "onPressIn", "onPressOut", "onLongPress")

      // Imperative channel for `controlled` mode. Attaches to the React ref,
      // receives the view as arg 0, runs on the UI thread.
      AsyncFunction("setHighlight") { (view: FxShaderView, x: Double, y: Double) in
        view.setHighlight(x: x, y: y)
      }
      AsyncFunction("setPressed") { (view: FxShaderView, pressed: Bool) in
        view.setPressed(pressed)
      }
      AsyncFunction("setUniform") { (view: FxShaderView, name: String, value: Double) in
        view.setUniform(name, value: value)
      }

      // Runs ONCE after the whole prop batch lands — apply the effect here.
      OnViewDidUpdateProps { (view: FxShaderView) in
        view.applyResolvedConfig()
      }
    }
  }
}
```

```kotlin
// android — FxShaderModule.kt
class FxShaderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ReactNativeFx")

    View(FxShaderView::class) {
      Prop("shader")          { view: FxShaderView, value: ShaderId            -> view.pending.shader = value }
      Prop("uniforms")        { view: FxShaderView, value: ShaderUniformRecord -> view.pending.uniforms = value }
      Prop("interactionMode") { view: FxShaderView, value: InteractionMode     -> view.pending.interactionMode = value }
      Prop("composition")     { view: FxShaderView, value: ShaderComposition   -> view.pending.composition = value }

      Events("onPress", "onPressIn", "onPressOut", "onLongPress")

      AsyncFunction("setHighlight") { view: FxShaderView, x: Double, y: Double ->
        view.setHighlight(x, y)
      }
      AsyncFunction("setPressed") { view: FxShaderView, pressed: Boolean ->
        view.setPressed(pressed)
      }
      AsyncFunction("setUniform") { view: FxShaderView, name: String, value: Double ->
        view.setUniform(name, value)
      }

      OnViewDidUpdateProps { view: FxShaderView -> view.applyResolvedConfig() }
    }
  }
}
```

### The DSL pieces (verified against current Expo docs)
- **`Prop(name, defaultValue?) { (view, value) -> }`** — a setter invoked on
  rerender when that prop changes. The optional `defaultValue` is applied when JS
  passes `null` (`Prop("background", UIColor.black) { … }`). Expo coerces the JS
  value to the declared native type — this is the type system that replaces
  hand-written Codegen. [module-api]
- **`OnViewDidUpdateProps { view -> }`** — "called when the view finished
  updating all props." It fires **once after the whole prop batch is applied**,
  and is the correct place to apply the already-resolved native config — individual
  `Prop` setters can arrive in arbitrary order and you must not apply the effect
  inside a single setter (you'd apply it N times per render, and before sibling
  props land). **Design rule for fx: `Prop` setters only stash raw values into a
  `pending` struct; `OnViewDidUpdateProps` does the actual effect apply.**
  [module-api]
- **`Events("onX", …)`** — declares the JS event names. Native fires them via an
  `EventDispatcher` property on the view whose name matches the event:
  - iOS: `let onPress = EventDispatcher()` on the view, then `onPress(["x": …])`.
  - Android: `val onPress by EventDispatcher()` on the view, then
    `onPress(mapOf("x" to …))`.
  Expo splits the JS props into RN `View` props (style, testID) and custom view
  props automatically; the wrapper component handles the plumbing. [module-api]
- **`AsyncFunction(name) { (view, …args) -> }`** — view `AsyncFunction`s
  "automatically receive an instance of the native view as the first argument,
  and execute on the UI thread by default," and are "added to the React ref of
  the component." This is exactly the imperative path for `controlled` mode
  (`ref.setHighlight(...)`, `ref.setPressed(...)`) — main-thread and
  ref-attached for free, no extra dispatch. [module-api]
- **`GroupView<T> { … }` (Android)** — opt-in custom child-view management. Lets
  the native view intercept where RN children are inserted/counted/fetched, so
  children land in a chosen container instead of directly on the root view:

  ```kotlin
  GroupView<ViewGroup> {
    AddChildView { parent, child, index -> parent.contentContainer.addView(child, index) }
    GetChildCount { parent -> parent.contentContainer.childCount }
    GetChildViewAt { parent, index -> parent.contentContainer.getChildAt(index) }
  }
  ```
  This is the Android mechanism for the "re-parent children into the effect's
  content container" requirement below. iOS has no `GroupView` equivalent in the
  DSL; you override UIKit/RN subview hooks on the `ExpoView` subclass instead
  (see below). [module-api]

### Enums / string unions across the boundary
`interactionMode`, `composition`, `shader`, and any other direct native string
props are JS string unions. To type them natively (instead of accepting a raw
`String` and re-validating), declare an enum that represents a primitive value
and conforms to **`Enumerable`** — Expo then coerces the JS string to the enum
case automatically and rejects unknown values at the boundary. [module-api]

```swift
// iOS
enum InteractionMode: String, Enumerable { case none, passive, active, controlled }
enum ShaderComposition: String, Enumerable { case shaderOnly, background, overlay }
```

```kotlin
// Android — Enumerable enum class carries an explicit String value
enum class InteractionMode(val value: String) : Enumerable { none("none"), passive("passive"), active("active"), controlled("controlled") }
enum class ShaderComposition(val value: String) : Enumerable { shaderOnly("shaderOnly"), background("background"), overlay("overlay") }
```

> Note: public shader preset ids are resolved in JS into shader id + uniform
> records before crossing the bridge (see `04-preset-system.md`). Native enums
> are still useful for direct mode-like props that cross as strings.

### Color prop coercion — built in (RESOLVED)
**Yes, color coercion is built in — accept `UIColor?` / `Int?`, don't hand-parse
strings.** Expo's built-in convertibles include `UIColor` "from hex strings like
`#RRGGBB` or CSS3 named colors," plus `CGFloat`, `URL`, `CGPoint`, `Data`,
records, and `Enumerable` enums. On Android the analogous coercion yields an
`Int` color (`@ColorInt`); declare the prop as `Int?` and let Expo convert.
So future color uniforms or tint-like props can cross as real `UIColor` / color
`Int`, and unset/`null` is the optional `nil`/`null`. [module-api]

### The native view base class — ShaderView composition
- **iOS V1**: subclass **`ExpoView`** and host a Metal rendering surface inside
  it. The concrete surface can be an `MTKView` child or a `CAMetalLayer` owned by
  the view; this doc only pins the Expo Modules view shell. `FxShaderView` owns
  shader selection, uniform storage, native frame scheduling, interaction, and
  lifecycle. RN children are **not** implicitly sampled by the shader. They
  compose in explicit modes:
  - shader-only: the Metal surface is the whole interactive view;
  - background: Metal surface behind RN children;
  - overlay: Metal surface above RN children with pass-through semantics.
- **Android**: V1 may ship a placeholder or later divergent backend. Do not let
  Android `RenderEffect`/AGSL decisions reshape the iOS Metal architecture.
- **Children**: default RN children should remain normal RN child views layered
  above or below the Metal surface. Re-parenting into a custom `contentContainer`
  is a composition choice, not a promise to content-sample the RN subtree.

→ **This `ExpoView` subclass is the V1 `ShaderView` base.** Make a thin
`FxShaderView` that owns Metal surface setup, child layering, native interaction,
uniform updates, and teardown. Glass/material views can be separate later; they
do not define the base.

#### `FxShaderView` — iOS shell (sketch)
```swift
import ExpoModulesCore
import MetalKit
import UIKit

open class FxShaderView: ExpoView {
  private let metalView = MTKView()
  private var renderer: FxMetalRenderer?
  var interactionMode: InteractionMode = .none

  struct Pending {
    var shader: ShaderId = .default
    var uniforms = ShaderUniformRecord()
    var interactionMode: InteractionMode = .active
    var composition: ShaderComposition = .shaderOnly
  }
  var pending = Pending()

  let onPress    = EventDispatcher()
  let onPressIn  = EventDispatcher()
  let onPressOut = EventDispatcher()
  let onLongPress = EventDispatcher()

  private var pressRecognizer: UILongPressGestureRecognizer?

  required public init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    metalView.frame = bounds
    metalView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    metalView.isPaused = false
    metalView.enableSetNeedsDisplay = false
    insertSubview(metalView, at: 0)
    renderer = FxMetalRenderer(view: metalView)
  }

  open override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    // interactionMode == none means visual/pass-through. passive keeps RN
    // children interactive but does not claim gestures.
    if interactionMode == .none { return nil }
    return super.hitTest(point, with: event)
  }

  open func applyResolvedConfig() {
    interactionMode = pending.interactionMode
    renderer?.setShader(pending.shader)
    renderer?.setUniforms(pending.uniforms)
    applyComposition(pending.composition)
    syncRecognizer(for: interactionMode)
  }

  private func applyComposition(_ composition: ShaderComposition) {
    // shaderOnly/background/overlay layering is native view setup, not JS magic.
    // The exact child insertion strategy is finalized with 09.
  }

  private func syncRecognizer(for mode: InteractionMode) {
    let wants = (mode == .active)
    if wants, pressRecognizer == nil {
      let r = UILongPressGestureRecognizer(target: self, action: #selector(onPressGesture(_:)))
      r.minimumPressDuration = 0          // press-in/out + location every callback (see 05)
      addGestureRecognizer(r)
      pressRecognizer = r
    } else if !wants, let r = pressRecognizer {
      r.view?.removeGestureRecognizer(r); pressRecognizer = nil
    }
  }

  @objc private func onPressGesture(_ g: UILongPressGestureRecognizer) { /* see 05 */ }

  override func layoutSubviews() {
    super.layoutSubviews()
    metalView.frame = bounds
  }

  func setUniform(_ name: String, value: Double) {
    renderer?.setUniform(name, value: value)
  }

  deinit {
    pressRecognizer.map { $0.view?.removeGestureRecognizer($0) }
    renderer?.tearDown()
  }
}
```

#### `FxShaderView` — Android placeholder shape
```kotlin
import android.content.Context
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

open class FxShaderView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  var interactionMode: InteractionMode = InteractionMode.none

  val onPress by EventDispatcher()
  val onPressIn by EventDispatcher()
  val onPressOut by EventDispatcher()
  val onLongPress by EventDispatcher()

  open fun applyResolvedConfig() {
    // Android backend is later/divergent. Keep the view shell and JS API shape,
    // but do not drive iOS Metal architecture from Android constraints.
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // clear backend resources when implemented
  }
}
```

### Two-phase prop rule — concrete example + WHY
Prop setters fire **per changed prop, in arbitrary order, possibly all in one
render batch**. If a setter applied the effect immediately it would (1) run N
times for an N-prop change, and (2) compute an effect from a half-updated state
(e.g. new `uniforms` set, but `interactionMode` still stale). `OnViewDidUpdateProps`
fires exactly once after the batch, so it sees a coherent snapshot. [module-api]

```swift
// iOS — phase 1: setters only stash
Prop("shader")          { (v: FxShaderView, val: ShaderId)            in v.pending.shader = val }
Prop("uniforms")        { (v: FxShaderView, val: ShaderUniformRecord) in v.pending.uniforms = val }
Prop("interactionMode") { (v: FxShaderView, val: InteractionMode)     in v.pending.interactionMode = val }
Prop("composition")     { (v: FxShaderView, val: ShaderComposition)   in v.pending.composition = val }

// phase 2: apply ONCE, from a fully-updated snapshot
OnViewDidUpdateProps { (v: FxShaderView) in
  // JS already resolved preset + overrides into pending uniforms (see 04).
  v.applyResolvedConfig()
}
```

This is also where the generic JS→native config convention lives. The actual
shader preset → uniform mapping is specified in `04-preset-system.md`.

### Threading guarantees
Prop setters, `OnViewDidUpdateProps`, and view `AsyncFunction`s all run on the
**main / UI thread** — view `AsyncFunction`s "execute on the UI thread by
default," and prop application happens on the UI thread during the mounting/
commit phase. This is correct for UIKit / Android `View` mutation and is exactly
why no extra `DispatchQueue.main` / `runOnUiThread` hop is needed when applying
effects. (Module-level — i.e. non-view — `AsyncFunction`s differ: those run off
the JS thread on a module queue. The view-context guarantee is the relevant one
here.) [module-api]

### Native registration names
Use one module namespace and one native view name:

- Module class: `FxShaderModule`
- Module JS name: `Name("ReactNativeFx")`
- Native view class/name: `FxShaderView`
- JS binding: `requireNativeView('ReactNativeFx', 'FxShaderView')`
- Autolinking class registration: `expo-module.config.json` points at
  `FxShaderModule` (iOS) / its Android package equivalent.

This matches Expo UI's real pattern: `Name("ExpoUI")`, `ExpoUIView(SliderView.self)`,
and `requireNativeView('ExpoUI', 'SliderView')`.

### JS binding — `requireNativeView` vs `requireNativeViewManager` (RESOLVED)
Both ship and both work; they are not equivalent layers:
- **`requireNativeViewManager('ReactNativeFx', 'FxShaderView')`** from
  **`expo-modules-core`** is the long-standing adapter — a drop-in replacement for RN's
  `requireNativeComponent` that splits props into RN `View` props vs. custom
  props (passed through `proxiedProperties`) and wraps the manager. The native
  view tutorial still uses it. [native-view-tutorial], [module-api]
- **`requireNativeView('ReactNativeFx', 'FxShaderView')`** is the newer, leaner helper. It was
  **re-exported from `expo-modules-core` (and the `expo` package) in SDK 52**
  and is the current recommendation going forward. [expo-changelog]

**Decision for fx: use `requireNativeView`.** It has existed since SDK 52, and
fx's product floor is higher: **SDK 56 / RN 0.85** (pinned in
`07-config-plugin-and-install.md`). Fall back to `requireNativeViewManager` only
if the product floor ever drops below SDK 52.

```tsx
// ShaderView.tsx — typed public wrapper
import * as React from 'react';
import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';
export type ShaderComposition = 'shaderOnly' | 'background' | 'overlay';
export type ShaderId = 'aurora' | 'ripple' | 'spotlight';
export type ShaderUniforms = Record<string, number | readonly [number, number] | readonly [number, number, number, number]>;

type PressEvent = { nativeEvent: { x: number; y: number } };

type NativeShaderProps = ViewProps & {
  shader?: ShaderId;
  uniforms?: ShaderUniforms;      // JS-resolved preset uniforms (see 04)
  interactionMode?: InteractionMode;
  composition?: ShaderComposition;
  onPress?: (e: PressEvent) => void;
  onPressIn?: (e: PressEvent) => void;
  onPressOut?: (e: PressEvent) => void;
  onLongPress?: (e: PressEvent) => void;
};

// Imperative handle for `controlled` mode (mirrors the view AsyncFunctions).
export type ShaderViewRef = {
  setHighlight: (x: number, y: number) => void;
  setPressed: (pressed: boolean) => void;
  setUniform: (name: string, value: number) => void;
};

const NativeShader =
  requireNativeView<NativeShaderProps & { ref?: React.Ref<ShaderViewRef> }>(
    'ReactNativeFx',
    'FxShaderView'
  );

export type ShaderViewProps = NativeShaderProps & {
  children?: React.ReactNode;
};

export const ShaderView = React.forwardRef<ShaderViewRef, ShaderViewProps>(
  function ShaderView(props, ref) {
    const { shader = 'aurora', uniforms, ...rest } = props;
    const resolvedUniforms = resolveShaderUniforms(shader, uniforms);
    // AsyncFunctions are attached to the native ref → forward it straight through.
    return <NativeShader {...rest} shader={shader} uniforms={resolvedUniforms} ref={ref} />;
  }
);
```

Imperative calls then flow ref → native `AsyncFunction` on the UI thread:

```tsx
const ref = React.useRef<ShaderViewRef>(null);
ref.current?.setHighlight(x, y);   // → AsyncFunction("setHighlight"), UI thread
ref.current?.setUniform('intensity', 0.8);
```

### Fabric view-flattening / `collapsable` (RESOLVED)
View flattening only collapses **layout-only** nodes — nodes that "only impact
the layout" and render nothing native. A view registered through Expo's
`View(...)` is backed by a real native view (`ExpoView`) with its own props,
events, and effect surface, so it is **not** layout-only and Fabric does **not**
flatten it. Therefore `collapsable={false}` is **not required** on the
`ShaderView` wrapper itself. [view-flattening], [module-api]

Caveat to carry into `06-lifecycle-and-teardown.md`: flattening can still bite a
**plain RN `<View>` wrapper we put around or between** fx views (e.g. a layout-only
container the developer wraps the ShaderView in). If a gesture or measurement ever
depends on such a wrapper being a real host view, that specific wrapper needs
`collapsable={false}` — but the fx native view does not. [view-flattening]

### Versions / New Arch
Expo Modules **support the New Architecture and are automatically backwards
compatible with the old architecture**, but fx targets **Fabric from day one**.
With the SDK 56 floor in `07`, the product target is New-Arch-only in practice.
`requireNativeView` pins a practical floor of **Expo SDK 52** (where it was
re-exported). Exact SDK/RN floor → pinned in
`07-config-plugin-and-install.md`. [expo-changelog], [overview]

## Decisions
1. **V1 native view = `FxShaderView`** subclassing `ExpoView` on iOS, hosting a
   Metal surface (`MTKView` or `CAMetalLayer`) and owning native interaction,
   uniforms, frame scheduling, and teardown.
2. **Composition is explicit.** RN children layer around the Metal surface
   (background / overlay / shader-only). V1 does not promise live RN subtree
   content-sampling while preserving child touch.
3. **Two-phase prop handling**: JS resolves shader preset + overrides into one
   flat `uniforms` Record (`04`). Native `Prop` setters only **stash** raw values
   into a `pending` struct; **`OnViewDidUpdateProps` applies shader/uniform state
   once** per batch (coherent snapshot, single native mutation).
4. **Coerce at the boundary, don't hand-parse.** Direct native string unions
   (`shader`, `interactionMode`, `composition`) → `Enumerable` enums mirroring
   the TS unions. Uniforms cross as a typed Record and native defensively
   defaults missing values.
5. **`AsyncFunction` is the v1 imperative channel** for `controlled` mode
   (`setHighlight`, `setPressed`, `setUniform`); it's main-thread and
   ref-attached for free.
   The public wrapper `forwardRef`s straight to the native ref.
6. **JS binding via `requireNativeView('ReactNativeFx', 'FxShaderView')` from
   `expo`** (SDK 52+); the typed wrapper maps public props → native prop names
   and forwards the ref.
7. **Events are semantic only** (`onPress*`/`onLongPress`) — never per-pointer
   (see `05-gestures-and-interaction.md`).
8. **No `collapsable={false}` on the fx native view** (it is never layout-only);
   only revisit for a developer's plain-`<View>` wrapper if a gesture/measure
   depends on it — tracked in `06-lifecycle-and-teardown.md`.

## Open questions
- Confirm whether `MTKView` child insertion or `CAMetalLayer` ownership is the
  better ExpoView implementation path for layout, transparency, and RN children
  layering.
- Confirm the exact composition API naming in `09`: keep
  `composition="shaderOnly" | "background" | "overlay"` on `ShaderView`, or add
  convenience wrappers on top.
- Confirm that native press/long-press cancellation works when `ShaderView` is
  inside ScrollView, pager, and bottom sheet.

## Prototype acceptance criteria
- A scaffolded `FxShaderView` renders a nonblank Metal shader in the SDK-56
  example app on iOS with New Architecture enabled.
- JS resolves `shader + uniforms` into one native `uniforms` Record; native
  applies it once in `OnViewDidUpdateProps`.
- Native frame scheduling updates time-based uniforms without JS-per-frame work.
- RN children compose correctly in background/overlay/shader-only modes.
- `Events("onPress", "onPressIn", "onPressOut", "onLongPress")` fire semantic
  JS events, and no per-pointer movement crosses the bridge.
- `ref.setHighlight(...)`, `ref.setPressed(...)`, and `ref.setUniform(...)`
  reach view `AsyncFunction`s on the UI thread.
- The fx native view is not flattened by Fabric; only plain RN wrapper views
  require `collapsable={false}` when measurement/gesture behavior depends on
  their host node.
- `interactionMode="none"` passes through the whole fx surface;
  `interactionMode="passive"` preserves child interaction without fx claiming
  gestures.

## Sources
- Expo Modules API — module/view DSL (`View`, `Prop` + `defaultValue` + type
  coercion incl. `UIColor` from hex/CSS, `Events`/`EventDispatcher`,
  `AsyncFunction` on UI thread + React ref, `OnViewDidUpdateProps`, `GroupView`,
  `Enumerable` enums, `ExpoView` extends `RCTView`):
  https://docs.expo.dev/modules/module-api/
- Tutorial: Create a native view (ExpoView subclassing, JS binding,
  `layoutSubviews`/`LayoutParams`): https://docs.expo.dev/modules/native-view-tutorial/
- Expo Modules API: Overview (New Arch support, backwards compatibility):
  https://docs.expo.dev/modules/overview/
- React Native — View Flattening (only layout-only nodes collapse;
  `collapsable={false}`): https://reactnative.dev/architecture/view-flattening
- `requireNativeView` re-exported from `expo-modules-core`/`expo` in SDK 52:
  https://expo.dev/changelog/2024-11-12-sdk-52
- Verified mature package naming pattern — local
  `/Users/duyanhv/works/expo/packages/expo-ui`: `Name("ExpoUI")`,
  `ExpoUIView(SliderView.self)`, and
  `requireNativeView('ExpoUI', 'SliderView')`.
