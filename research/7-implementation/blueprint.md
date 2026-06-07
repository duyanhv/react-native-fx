# Implementation Blueprint

*Scope: This blueprint defines the build-ordered sequence for the native runtime and JS↔native boundary. The JS surface layer (components, builders) that sits atop these units is documented in `1-surface/`.*

This document defines the strict, build-ordered sequence for the `react-native-fx` runtime. Every architectural unit binds its theoretical contract to a battle-tested precedent, governed by an explicit decision (use, mimic, adapt, reject) and a falsification trigger.

### The Decision Spectrum
*   **use** — take the dependency (sanctioned for Expo Modules + Fabric only).
*   **mimic** — reimplement the pattern natively, zero dependency.
*   **adapt** — take the concept, bend it to fx's constraints.
*   **fx-original design** — derived from an fx-specific constraint/finding, with no clone-able prior art.
*   **reject** — understand the mechanism, explicitly do not adopt.

---

## Phase V1: The Static & Decorative Substrate (Effects)

*This phase delivers first-light: declarative, decorative effects (fills, materials, shaders, symbols) drawn natively on the hosted substrate.*

### Unit 1: `FxNativeView` (The Boundary)
*   **Contract:** `51`, `04`, `05`, `01`
*   **Precedent (battle-tested):** Expo `ViewDefinition` two-phase props; `mountChildComponentView` hooks (`ExpoFabricView.swift`)
*   **Decision + flip-trigger:** **use** Expo Modules. Register **separate native view classes per substrate** (e.g., `FxHostedView` vs `FxSurfaceView`).
*   **Verified Falsification PASS:** Expo maintains stable identity (`shouldBeRecycled() = false`).
*   **Explicit Reject:** RN Runtimes and Nitro as the default boundary mechanism.
*   **Shape · phase:** Swift `ExpoView` subclasses · **V1**
*   **Depends on:** — (root; feeds all other native units)

### Unit 2: The Manifest + `select()`
*   **Contract:** `02`, `03`, `50`
*   **Precedent (battle-tested):** (pure, no direct precedent; declarative IRs)
*   **Decision + flip-trigger:** **mimic** (own TS logic). **Manually maintain** the TypeScript types alongside the Manifest.
*   **Shape · phase:** `src/manifest` · **V1**
*   **Depends on:** — (root; feeds all other units)

### Unit 3: `FxEffectRenderer` (The Pixels)
*   **Contract:** `20-24`, `01`, `30`, `31`, `36`
*   **Precedent (battle-tested):** SwiftUI view + modifier composition / `ViewBuilder`; Compose `Canvas` rendering trees.
*   **Decision + flip-trigger:** **mimic** the declarative rendering tree natively. → *Flip to the **shader rung** (`via:'shader'` — `.metal`/`.agsl`) when a native primitive is too rigid; this is the manifest's existing fallback (e.g. mesh-as-AGSL on Android, `02`/`22`). Skia is **rejected** as a heavyweight dependency and positioned as contrast (`00`/`22`), not a first flip.*
*   **V2 extension — interactive-effect surface:** On `expo-view`, `FxEffectRenderer` also owns the GPU surface (`MTKView`/`RenderEffect` + `CADisplayLink`/`Choreographer` loop, `31`/`32`), fed by Unit 8's recognizer for `interactionMode`. This is the same object's V2 face, not a separate unit.
*   **Shape · phase:** Swift/Kotlin renderers · **V1** (hosted, decorative) · **V2** (expo-view, interactive surface)
*   **Depends on:** Unit 1, Unit 2

---

## Phase V2: The Interactive & Motion Engine (Content Motion)

*This phase delivers the content-motion moat: reading layout, animating Fabric-invisible layers, and managing presence lifecycles.*

### Unit 4: The Intermediate Fabric-Invisible Layer (Clobber Mitigation)
*   **Contract:** `33`, `04`
*   **Precedent (battle-tested):** the Fabric clobber constraint — Fabric overwrites `transform`/`opacity` on tracked views. This is the *problem* fx must solve, not a pattern a lib demonstrates; no prior art exists.
*   **Decision + flip-trigger:** **fx-original design** (derived from the `33` finding). `FxNativeView` creates a layout-transparent native container and overrides `mountChildComponentView` to route RN children into it (the mechanic that makes the wrapper wrap anything). The animator targets this container, which Fabric cannot see or clobber.
*   **Shape · phase:** Native sublayer within `FxSurfaceView` · **V2**
*   **Depends on:** Unit 1

### Unit 5: `FxLayoutObserver` (The Read)
*   **Contract:** `33`, `36`
*   **Precedent (battle-tested):** Fabric's `layoutMetrics` from `ShadowTree`.
*   **Decision + flip-trigger:** **mimic** (read bounds on mount/update via Expo).
*   **Verified Falsification PASS:** Fabric resolves layout *before* mounting (`ShadowTree.cpp:417`), allowing safe pre-mount reads.
*   **Shape · phase:** Native observer attached to `FxSurfaceView` · **V2**
*   **Depends on:** Unit 4

### Unit 6: `FxAnimationDriver`
*   **Contract:** `34`, `33`, `04`
*   **Precedent (battle-tested):** iOS `CASpringAnimation` / Android `DynamicAnimation`.
*   **Decision + flip-trigger:** **mimic** by using the platform's built-in spring properties. *Worklets/Reanimated are **rejected** for the V1/V2 default — they are a flip only if regime-C continuous gesture-scrubbed motion is ever pursued (`05`).*
*   **Explicit Reject:** Worklets/Reanimated's per-frame JS execution (the V1/V2 default path).
*   **Shape · phase:** Pure native animator · **V2**
*   **Depends on:** Unit 4, Unit 5

### Unit 7: `FxPresenceCoordinator`
*   **Contract:** `35`, `42`, `54`, `04`
*   **Precedent (battle-tested):** Web `AnimatePresence` / Reanimated `WAITING→ANIMATING→DEAD`.
*   **Decision + flip-trigger:** **mimic** the deferred-unmount pattern via **JS-side mount retention**. `FxPresence` holds the child in a React ref via the `visible` prop until `onTransitionEnd`. → *Flip-trigger: writing a C++ hook only if fx drops the `visible` prop requirement and supports `{cond && <X/>}`.*
*   **Explicit Reject:** A custom C++ `UIManagerCommitHook` (breaches rule #7) and Reanimated's worklet runtime.
*   **Shape · phase:** JS mount-retention state + Native FSM · **V2**
*   **Depends on:** Unit 4, Unit 6

### Unit 8: Press Recognizer
*   **Contract:** `30`, `32`
*   **Precedent (battle-tested):** RNGH recognizer FSM + slop-yield.
*   **Decision + flip-trigger:** **adapt** (a *single* custom press recognizer using the FSM + slop-based early-failure + `shouldCancelWhenOutside` to yield to scrollers). Serves both `FxPressable` (content) and `<Fx interactionMode>` (the effect surface, feeding Unit 3's V2 interactive path).
*   **Explicit Reject:** RNGH-the-dependency, and mimicking the full multi-recognizer orchestrator.
*   **Shape · phase:** Custom native recognizer · **V2**
*   **Depends on:** Unit 1, Unit 3

### Unit 9: Runtime Objects
*   **Contract:** `36`, `05`
*   **Precedent (battle-tested):** Nitro `HybridObject` shape (`jsi::NativeState`, equals/dispose).
*   **Decision + flip-trigger:** **mimic** the shape by using **Expo's native `SharedObject` API** — only for objects JS holds a reference to. The internal driver, coordinator, and observer (`FxAnimationDriver`, `FxPresenceCoordinator`, `FxLayoutObserver`) are plain native classes; they don't cross the JS boundary and don't need `SharedObject`.
*   **Explicit Reject:** Nitro-the-dependency (upfront).
*   **Shape · phase:** `Fx*` SharedObjects (JS-facing) + plain native objects (internal) · **V2**
*   **Depends on:** Unit 6, Unit 7
