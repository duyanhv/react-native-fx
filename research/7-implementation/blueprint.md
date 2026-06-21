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
*   **Decision + flip-trigger:** **mimic** the `FxPresence` shape. `FxView` wraps content in one managed wrapper and animates transform/opacity between mounted `state`s via the content driver; props `state` / `preset` / `motion` / `transition` (V1); V1 `lift` state preset, `idle` / `selected` vocab (DOC-005). Wires the `onFxStateChange` native dispatcher (now wired, U12-001). → *Flip-trigger: none.* **`effect` is split to U12-002** — effect decoration attached to content, a distinct ownership problem (z-order, clipping, composition position, hosted-vs-expo-view relative to the host).
*   **Explicit Reject:** per-child motion (`57` Decision 5); animating flow layout (`04` Decision 2).
*   **Shape · phase (as-built, U12-001):** the `Surface` note was stale — `FxView` is a **native unit**. `src/surface/FxView.tsx` over a new `FxStateView` content host (iOS + Android, over `FxNativeView`, no Metal — reuses the `FxPressableView` wrapper pattern + `FxAnimationDriver`) driven by `FxStateViewCoordinator`'s N-state FSM, with the `onFxStateChange` settle/interrupt dispatcher. · **Surface + native**
*   **Depends on:** Unit 4, Unit 6, Unit 10

### Unit 13: `FxPressable` — native press feedback
*   **Contract:** `57`, `30`, `40`
*   **Precedent (battle-tested):** the shipped native `FxPressHandler` recognizer (U8-001).
*   **Decision + flip-trigger:** **mimic** — a JS component over the existing `FxPressHandler`: a `feedback="native"` press-feedback bundle + `onPress*` events on *your* content (distinct from `<Fx interactionMode>`, which is the effect surface). → *Flip-trigger: none.*
*   **Explicit Reject:** an RNGH dependency (`30` Decision 5); a second recognizer (reuse `FxPressHandler`).
*   **Shape · phase:** `src/surface/FxPressable.tsx` (public surface) + a **native unit** as-built — the `FxPressHandler` FSM was refactored behind a host protocol serving both `<Fx interactionMode>` and a new `FxPressableView` (over `FxNativeView`, intermediate-wrapper pattern). The blueprint's "JS component / Surface" framing was the public surface only; "mimic" became "refactor the proven FSM behind a host protocol" (U13-001, device-verified 2026-06-20). · **Surface + native**
*   **Depends on:** Unit 8 (merged)

### Unit 14: `FxGroup` / `FxItem` — the morphing compound
*   **Contract:** `57`, `21`
*   **Precedent (battle-tested):** the `FxGroupView` substrate binding (exists); iOS `GlassEffectContainer` / Android glass stack (U3-002 / U3-003).
*   **Decision + flip-trigger:** **adapt** the platform glass-container idiom. `FxGroup` / `FxItem` — the one honest compound (each item a real native morphing view); V1 morph scope is glass-only (DOC-006); explicit `spacing` deferred to V2. → *Flip-trigger: morph beyond glass (a new ledger row).*
*   **Explicit Reject:** a generic `Material` / `GlassContainer` component (`21` Decision 3); morphing arbitrary effects in V1.
*   **Shape · phase:** `src/surface/FxGroup.tsx` (+ `FxItem`) over `FxGroupView` · **Surface**
*   **Depends on:** Unit 1, Unit 3 (merged)

---

## Phase A: As-built V2 addenda

*Four mechanics shipped and merged as deferred-ledger (`DEF-0xx`) work, each driven by a maintainer-accepted trigger rather than a forward Unit — so the build map above never carried them. This section is the **as-built record**, not a schedule: all four are merged and device-ratified. It grounds each shipped mechanic in its code, its owning source doc, and the future work it unlocks, so the runtime engine and its front door stay fully tracked — the same gap that produced Phase S, applied to the post-Unit-9 mechanics. Architecture object/file mapping: `architecture.md §11`.*

### Addendum A1: `source` driver — scroll-linked presentation
*   **Shipped by:** DEF-014 (merged + device-ratified 2026-06-14) — "the V2 opener," the category's demand center.
*   **Scope:** the **iOS-hosted render-server rung only** — an fx-owned SwiftUI `ScrollView` with per-item `.scrollTransition`, `requires {os:17, substrate:hosted}`, `target:'effect'`, driving fx's own content (rule #4). The scroll *is* the clock; at rest nothing advances. The ambient-RN-scroll best-effort tier and the Android rung are deferred (each its own later rung).
*   **Code:** manifest `source` node (`src/manifest/manifest.ts`); JS `src/source/` (`fx.source.scroll`), `src/surface/FxScroll.tsx` (the `Fx` namespace object + `FxScroll`), `src/runtime/FxScrollView.{tsx,android.tsx,web.tsx}` (binding + Android/web static fallbacks); iOS `ios/FxScrollView.swift` (persistent `UIHostingController`) + `ios/FxScrollRootView.swift`.
*   **Source doc:** `02 §Decision 14` (node), `40 §Decision 7` (Escaping-regime-C route 1), `50 §Decision 9` (surface), `structure.ios.md §source`.
*   **Enables:** the ambient-RN-scroll best-effort tier and the Android `source` rung (later rungs); the `clock` driver sibling (`02 §Decision 14`, still unbuilt — DOC-025).

### Addendum A2: `controlled` mode — view-ref imperative uniform writes
*   **Shipped by:** DEF-020 (merged + device-spiked 2026-06-15).
*   **Scope:** the **view-ref write path only** — `setUniform` / `setHighlight` as Expo `AsyncFunction`s on the surface ref, **discrete writes only**, into the existing uniform buffer (RT-005 `[0,1]` y-up UV). The clobber rule: imperative overrides survive a host re-render and clear on exit-`controlled`. **No `SharedObject`, no `FxEffectRenderer` extraction, no Nitro** (that half is DEF-021, blocked).
*   **Code:** iOS `ios/FxSurfaceView.swift` + `ios/FxModule.swift`; Android `android/…/FxSurfaceView.kt` + `FxSurfaceShaderView.kt` + `FxModule.kt`; JS ref surface `src/runtime/FxSurfaceView.types.ts`.
*   **Source doc:** `30 §Decision 7` (controlled shipped), `50 §Decision 8`, `structure.{ios,android}` §controlled (the `imperativeOverrides` clobber rule).
*   **Enables:** unblocked DEF-011 (drag/tilt); the detached-handle `Fx*` `SharedObject` + discrete `FxEffectRenderer` object stay DEF-021 (only a JS-held handle needs them).

### Addendum A3: `dragAxis` — native-owned drag / tilt
*   **Shipped by:** DEF-011 (merged + device-verified 2026-06-18). Closes RT-002.
*   **Scope:** a native gesture recognizer extending the shipped `FxPressHandler` with **axis-aware claiming/yielding** (claim the shader's drag axis, yield the cross-axis to an ancestor scroller), **pointer-derived tilt only**, **native uniform writes** into the same buffer DEF-020 uses (drag/tilt scalars added to the iOS `FxUniforms` struct + the Android known set), and **native settle/spring-back** — no per-frame JS, no Reanimated. The ratified rule-#6 divergence: `dragAxis="both"` is standalone-only on iOS but blocks the parent on Android.
*   **Code:** iOS `ios/FxPressHandler.swift` + `ios/FxSurfaceView.swift`; Android `android/…/FxPressHandler.kt` + `FxSurfaceView.kt`; JS prop `src/runtime/FxSurfaceView.types.ts` (`dragAxis`).
*   **Source doc:** `30 §Resolved` (drag/tilt G3), `structure.{ios,android}` §drag/tilt.
*   **Enables:** DEF-006 (the optional app-owned Reanimated integration) is no longer a blocker — it is now purely additive.

### Addendum A4: runtime shader registration / compile
*   **Shipped by:** DEF-008 (merged + device-verified 2026-06-14). Closes FX-007; lifts the `22` Decision 6 V1 BYO-placement constraint.
*   **Scope:** JS `registerShader({ id, uniforms, source: { ios, android } })` compiles a BYO `.metal`/`.agsl` pair at runtime; `<Fx effect="id" />` stays the only consumption surface (no `<Fx source>` prop). Curated ids win on collision (native-enforced); missing platform → `{via:'none'}`; compile failure → `onFxError`. Platform divergence: runtime-source shaders lower through the **iOS expo-view Metal path even for decorative use** (no public `ShaderLibrary` over `MTLLibrary`, iOS 26.5; cache by source string, process-wide pipeline cache) and compile **per-view on Android** (a `RuntimeShader` is mutable, holds per-view uniform state, cannot be shared).
*   **Code:** JS `src/effects/registry.ts` (`registerShader`) + `src/index.ts` export; iOS `ios/FxShaderRegistry.swift` + `FxModule.registerShader` + `FxSurfaceView` (`makeLibrary(source:)`); Android `android/…/FxShaderRegistry.kt` + `FxModule.registerShader` + `FxSurfaceShaderView`/`FxSurfaceView`.
*   **Source doc:** `22 §Decision 7` (FX-007), `structure.{ios,android}` §shader (the runtime-compile + cache divergence).
*   **Enables:** the DEF-001 single-source compiler stays the explicitly-rejected V2 alternative (dual MSL+AGSL still required).

### Within-Unit mechanics not recorded at object granularity

*Three mechanics shipped **inside** tracked Units (A5 in Unit 7, A6 in Unit 6, A7 across Units 4/6/7) — they have no DEF row and no missing Unit, so they are tracked at the Unit level above. They are recorded here only because the build map names the Unit, not the object, and these three carry cross-platform divergence worth pinning at file granularity (the same record-as-built discipline as A1–A4). Architecture object/file mapping: `architecture.md §11`.*

### Addendum A5: `fx.motion.*` builders — the semantic motion vocabulary
*   **Shipped by:** U7-001 (merged + device-ratified 2026-06-12).
*   **Scope:** the four V1 builders `edgeIn` / `edgeOut` / `scale` / `identity`, each returning an **unresolved `MotionSpec`** — a semantic shape, never timing. Edge builders emit a measured `{measure:'edge'}` travel token the native coordinator fills from the laid-out frame; `scale` / `identity` are fixed deltas. **No implicit reverse** — a missing `exit` is not `enter` reversed unless the preset defines it (the one motion-map fallback rule, mirrored native).
*   **Code:** `src/motion/builders.ts` (the builders + the fallback rule), `src/fx.ts` (`fx.motion` namespace), `src/motion/types.ts` (`MotionSpec` / `Travel`).
*   **Source doc:** `41 §fx.motion → MotionSpec` (the builder + type), `41 §The motion-map fallback` (the one rule), `42 §The native measurement contract` (the measured edge token), `50 §Decision 9` (surface).
*   **Enables:** the `fx.effect.*` builder namespace (Unit 11) joins this same object as the third namespace.

### Addendum A6: reduce-motion driver gating — accessibility honored natively
*   **Shipped by:** U6-001 (merged + device-ratified 2026-06-12); policy ratified DOC-010 (MOT-010).
*   **Scope:** the V1 policy is **instant degradation** (0-duration jump to target). The driver checks reduce-motion **natively per envelope**: iOS reads `UIAccessibility.isReduceMotionEnabled`; Android gates **manually** — `ValueAnimator.areAnimatorsEnabled()` plus a `Settings.Global` scan of `ANIMATOR_DURATION_SCALE` / `TRANSITION_ANIMATION_SCALE == 0` — **because Android's global animator scale does not stop a `SpringAnimation`** (the divergence worth pinning: iOS gets the gate for free, Android must read it).
*   **Code:** `ios/FxAnimationDriver.swift` (`shouldReduceMotion`), `android/…/FxAnimationDriver.kt` (`shouldReduceMotion` + `readAnimationScale`).
*   **Source doc:** `41 §Decisions` (item 9, reduce-motion = instant degradation), `42 §Reduce-motion`, `34 §Findings — reduce-motion`.
*   **Enables:** nothing downstream — it is a leaf policy; recorded so the Android manual gate is not mistaken for a missing iOS-parity check.

### Addendum A7: idempotent teardown order — leak-free, safe to run twice
*   **Shipped by:** Units 4/6/7 (the lifecycle contract every native owner obeys; merged + device-ratified across the U4–U8 gates).
*   **Scope:** teardown runs most-transient → most-owned and is **safe to run twice** (destroy *and* a recycling reset): stop the loop first (pause + drop delegate / invalidate `CADisplayLink`) so no in-flight frame touches a half-freed pipeline → per-frame transients (nothing to free) → pipeline cache + library + uniform storage → queue, then device last (or never, if device-shared). The content-motion runtime obeys the same contract with no GPU loop: releasing the `FxPresenceCoordinator` / driver stops in-flight animations, clears the wrapper handle, and **never leaks the retained-exiting child** (the `35` mid-exit edge). Retain-cycle discipline: weak view delegate, `[weak self]` closures, weak app-state registry refs.
*   **Code:** `ios/FxSurfaceView.swift`, `ios/FxAnimationDriver.swift`, `ios/FxPresenceCoordinator.swift` (+ Android siblings).
*   **Source doc:** `31 §Idempotent teardown` (+ `§The content-motion runtime`), `35` (the mid-exit teardown edge).
*   **Enables:** the verified `shouldBeRecycled() = false` opt-out (`31 §Recycling`) means no per-view reset hook is needed; the order holds if recycling is ever forced on.
