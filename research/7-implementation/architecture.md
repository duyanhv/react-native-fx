# System Architecture

*Scope: target folder structure, the overall orchestrator (`FxNativeView`), the runtime object model, two execution paths, and platform-specific realization. Read `blueprint.md` first — that is the build-ordered sequence; this is how the pieces connect.*

> **Breadcrumb conventions:** `[ref: <repo>/<path>:<line>]` = battle-tested precedent in a cloned reference repo at `../references/`. `[research: <doc-id> §<section>]` = research doc owned by fx. `[finding]` = conclusion derived from cross-referencing research + reference code.

---

## 0. Reference Origins (Breadcrumb Index)

Every architectural decision in this doc traces to one of these sources.

| Repo | Path in `references/` | Key Files |
|------|----------------------|-----------|
| **expo-modules-core** | `expo/packages/expo-modules-core/` | `ios/Core/Views/ExpoFabricView.swift`, `ios/Core/Views/ExpoView.swift`, `ios/Fabric/ExpoFabricViewObjC.mm`, `ios/Core/Events/EventDispatcher.swift`, `ios/Core/SharedObjects/SharedObject.swift`, `ios/Core/Views/SwiftUI/SwiftUIHostingView.swift`, `ios/Core/Modules/ModuleDefinition.swift`, `ios/Core/Functions/AsyncFunctionDefinition.swift`, `src` (TS) |
| **react-native (Fabric)** | `react-native/packages/react-native/ReactCommon/react/renderer/` | `core/ShadowNodeFamily.h`, `core/ShadowNode.h`, `core/ShadowNode.cpp`, `mounting/ShadowTree.cpp`, `mounting/ShadowViewMutation.h`, `mounting/ShadowView.cpp`, `mounting/Differentiator.cpp`, `components/view/ViewShadowNode.cpp`, `layout/LayoutableShadowNode.cpp`, `mounting/MountingOverrideDelegate.h` |
| **gesture-handler** | `gesture-handler/packages/react-native-gesture-handler/` | `apple/RNGestureHandlerState.h`, `apple/RNGestureHandler.mm`, `apple/Handlers/RNManualHandler.m`, `android/src/main/java/com/swmansion/gesturehandler/core/GestureHandler.kt`, `android/src/main/java/com/swmansion/gesturehandler/core/GestureHandlerOrchestrator.kt`, `android/src/main/java/com/swmansion/gesturehandler/core/PanGestureHandler.kt` |
| **reanimated** | `reanimated/packages/react-native-reanimated/` | `Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp`, `Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.h`, `src/layoutReanimation/animationsManager.ts` |
| **nitro** | `nitro/packages/react-native-nitro-modules/` | `cpp/core/HybridObject.hpp`, `cpp/core/HybridObject.cpp`, `cpp/views/HybridView.hpp`, `ios/core/HybridView.swift`, `android/src/main/java/com/margelo/nitro/core/HybridView.kt` |

---

## 1. Target Folder Structure

```
packages/
├── src/                          ← JS SURFACE (mirror of research planes)
│   ├── manifest/                 ← dependency SINK (imports nothing from other src/)
│   │   ├── index.ts                the manifest barrel [research: G1]
│   │   ├── select.ts               the adapter dispatch [research: G2]
│   │   └── types.ts                shared IR types [research: 02]
│   │
│   ├── surface/                  ← PUBLIC COMPONENTS
│   │   ├── FxPresence.tsx          [research: 54]
│   │   ├── FxView.tsx              [research: 57]
│   │   ├── FxPressable.tsx         [research: 57]
│   │   ├── Fx.tsx                  [research: 55] (single-or-stack)
│   │   ├── FxGroup.tsx             [research: 57]
│   │   ├── FxItem.tsx              [research: 57]
│   │   └── types.ts
│   │
│   ├── effects/                  ← EFFECT SEMANTICS + IDs
│   │   ├── catalog.ts              shader/fill/material/filter/symbol ids [research: 20-24]
│   │   └── types.ts
│   │
│   ├── motion/                   ← MOTION VOCABULARY
│   │   ├── MotionSpec.ts           fx.motion.* builders [research: 41]
│   │   └── types.ts
│   │
│   ├── presets/                  ← PRESET RESOLUTION
│   │   ├── defaults.ts             per-platform shape+timing catalog [research: G4/M3]
│   │   ├── palettes.ts             [research: 50]
│   │   └── themes.ts               [research: 50]
│   │
│   ├── runtime/                  ← JS BINDINGS (thin glue) — one per registered native view
│   │   ├── FxHostedView.tsx        default requireNativeView wrapper
│   │   ├── FxSurfaceView.tsx       named requireNativeView wrapper (presence/state/press route here)
│   │   └── FxGroupView.tsx         named requireNativeView wrapper
│   │
│   └── index.ts                  ← PUBLIC API (root export) [research: 52 §Public exports]
│
├── ios/                          ← iOS NATIVE
│   ├── FxModule.swift              Expo Module [finding: multiple views, first=default]
│   ├── FxNativeView.swift          ABSTRACT BASE (diff-based props, AsyncFunction surface, lifecycle)
│   ├── FxHostedView.swift          FxEffectRenderer (hosted, decorative)
│   ├── FxSurfaceView.swift         FxEffectRenderer (expo-view, interactive) + content motion wrapper
│   ├── FxGroupView.swift           morph compound [research: 21/57]
│   ├── FxLayoutObserver.swift      post-layout frame reads [research: 33]
│   ├── FxAnimationDriver.swift     native spring animator [research: 34]
│   ├── FxPresenceCoordinator.swift presence FSM [research: 35]
│   ├── FxPressHandler.swift        press handler (6-state FSM) [finding: gesture-handler borrow]
│   ├── Shaders/
│   │   └── FxShaders.metal         curated .metal shaders [research: 22]
│   └── ReactNativeFx.podspec
│
├── android/                      ← ANDROID NATIVE
│   ├── FxModule.kt                 Expo Module [finding: multiple views, first=default]
│   ├── FxNativeView.kt             ABSTRACT BASE
│   ├── FxHostedView.kt             FxEffectRenderer (hosted, decorative)
│   ├── FxSurfaceView.kt            FxEffectRenderer (expo-view, interactive) + content motion wrapper
│   ├── FxGroupView.kt              morph compound
│   ├── FxLayoutObserver.kt         post-layout frame reads
│   ├── FxAnimationDriver.kt        native spring animator
│   ├── FxPresenceCoordinator.kt    presence FSM
│   ├── FxPressHandler.kt           press handler (6-state FSM) [finding: gesture-handler borrow]
│   └── assets/
│       └── shaders/
│           └── *.agsl              curated AGSL shaders [research: 22]
│
└── expo-module.config.json       ← autolinking: platforms + module classes
```

---

## 2. The Expo Modules Boundary: `FxNativeView`

`FxNativeView` is the **shared abstract base / pattern** — not a single switch-style orchestrator. It extends `ExpoFabricView` and provides the common boundary (diff-based props, the `AsyncFunction` surface, lifecycle). The `EventDispatcher` *properties* live on each concrete view, not the base — Expo binds events by reflecting only the concrete type's own stored properties (`Mirror`), so a dispatcher declared on the base never wires. Concrete registered classes are **substrate-specific** (`FxHostedView` / `FxSurfaceView`, blueprint Unit 1). The routing by `node.kind` happens in the JS adapter (`select()`), not in the native view — each component maps to a specific concrete view class.

> **[research: 51 §Two phases, two substrates, lines 38-44]** "FxNativeView is the shared abstract base / pattern; the concrete registered classes are substrate-specific (FxHostedView / FxSurfaceView, blueprint Unit 1)."
> **[research: 51 §Decisions #5]** "likely several native view classes — substrate-specific (hosted vs expo-view, blueprint Unit 1), not a single FxView switching on node."

### Concrete View Classes

| View Class | Substrate | Purpose | Extends |
|------------|-----------|---------|---------|
| **`FxHostedView`** | `hosted` | Decorative effects (SwiftUI/Compose host) | `FxNativeView` |
| **`FxSurfaceView`** | `expo-view` | Interactive shaders + content motion wrapper | `FxNativeView` |
| **`FxGroupView`** | `hosted` | Morph compound (glass) | `FxNativeView` |

All three share the `FxNativeView` base: two-phase props, lifecycle, and the `AsyncFunction` surface. Each concrete view declares its **own** `EventDispatcher` properties — Expo's event binding reflects only the concrete type, never the base. The adapter (JS side) dispatches to the correct concrete class based on `select()` output.

> **[finding] `ExpoView` is a typealias for `ExpoFabricView`**
> `ExpoFabricView` extends `RCTViewComponentView` (Fabric's native view base).
> `shouldBeRecycled()` = `false` — Expo disables recycling; every view gets a fresh instance.
> [ref: expo/ios/Core/Views/ExpoView.swift:1] [ref: expo/ios/Fabric/ExpoFabricView.swift:167] [ref: expo/ios/Fabric/ExpoFabricViewObjC.mm:118]

### How a Component Maps to a Native View

```
JS Component           →  requireNativeView           →  Concrete View
────────────              ─────────────────              ──────────────
<Fx effect="...">     →  'ReactNativeFx'                                  →  FxHostedView (decorative)
<Fx interactionMode>  →  'ReactNativeFx', 'FxSurfaceView' →  FxSurfaceView (interactive)
<FxPresence>          →  'ReactNativeFx', 'FxSurfaceView' →  FxSurfaceView (content motion)
<FxView>              →  'ReactNativeFx', 'FxSurfaceView' →  FxSurfaceView (content motion)
<FxPressable>         →  'ReactNativeFx', 'FxSurfaceView' →  FxSurfaceView (press)
<FxGroup>             →  'ReactNativeFx', 'FxGroupView'   →  FxGroupView (morph compound)
```

### The Two Execution Paths (mounted inside concrete views)

```
┌──────────────────────────────────────────────────────────┐
│  FxNativeView (abstract base)                            │
│  ─────────────────────────────                           │
│  • ExpoFabricView subclass                               │
│  • Diff-based props (§2.1)                               │
│  • EventDispatcher / AsyncFunction                       │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────────────┐ │
│  │ FxHostedView       │  │ FxSurfaceView              │ │
│  │ ────────────       │  │ ─────────────              │ │
│  │ (decorative)       │  │ (interactive + content)    │ │
│  │                    │  │                            │ │
│  │ FxEffectRenderer   │  │ FxEffectRenderer           │ │
│  │   │                │  │   │                        │ │
│  │   └─ hosted        │  │   └─ expo-view             │ │
│  │      (SwiftUI/     │  │      (MTKView/RenderEffect)│ │
│  │       Compose)     │  │                            │ │
│  │                    │  │ FxPresenceCoordinator      │ │
│  │                    │  │   └─ FxAnimationDriver     │ │
│  │                    │  │       └─ FxLayoutObserver  │ │
│  │                    │  │                            │ │
│  │                    │  │ FxPressHandler             │ │
│  └────────────────────┘  └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Props Mechanism: Diff-Gated Setters, Stashed Pending, Batch Apply

> **[research: 51 §The View DSL]** "Prop(name) — a setter; Expo coerces JS → native type. Setters only stash into a pending struct. OnViewDidUpdateProps fires once after the whole prop batch; the place to apply the resolved config (the two-phase rule — apply once from a coherent snapshot, never per-setter)."
>
> **[finding] Expo's `ExpoFabricView.updateProps` does per-prop equality checking via `previousProps` dictionary. Only changed props trigger `prop.set(value:onView:appContext:)`. This is the diff-gate: unchanged props don't reach the setter at all.**
> [ref: expo/ios/Fabric/ExpoFabricViewObjC.mm:118-135] [ref: expo/ios/Fabric/ExpoFabricView.swift:84-112]

**The reconciliation — three layers of the mechanism:**

1. **Expo's `updateProps` diff-gates each setter** — per-prop equality check (`areValuesEqual(previousValue, convertedNewValue)`). Unchanged props are skipped entirely.
2. **Changed props reach the setter, which stashes** — the `Prop` closure stashes the value into a view-level pending struct. Never applies per-setter.
3. **`OnViewDidUpdateProps` applies once** — fires after the whole prop batch. Reads the coherent pending snapshot. Resolves config, warms pipeline caches, starts/retargets animations.

```
Fabric delivers props → ExpoFabricViewObjC.finalizeUpdates()
  → ExpoFabricView.updateProps(propsDict)
      for each (key, prop):
        if newValue != previousValue:    ← 1. Expo diff-gates (previousProps[key])
          prop.set(value, onView)        ← 2. Setter stashes into pending struct
            view.pendingShader = value   ←    (never applies here)
      viewDidUpdateProps()               ← 3. Batch commit — apply once from pending
        view.applyResolvedConfig()       ←    read pending struct, resolve, start/retarget
```

**fx adoption:**
- Each `Prop` setter in the `View {}` DSL fires only when the value changed from the previous render (Expo's diff-gate).
- The setter stashes into a view-level pending struct (the two-phase rule from 51:24-28).
- `OnViewDidUpdateProps` applies the resolved config once from the coherent pending snapshot — the batch commit point.

### 2.2 Module Registration: One Module, Multiple Views

> **[finding] The first `View {}` registered in a `ModuleDefinition` is the "default" view. Additional views get the prefix `ModuleName_ViewName`. `ModuleDefinition.swift` builds `viewsDict` with `DEFAULT_MODULE_VIEW` key for the first view. `AppContext.registerNativeViews()` creates `ViewModuleWrapper` per view, registering via `ExpoFabricView.registerComponent()`.**
> [ref: expo/ios/Core/Modules/ModuleDefinition.swift:viewsDict, DEFAULT_MODULE_VIEW]

```swift
public class FxModule: Module {
  public func definition() -> ModuleDefinition {
    ModuleDefinition {
      Name("ReactNativeFx")

      View(FxHostedView.self) { ... }       // DEFAULT_MODULE_VIEW → "ReactNativeFx"
      View(FxSurfaceView.self) { ... }      // "ReactNativeFx_FxSurfaceView"
      View(FxGroupView.self) { ... }        // "ReactNativeFx_FxGroupView"
    }
  }
}
```

JS binding:
```ts
const FxHostedView  = requireNativeView('ReactNativeFx');                  // default (decorative)
const FxSurfaceView = requireNativeView('ReactNativeFx', 'FxSurfaceView');  // interactive + content motion
const FxGroupView   = requireNativeView('ReactNativeFx', 'FxGroupView');    // morph compound
```

### 2.3 Events + AsyncFunctions

> **[research: 51 §The boundary, in one rule]** Events (push) + AsyncFunctions (pull). No per-frame JS.
> **[finding] `EventDispatcher` is a callable object. `installEventDispatchers()` uses `Mirror` reflection on the view to find `EventDispatcher` properties and wires them to Fabric's event emitter. `normalizeEventName` strips "on" prefix and lowercases first letter. `Mirror(reflecting: view).children` reflects only the concrete type's own stored properties — never a superclass's — and the Obj-C `responds(to:)` fallback does not apply to Swift `EventDispatcher` properties. So every `EventDispatcher` must be declared on the concrete registered view; one on the shared base is invisible to `installEventDispatcher` and silently never wires.**
> [ref: expo/ios/Core/Events/EventDispatcher.swift:67-79] [ref: expo/ios/Fabric/ExpoFabricView.swift:installEventDispatchers]
> **[finding] View-scoped `AsyncFunction`s auto-get main queue + owner (`takesOwner=true`). `AsyncFunctionDefinition.swift` wraps a sync closure; `ConcurrentFunctionDefinition.swift` uses Swift concurrency.**
> [ref: expo/ios/Core/Functions/AsyncFunctionDefinition.swift]

**Events → JS** (discrete only, never per-frame):
- `onTransitionEnd({ phase })` — presence lifecycle [research: 35]
- `onStateChange({ state })` — FxView state transitions [research: 40]
- `onPressIn/onPressOut/onPress` — interaction events (active mode) [research: 30]
- `onLoad/onError` — BYO shader compilation result [research: 22]

Native registered event names are **prefixed** to dodge React Native's reserved event props —
press events as `onShader*` (on `FxSurfaceView`), lifecycle/load as `onFx*` (every view). The
JS surface components own the remap to the public names above. The **canonical native↔public
mapping table is `40` §Native ↔ public event-name mapping** — the single home; this list does
not restate it.

**AsyncFunctions** (imperative, UI-thread, ref-attached):
- `setUniform({ key, value })` — controlled mode [research: 30]
- `snapshot()` → `{ x, y, width, height, phase }` — on-demand frame read [research: 35]

---

## 3. Runtime Object Model

From `research: 36`, the orchestrator owns or delegates to six stable native objects. Only objects JS holds a reference to use Expo `SharedObject`; internal objects are plain native classes.

> **[finding] `SharedObject` is for native objects that need a JS counterpart — bidirectional native↔JS mapping, GC-aware lifecycle (weak JS refs, `sharedObjectWillRelease` hooks), `emit(event:payload:)`. Internal objects (driver, coordinator, observer, recognizer) are plain Swift/Kotlin classes. They don't cross the JS boundary, so no `SharedObject` overhead.**
> [ref: expo/ios/Core/SharedObjects/SharedObject.swift]

| Object | Owns | Reads | Emits | JS-Facing? |
|--------|------|-------|-------|------------|
| **`FxNativeView`** | Expo Modules boundary, diff-based props, shared lifecycle and ref surface | resolved props from `updateProps` | — (concrete views declare `EventDispatcher`) | View (Fabric identity) |
| **`FxEffectRenderer`** | effect layers, GPU surface (interactive); hosted SwiftUI/Compose or expo-view MTKView/RenderEffect | effect config, pointer uniforms (interactive) | `onLoad`, `onError`, `onPress*` | No (internal; events through view) |
| **`FxPresenceCoordinator`** | lifecycle FSM (visible → entering → holding → exiting → done), deferred-unmount handshake | `visible` target | `onTransitionEnd({ phase })` via EventDispatcher | No (internal) |
| **`FxAnimationDriver`** | interruptible native animation (spring/timing); content family (CASpringAnimation/SpringAnimation) and effect family (SwiftUI .animation/Compose animate*AsState) | targets, measurements from `FxLayoutObserver` | `onTransitionEnd` (completion) via coordinator | No (internal) |
| **`FxLayoutObserver`** | post-layout reads of wrapper (size, origin, travel, insets) | Yoga/Fabric frame from `layoutMetrics` | — (passive, read on demand by driver) | No (internal) |
| **`FxPressHandler`** | 6-state FSM (press recognizer), cooperative slop-yield, coalescing keys | touch location → `pressDepth`/`pointerX`/`pointerY` | `onPress*` via EventDispatcher | No (internal) |

### 3.1 Wiring Rules (one-way, per `04`)

```
Boundary routes → Coordinator orchestrates → Driver executes → Observer reads → Renderer draws
Events flow back UP through the boundary only.
[research: 36 §The wiring rules]
```

- **Read layout, never write it** — `FxLayoutObserver` reads Yoga's frame; fx animates transform above it [research: 04]
- **Native owns frames** — `FxAnimationDriver` runs on the platform clock; JS sets discrete targets [research: 34]
- **JS sees events/snapshots only** — never a frame stream [research: 35 §What JS may observe]
- **Identity is stable** — no view recycling (`shouldBeRecycled() = false`) [ref: expo/ios/Fabric/ExpoFabricView.swift:167] + `ShadowNodeFamily` carries immutable `Tag` across re-renders [ref: react-native/.../renderer/core/ShadowNodeFamily.h]

---

## 4. Path 1: Effect (Decorative or Interactive Shader)

```
JSX: <Fx effect="edge-glow" interactionMode="active" />
       │
       ▼
src/runtime/FxHostedView.tsx / FxSurfaceView.tsx
  → requireNativeView('ReactNativeFx')   // default view (decorative); or FxSurfaceView for interactive
       │
       ▼
ios/FxHostedView.swift (extends FxNativeView) — decorative; or FxSurfaceView for interactive
       │
       ├── hosted path (decorative):
       │   • SwiftUI host + .colorEffect + TimelineView
       │   • clock: TimelineView(.animation) / withFrameNanos
       │   • uniforms: FxUniforms { time, resolution, intensity }
       │   [research: structure.ios §shader] [research: structure.android §shader]
       │
       └── expo-view path (interactive):
           • MTKView + CADisplayLink render loop
           • + FxPressHandler → feeds pressDepth/pointerX/Y natively
           • clock: CADisplayLink / Choreographer
           • events: onPress*, onLoad, onError
           [research: 22 §Lowering, interactive] [research: 30] [research: 31]

Data flow: props → native; uniforms written per frame by native; zero JS in frame loop.
[research: 40 §Regime A — fully native]
```

### 4.1 Effect Substrate Selection

> **[research: 02 §The selection rule]** `select(node, platform, ctx)` walks the fallback ladder top-to-bottom. `ctx.wantInteractive` derived from `interactionMode`.

| Condition | Substrate | Renderer |
|-----------|-----------|----------|
| `interactionMode='none'`, decorative | `hosted` | SwiftUI/Compose `.colorEffect` / `TimelineView` |
| `interactionMode='active'|'passive'` | `expo-view` | `MTKView` + `CADisplayLink` / `RenderEffect` + `Choreographer` |
| `interactionMode='controlled'` | `expo-view` | same GPU surface; `setUniform` writes from JS |

---

## 5. Path 2: Content Motion (Presence / State Transitions)

```
JSX: <FxPresence visible={open} preset="transient">
       <FxView state={selected ? 'selected' : 'idle'} preset="lift">
         {children}
       </FxView>
     </FxPresence>
       │
       ▼
src/runtime/FxSurfaceView.tsx
  → requireNativeView('ReactNativeFx', 'FxSurfaceView')  // content motion wrapper
       │
       ▼
ios/FxSurfaceView.swift (extends FxNativeView) — content motion wrapper
       │
        ├── FxPresenceCoordinator
        │   │ owns: lifecycle FSM [research: 35 §The handshake]
        │   │ reads: visible → retargets animation driver
        │   │         visible=false → plays exit → onTransitionEnd → JS releases child
        │   │ re-toggle retargets, doesn't restart [research: 42 §The envelope]
        │   └── drives ──▶ FxAnimationDriver
       │
       ├── FxAnimationDriver
       │   │ owns: CASpringAnimation on wrapper CALayer [research: 34]
       │   │ reads: targets (translateX/Y, scale, rotate, opacity)
       │   │ reads: FxLayoutObserver for travel/origin
       │   │ emits: onTransitionEnd (completion event)
       │   │ rule: interruptible retargeting, no snap
       │   │ default spring: platform's own (the law) [research: 41]
       │   │ tune: adjusts within platform family (speed/emphasis/distance) — deferred from V1, DOC-019 [research: 41]
       │   └── feeds ──▶ FxLayoutObserver
       │
       ├── FxLayoutObserver
       │   │ owns: post-layout frame reads (size, origin, travel distance)
       │   │ reads: Yoga/Fabric frame of the managed wrapper
       │   │ rule: reads layout, NEVER writes it [research: 04] [research: 33]
       │   │ [finding] layout resolved BEFORE mounting
       │   │   [ref: react-native/.../renderer/mounting/ShadowTree.cpp:417]
       │   └── feeds ──▶ FxAnimationDriver (travel/origin for edge motion)
       │
        └── intermediate container (inside FxSurfaceView)
            │ owns: the native view fx transforms
            │ [finding] The intermediate container — a native view inside FxSurfaceView
            │   that Fabric does not track, so Fabric cannot clobber its transform/opacity.
            │   FxSurfaceView overrides mountChildComponentView to route children into
            │   this container. See §5.1 for full rationale.
            │ rule: touch survives (transform-only, no snapshot) [research: 33]
            │ rule: children ride along (one container, no per-child motion)
            └── mounted: FxAnimationDriver animates this container

Data flow: visible/state → native; native runs envelope; onTransitionEnd → JS.
[research: 40 §Regime B — low-frequency JS]
```

### 5.1 The Wrapper-Transform Model (Fabric Clobber Mitigation)

> **[research: 33 §Findings lines 33-38, 54-61]** "fx wraps children in one managed host view it owns (the Expo module's own native view) and animates that container's transform/opacity. The RN content mounts as a child subview and rides along. fx animates an fx-owned intermediate layer/container that Fabric does not track — created inside the FxNativeView, wrapping the children — not the tracked view's transform prop."
>
> **[finding] Fabric re-applies `transform`/`opacity` on every commit via `Update` mutations. The `ShadowView` snapshot includes `props` (which contains `transform` and `opacity`). The Differentiator generates `UpdateMutation` when props change, and the platform layer applies these as authoritative values. Direct `CALayer.transform` manipulation on a Fabric-tracked view gets clobbered.**
> [ref: react-native/.../renderer/mounting/ShadowView.cpp:23-32] [ref: react-native/.../renderer/components/view/BaseViewProps.h:46,94] [ref: react-native/.../renderer/mounting/Differentiator.cpp:946-951]

**The mechanic:** fx does NOT animate the Fabric-tracked `FxSurfaceView` directly (it would be clobbered). Instead, `FxSurfaceView` creates a **Fabric-invisible intermediate container** — a `UIView` on iOS / a `View` on Android that Fabric does not track, so Fabric cannot clobber its `transform`/`opacity`. `FxSurfaceView` overrides `mountChildComponentView` to route RN children into this intermediate container; the children ride along as the container animates. The animator targets the intermediate container, not the outer `FxSurfaceView`.

```
FxSurfaceView (extends FxNativeView → ExpoView → RCTViewComponentView)
  │
  │  Fabric tracks: Tag, layoutMetrics.frame — NOT the intermediate container
  │
  ├── intermediate container (UIView / View)  ← fx animates THIS
  │     │  Fabric does NOT track; commits don't clobber it
  │     │  [research: 33] "intermediate container that Fabric does not track"
  │     │  CASpringAnimation / SpringAnimation targets this container
  │     │
  │     └── children are subviews of this container
  │
  └── children are routed here via mountChildComponentView override
        [finding] mounted via mountChildComponentView
        [ref: expo/ios/Fabric/ExpoFabricViewObjC.mm]
        Children ride along because the container is their direct parent
```

> **[finding] The `MountingOverrideDelegate` (Reanimated's approach) is NOT needed for this model. fx owns the intermediate container — Fabric doesn't know about it, so commits don't clobber it. The `MountingOverrideDelegate` is needed only to intercept Fabric mutations on views fx does NOT own (the Reanimated case). For fx's owned intermediate container, this approach is simpler and sufficient.**
> [ref: reanimated/.../LayoutAnimationsProxy_Experimental.cpp:pullTransaction]
> [ref: react-native/.../renderer/mounting/MountingOverrideDelegate.h]

### 5.1.1 Hit-Testing Under Transform — A Platform Caveat, Not a Bug

> **[research: 34 §Findings lines 42-58]** "iOS hit-tests against the model layer (the property's target value), not the presentation layer (where it visually is during the animation). So at rest, touch is exactly right; during an enter/exit the element is tappable at its target position, not its on-screen position. For short presence transitions this is fine — often desirable, since the element is 'really' already at its destination. A documented caveat, not a bug. Android property animators update the real view properties each frame, so touch tracks the visual position throughout."
>
> **[research: 33 lines 24-25]** "touch survives at rest (mid-flight behavior follows 34's iOS/Android caveat)."

**The contract:** **guarantee correct touch at rest; do not promise pixel-aligned touch on an in-flight element.** (34:58)

| Platform | At Rest | Mid-Flight | Mechanism |
|----------|---------|-----------|-----------|
| **iOS** | ✅ Correct | Tappable at **target** position (not on-screen position) | Hit-tests model layer (`CALayer.model`) |
| **Android** | ✅ Correct | Tappable at **visual** position (tracks on-screen position) | Property animators update real view per frame |

**fx does NOT override `hitTest` to correct iOS mid-flight behavior** — that would require keeping the model layer in sync with the presentation layer every frame, which is the model for regime-C continuous gesture-tracked motion (out of scope). For short presence transitions (<300ms), the model-layer tappable-at-destination behavior is desirable — the element is "really" already at its target position.

**Future path:** a `hitTest` override against the presentation layer (`CALayer.presentation()` on iOS) is feasible and will compose with the shaped/SDF pass-through override planned for U8. If mid-transition interaction proves to matter, it is deferred to the interaction work (U6/U8). For now, the model-layer caveat is acceptable.

**At rest** (no animation running), the model and presentation layers coincide, and hit-testing is correct on both platforms without any override.

### 5.2 Deferred-Unmount Handshake

> **[research: 35 §The handshake]** "visible → false: JS keep children mounted, set native target = exiting. Native play exit envelope (interruptible). Native onTransitionEnd. JS now release the child to unmount."
> **[research: 35 lines 12-13]** "React owns the tree, so fx keeps the exiting child in a ref and asks React to unmount only after the native exit completes."

**The authoritative handshake:**

```
JS retains child in React ref — JS owns mount/unmount, never native.
  │
  │ visible=false → native target = exiting
  ▼
Native FxPresenceCoordinator plays exit animation on wrapper
  │  (interruptible: re-toggle visible=true retargets, doesn't restart)
  ▼
Native onTransitionEnd({phase:'exit'}) → EventDispatcher → JS
  │
  ▼
JS releases child from React ref → React unmounts child
```

**Key points:**
- **JS retains/releases the child** — React owns the tree (35:12-13)
- **Native plays the exit and emits completion** — never mounts or unmounts
- **Re-toggle retargets, doesn't restart** — mid-flight `visible=true` retargets the native envelope (35:17)
- **No `MountingOverrideDelegate` needed** — fx owns the wrapper, not the children. The `MountingOverrideDelegate` is needed only if you need to intercept Fabric mutations on views fx does NOT own (the Reanimated case). For fx's owned wrapper, the simpler JS-mount-retention model works.
- **Exit drive is via `visible` prop, not conditional rendering** — `{show && <FxPresence/>}` unmounts the coordinator before it can animate. Keep `FxPresence` mounted; flip `visible` (35:18-20).

### 5.3 Content Motion Fallback

```
effectiveMotion(key) = userMotion[key] ?? presetMotion[key] ?? identity
[research: 41 §The motion-map fallback]
```

- No implicit reverse — missing `exit` is not `enter` reversed
- Unknown state key → `identity` with dev warning
- Same rule for presence phases (`enter`/`exit`) and mounted states (`idle`/`selected`/...)

---

## 6. Press Handler (6-State FSM)

> **[finding] Gesture Handler uses a 6-state FSM: UNDETERMINED → BEGAN → ACTIVE → END/FAILED/CANCELLED. The slop-based early-failure (`failOffset` thresholds) yields to scrollers. Bidirectional simultaneous recognition: if either handler says "simultaneous," the orchestrator allows it. Coalescing keys: new key on each ACTIVE transition; ACTIVE events coalesce (newer replaces older). `shouldCancelWhenOutside` cancels when touch moves beyond view bounds.**
> [ref: gesture-handler/apple/RNGestureHandlerState.h:3-10] [ref: gesture-handler/apple/RNGestureHandler.mm:567-583,706-736] [ref: gesture-handler/android/.../core/GestureHandler.kt:392-432,744-780] [ref: gesture-handler/android/.../core/GestureHandlerOrchestrator.kt:116-260] [ref: gesture-handler/android/.../core/PanGestureHandler.kt:74,98-151,232-238]

**fx adoption:**

- Implement the 6-state FSM on `FxPressHandler` objects
- Slop-based early-failure with `failOffset` thresholds
- Coalescing keys for ACTIVE events
- `shouldCancelWhenOutside` for content pressables
- **Do NOT** subclass `UIGestureRecognizer` — implement the FSM directly on handler objects
- **Do NOT** replicate RNGH's full orchestrator (multi-recognizer coordination) — fx only needs ONE recognizer

```swift
class FxPressHandler {
  enum State { case undetermined, began, active, end, failed, cancelled }
  var state: State = .undetermined
  var coalescingKey: UInt16 = 0

  func handleTouchBegan(_ point: CGPoint) {
    state = .began
    // [finding] On movement exceeding failOffset, state = .failed (yields to scrollers)
  }

  func handleTouchMoved(_ point: CGPoint) {
    if state == .began {
      // [finding] On movement exceeding activeOffset, state = .active
      if shouldActivate { state = .active; coalescingKey += 1 }
    }
  }

  func handleTouchEnded() {
    if state == .active { state = .end /* fire onPress */ }
  }
}
```

Serves both `FxPressable` (content) and `<Fx interactionMode>` (interactive effect surface feeding `FxEffectRenderer`).

---

## 7. Platform-Specific Realization

> **[research: structure.ios §Platform fundamentals] [research: structure.android §Platform fundamentals]**

| Mechanic | iOS | Android |
|----------|-----|---------|
| **Shader language** | `.metal` | `.agsl` |
| **Decorative clock** | `TimelineView(.animation)` | `withFrameNanos` / `rememberInfiniteTransition` |
| **Interactive clock** | `CADisplayLink` | `Choreographer` frame callback |
| **Content motion** | `CASpringAnimation` on `CALayer` | `SpringAnimation` (standard `SpringForce`); M3 Expressive behind `feature:'m3-expressive'` gate [REAL-001] |
| **Effect motion** | `.animation` / `phaseAnimator` / `keyframeAnimator` | `animate*AsState` / `updateTransition`; M3 Expressive progressive enhancement |
| **Glass / material** | `.glassEffect` (iOS 26) / `UIBlurEffect` | `RenderEffect.createBlurEffect` + overlay / Haze [research: 21] |
| **Symbols** | `.symbolEffect` | AVD / Lottie [research: 24] |
| **Touch (content)** | hit-tests MODEL layer (target pos mid-flight) [finding] | hit-tests VISUAL layer (actual pos mid-flight) [finding] |
| **Touch (effect)** | `displayLink`-driven `MTKView` | draw-time `RenderEffect` — touch-safe |
| **Content-distort** | OUT OF SCOPE (severs RN touch) [research: 01] | PLANNED (AGSL + RenderEffect, draw-time) [research: structure.android] |
| **Shape morph** | NONE | M3 Expressive (native) [research: structure.android §shape-morph] |

---

## 8. Dependency Graph (Build Order)

```
src/manifest/  ──────────────────────────────────────────────────  (root sink, imports nothing)
    │
    ▼
src/presets/  ← src/effects/  ← src/motion/  ← src/surface/  ← src/runtime/  ← src/index.ts
    │
    │  JS ↔ Native boundary (Expo Modules)
    ▼
ios/FxNativeView.swift  /  android/FxNativeView.kt  ──  (the abstract base, §2)
    │
    ├── ios/FxHostedView.swift       /  android/FxHostedView.kt       ──  (V1 decorative)
    │
    ├── ios/FxSurfaceView.swift      /  android/FxSurfaceView.kt      ──  (V2, interactive + content motion, §5.1)
    │       ├── ios/FxLayoutObserver.swift /  android/FxLayoutObserver.kt
    │       ├── ios/FxAnimationDriver.swift / android/FxAnimationDriver.kt
    │       │       └── ios/FxPresenceCoordinator.swift / android/FxPresenceCoordinator.kt
    │       └── ios/FxPressHandler.swift    /  android/FxPressHandler.kt    ──  (V2, press recognizer, feeds interactive surface)
    │
    └── ios/FxGroupView.swift        /  android/FxGroupView.kt        ──  (V1+, morph compound)
```

---

## 9. Cross-Reference: Blueprint Units

| Unit | Blueprint | Native Files | JS Files |
|------|-----------|-------------|----------|
| 1 | `FxNativeView` (Boundary) | `FxNativeView.swift/.kt` (base), `FxHostedView.swift/.kt`, `FxSurfaceView.swift/.kt`, `FxModule.swift/.kt` | — |
| 2 | Manifest + `select()` | — | `src/manifest/` |
| 3 | `FxEffectRenderer` (Pixels) | `FxHostedView.swift/.kt`, `FxSurfaceView.swift/.kt` | `src/runtime/FxHostedView.tsx`, `src/runtime/FxSurfaceView.tsx` |
| 4 | Fabric-Invisible Layer | `FxSurfaceView.swift/.kt` (content motion wrapper) | `src/runtime/FxSurfaceView.tsx` |
| 5 | `FxLayoutObserver` (Read) | `FxLayoutObserver.swift/.kt` | — |
| 6 | `FxAnimationDriver` | `FxAnimationDriver.swift/.kt` | — |
| 7 | `FxPresenceCoordinator` | `FxSurfaceView.swift/.kt` + `FxPresenceCoordinator.swift/.kt` | `src/surface/FxPresence.tsx` (planned) |
| 8 | Press Recognizer | `FxSurfaceView.swift/.kt` + `FxPressHandler.swift/.kt` | `src/surface/FxPressable.tsx` (planned) |
| 9 | Runtime Objects | Plain native classes (no SharedObject needed) | — |

> Units 7/8 lower to `FxSurfaceView` (plus the coordinator/recognizer object); dedicated presence/press
> views are **not planned** — they ship as `src/surface/` components over the existing binding. The
> runtime-object granularity behind this (driver family-split, scheduling) is the current direction,
> not a closed call — formally open as RT-008 (`36`, DOC-011's todo).

---

## 10. Reference Origins Index (Decision Traceability)

Every architectural decision in this doc traces to exactly one of:

| Decision | Source | Breadcrumb |
|----------|--------|------------|
| Diff-gated setters + stashed pending + batch apply | Expo `ExpoFabricView.updateProps` + research 51 | `[ref: expo/ios/Fabric/ExpoFabricView.swift:84]` `[research: 51:24-28]` |
| `shouldBeRecycled() = false` | Expo `ExpoFabricView` | `[ref: expo/ios/Fabric/ExpoFabricView.swift:167]` |
| `ExpoView` = typealias for `ExpoFabricView` | Expo | `[ref: expo/ios/Core/Views/ExpoView.swift:1]` |
| Multiple views under one module (first=default) | Expo `ModuleDefinition` | `[ref: expo/ios/Core/Modules/ModuleDefinition.swift]` |
| EventDispatcher = callable object, Mirror-wired | Expo | `[ref: expo/ios/Core/Events/EventDispatcher.swift]` |
| View-scoped AsyncFunctions auto-get main queue | Expo | `[ref: expo/ios/Core/Functions/AsyncFunctionDefinition.swift]` |
| SharedObject only for JS-facing objects | Expo `SharedObject` | `[ref: expo/ios/Core/SharedObjects/SharedObject.swift]` |
| Fabric clobbers transform/opacity on Update mutations | Fabric `ShadowViewMutation` | `[ref: react-native/.../renderer/mounting/ShadowViewMutation.h]` |
| Layout resolved BEFORE mounting | Fabric `ShadowTree.cpp:417` | `[ref: react-native/.../renderer/mounting/ShadowTree.cpp:408-420]` |
| Hit-testing: model-layer only, not native-layer transforms (iOS caveat) | Fabric `LayoutableShadowNode` | `[ref: react-native/.../renderer/layout/LayoutableShadowNode.cpp:272-345]` `[research: 34:42-58]` |
| ShadowNodeFamily = real identity (Tag immutable) | Fabric `ShadowNodeFamily` | `[ref: react-native/.../renderer/core/ShadowNodeFamily.h]` |
| Intermediate container model (Fabric-invisible, not container view itself) | Cross-referencing: Fabric clobber + Expo children + research 33 | `[finding] §5.1` `[research: 33]` |
| No iOS hitTest override — model-layer caveat from 34 | Cross-referencing: Fabric hit-test + 34 caveat | `[finding] §5.1.1` `[research: 34:47-58]` |
| No MountingOverrideDelegate needed for wrapper model | Cross-referencing: Reanimated approach vs fx's owned wrapper | `[finding] §5.1` |
| 6-state FSM: UNDETERMINED → BEGAN → ACTIVE → END/FAILED/CANCELLED | Gesture Handler `RNGestureHandlerState.h` | `[ref: gesture-handler/apple/RNGestureHandlerState.h:3-10]` |
| Slop-based early-failure (failOffset thresholds) | Gesture Handler `PanGestureHandler` | `[ref: gesture-handler/android/.../core/PanGestureHandler.kt:74,98-151]` |
| Bisynchronous simultaneous recognition | Gesture Handler orchestrator | `[ref: gesture-handler/android/.../core/GestureHandlerOrchestrator.kt:808-809]` |
| Coalescing keys (new key on each ACTIVE transition) | Gesture Handler events | `[ref: gesture-handler/android/.../core/GestureHandler.kt:627-632]` |
| Do NOT subclass UIGestureRecognizer — implement FSM directly | Gesture Handler custom recognizer pattern | `[finding] §6` |
| Deferred-unmount: js mount-retention (simpler, no MountingOverrideDelegate) | Reanimated pattern + fx wrapper model | `[finding] §5.2` |
| HybridObject shape (NativeState + shared_ptr + equals/dispose) | Nitro `HybridObject` | `[ref: nitro/.../cpp/core/HybridObject.hpp]` |
| Hybrid Views do NOT host RN children (HybridViewProps empty) | Nitro `HybridView` | `[ref: nitro/.../cpp/views/HybridView.hpp]` |
| Nitro is NOT a fallback for content-wrapping; Expo Modules is the boundary | Cross-referencing: Nitro constraint + Expo child mounting | `[finding] §3.1` |
| FSM-based handler (not registered recognizer) serves both FxPressable and <Fx> | Gesture Handler borrow + fx architecture | `[finding] §6` |
