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
*   **Decision + flip-trigger:** **mimic** (own TS logic). The per-effect typed config is **derived** from the manifest at the type level (`ConfigFor<NodeId>`, no codegen — `02` Decision 15, U2-003), not authored separately.
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
*   **Decision + flip-trigger:** **fx-original design** (derived from the `33` finding). `FxSurfaceView` creates a layout-transparent intermediate container and overrides `mountChildComponentView` to route RN children into it (the mechanic that makes the wrapper wrap anything). The animator targets this container, which Fabric cannot see or clobber.
*   **Shape · phase:** Intermediate container inside `FxSurfaceView` · **V2**
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
*   **Shape · phase:** plain native objects (internal) · **V2**. *(The `Fx*` `SharedObject` layer + the discrete `FxEffectRenderer` object split out to DEF-021, blocked — V1/V2 expose no JS-held handle, so they have no consumer; `36 §V1 realization`.)*
*   **Depends on:** Unit 6, Unit 7

---

## Phase S: The Public Surface (Components & Builders)

*This phase delivers the JS-facing surface layer — the components and builders `1-surface/` specifies and `6-ship/52 §Public exports` names as the V1 stability contract (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`). The original blueprint above deliberately scoped these out ("The JS surface layer (components, builders) that sits atop these units is documented in `1-surface/`") and no unit ever decomposed them, so the runtime engine (Units 1–9) was built and device-proven while the front door it feeds went untracked — five of the eight contract symbols (`<Fx effect>`, `FxView`, `FxPressable`, `FxGroup`/`FxItem`, `EdgeGlow`) and the `fx.effect.*` builder do not exist. These units close that gap. Each sits atop already-merged runtime units, so all are unblocked. The presentation magnitudes/feel they surface (preset/feedback default catalogs) ride the existing MOT-001 device work; these units build the component mechanism and prop wiring.*

### Unit 10: `<Fx effect>` — the effect surface + `EdgeGlow`
*   **Contract:** `50`, `55`, `56`, `02`, `40`
*   **Precedent (battle-tested):** the shipped `Fx.Scroll` / `FxPresence` components over the substrate views; `select()` over the manifest (U2-001).
*   **Decision + flip-trigger:** **fx-original design.** Ship the canonical front door `<Fx effect="id">` (string form) — a component that runs `select()` over the manifest and mounts the right substrate view (`FxHostedView` decorative / `FxSurfaceView` interactive), wiring `effect` / `intensity` / `composition` / `interactionMode` / uniform props + `onLoad` / `onError` / `onPress*`. `EdgeGlow` ships as thin sugar over `<Fx effect="edge-glow">` (the one named effect component, DOC-004). → *Flip-trigger: none expected — the substrate views already render every effect; this is the JS surface over them.*
*   **Explicit Reject:** exposing `FxSurfaceView` / `FxHostedView` as the public effect API (they are the low-level hosts, `52`); a bare `effect` export (`55` Decision 7).
*   **Shape · phase:** `src/surface/Fx.tsx` (+ `EdgeGlow`) · **Surface**
*   **Depends on:** Unit 1, Unit 2, Unit 3, Unit 8 (all merged)

### Unit 11: `fx.effect.*` builder + `EffectStack` composition
*   **Contract:** `55`, `50`, `02`
*   **Precedent (battle-tested):** the shipped `fx.motion.*` / `fx.source.*` builder namespaces (one-to-one builder → type).
*   **Decision + flip-trigger:** **fx-original design.** Add the third builder namespace `fx.effect.*` (`.mesh` / `.glass` / `.glow` / `.blur` / `.animate` / `.defaults`) producing an immutable `EffectStack` (`EffectStep[]` + per-step / stack `Transition`), consumed by `<Fx effect={stack}>` — one component, one bridge crossing, layers as config not children (`55` Decisions 1/2/6/8). → *Flip-trigger: a real multi-layer use case the value-semantics stack cannot express → revisit the `Fx.Stack` JSX compound (SURF-008).*
*   **Explicit Reject:** `Fx.Stack` / `Fx.Layer` JSX compound (DEF-004 / SURF-008); `motion` as an `EffectStep.node` (visual-only, `55` Decision 2).
*   **Shape · phase:** `src/fx.ts` (`effect` namespace) + `src/effects/stack.ts` · **Surface**
*   **Depends on:** Unit 10

### Unit 12: `FxView` — state-driven content presentation
*   **Contract:** `57`, `50`, `54`, `41`
*   **Precedent (battle-tested):** `FxPresence` (the sibling content coordinator, U7-001); the content-motion driver (U6) + wrapper mechanic (U4).
*   **Decision + flip-trigger:** **mimic** the `FxPresence` shape. `FxView` wraps content in one managed wrapper and animates transform/opacity between mounted `state`s via the content driver; props `state` / `preset` / `motion` / `effect` / `transition`; V1 `lift` state preset, `idle` / `selected` vocab (DOC-005). Wires the `onFxStateChange` native dispatcher (`40` flags it unwired). → *Flip-trigger: none.*
*   **Explicit Reject:** per-child motion (`57` Decision 5); animating flow layout (`04` Decision 2).
*   **Shape · phase:** `src/surface/FxView.tsx` + native `onStateChange` dispatch · **Surface**
*   **Depends on:** Unit 4, Unit 6, Unit 10

### Unit 13: `FxPressable` — native press feedback
*   **Contract:** `57`, `30`, `40`
*   **Precedent (battle-tested):** the shipped native `FxPressHandler` recognizer (U8-001).
*   **Decision + flip-trigger:** **mimic** — a JS component over the existing `FxPressHandler`: a `feedback="native"` press-feedback bundle + `onPress*` events on *your* content (distinct from `<Fx interactionMode>`, which is the effect surface). → *Flip-trigger: none.*
*   **Explicit Reject:** an RNGH dependency (`30` Decision 5); a second recognizer (reuse `FxPressHandler`).
*   **Shape · phase:** `src/surface/FxPressable.tsx` · **Surface**
*   **Depends on:** Unit 8 (merged)

### Unit 14: `FxGroup` / `FxItem` — the morphing compound
*   **Contract:** `57`, `21`
*   **Precedent (battle-tested):** the `FxGroupView` substrate binding (exists); iOS `GlassEffectContainer` / Android glass stack (U3-002 / U3-003).
*   **Decision + flip-trigger:** **adapt** the platform glass-container idiom. `FxGroup` / `FxItem` — the one honest compound (each item a real native morphing view); V1 morph scope is glass-only (DOC-006); explicit `spacing` deferred to V2. → *Flip-trigger: morph beyond glass (a new ledger row).*
*   **Explicit Reject:** a generic `Material` / `GlassContainer` component (`21` Decision 3); morphing arbitrary effects in V1.
*   **Shape · phase:** `src/surface/FxGroup.tsx` (+ `FxItem`) over `FxGroupView` · **Surface**
*   **Depends on:** Unit 1, Unit 3 (merged)
