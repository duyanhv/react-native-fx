# Native boundary decision (ADR)
Status: researched
Phase: v1 (the default) · revisit at v2 if the runtime research forces it
Feeds: 4-runtime/33–35, 4-runtime/51, 5-realization/structure.{ios,android}, the build
Owns: the JS↔native **boundary mechanism** decision (which native-module substrate fx is built on).

## Why this matters

Owning the content-motion runtime (`4-runtime/33`–`35`) raises the boundary question:
is **Expo Modules + Fabric** (rule #7) sufficient, or does fx need a faster/lower
boundary (**Nitro / JSI**), or off-thread JS (**React Native Runtimes**)? This doc is the
single authority for that choice, so rule #7 is not relitigated ad hoc each time the
runtime work gets hard. It decides the *mechanism* that carries the **fx-owns-presentation**
boundary drawn in `04`; the ownership lines there are upstream of this choice.

> **Conclusion (current): RN Runtimes is not a core fit. Nitro is a plausible
> native-runtime backend, but fx should not choose it until the layout/shadow-node
> research proves Expo Modules cannot provide the required ownership.**

## The options

| Option | What it is | What it gives fx | What it costs |
|---|---|---|---|
| **Expo Modules View** (default) | the current boundary — native module + native view + async functions/events (the substrate fx hosts SwiftUI/Compose in) | the **view/module boundary** + native view integration, discrete config + events — the contract's shape (hosted SwiftUI/Compose pending validation, `51`) | async only; no synchronous JS↔native read |
| **Nitro / HybridObject + Hybrid Views** | JSI native modules + view components, statically-generated type-safe bindings, long-lived native objects (C++/Swift/Kotlin) | fast **synchronous** calls + native object **identity/state**; HybridObject shape matches the runtime's native objects; **has view support** | adds a **JSI/C++ dependency** (rule #7) + a different module system; **no advantage** for the container-scoped async presence path |
| **React Native Runtimes** | named secondary Hermes runtimes, off the main JS thread; native-backed shared state | moves heavy JS work off-thread | out of scope for animation / shadow / layout / views — doesn't solve fx's problem |
| **raw RN Fabric component** | hand-written Fabric host component + C++ | maximum control over the view/shadow layer | most code, most C++; abandons the "hosting infra is Expo's" rationale |

## The deciding lens

The contract is **targets in, native owns frames, events out.** Frames never cross the
boundary, so the boundary carries only discrete config + events — which Expo Modules'
async surface already handles. **Nitro's headline advantage (ultra-fast *synchronous*
calls) is not on the critical path for fx's public API**, because JS is not driving
frames. That single fact removes the usual reason to reach for JSI.

## What each does and doesn't solve for fx

- **React Native Runtimes — concept mostly does not apply.** It solves heavy-JS jank
  (lists, chat, sync, crypto, hydration). It does **not** solve any of fx's core
  problems: wrapping RN content, shadow-node / layout ownership, deferred unmount, the
  native animation driver, hit-testing during transform, platform-native motion
  defaults. **Not a core dependency.** Retained only as *inspiration*: its named runtimes
  are **stable logical owners** — fx's animation owners (`FxAnimationDriver`,
  `FxPresenceCoordinator`, `FxLayoutObserver`, `FxEffectRenderer`) should likewise be
  stable, named, logical owners.

- **Nitro — concept applies strongly to the runtime *shape*, defer the *dependency*.**
  fx's native objects are almost HybridObject-shaped already: long-lived natives with
  methods, state, identity, and native ownership. So **adopt the shape now, regardless of
  binding mechanism** (`Fx`-prefixed native classes per the style guide), which keeps a
  later Nitro swap *mechanical, not architectural*. **Nitro now ships Hybrid Views**, so
  view support is no longer the blocker it once was — but choosing it would still **add a
  JSI/C++ dependency** (the thing rule #7 names) and a different module system, and it
  **does not beat Expo Modules for the container-scoped, async presence path**: that path
  needs no synchronous speed, and Expo Modules already provides the view/module boundary
  and native view integration fx is built on. So do not take the dependency yet.

- **Expo Modules View — the default**, because it provides the current view/module boundary
  and native view integration fx is built on, with an async boundary that matches the
  contract and no JSI/C++ dependency. (Hosted SwiftUI/Compose and the exact RN-child
  behavior still need validation — `51` / the platform structure docs.)

## Capability mechanism: source channel, substrate depth, and escalation

`04` draws the ownership **boundaries** (A / B / L). This section owns the two **mechanism**
axes that are independent of the boundary — what *drives* a capability's target, and how deeply
fx *binds* to native to carry it — plus the escalation gate for the cases that move a boundary.

### Source channel (what drives the target)

| channel | meaning | accepted? |
|---|---|---|
| **discrete target** | JS sets a semantic target; native runs the envelope (`visible`, `preset`, effect id) | yes — the default |
| **native continuous source** | a native signal drives the value continuously (scroll, gesture, sensor, audio, time); the clock stays native | yes — no per-frame JS crosses |
| **external UI-thread prop drive** | the *app's own* Reanimated shared value updates an fx-exposed UI-thread-animatable prop/uniform; fx owns no worklet/JSI | yes — depth 1, the Expo Modules prop path; no per-frame JS (DEF-006) |
| **fx-authored continuous mapping** | fx authors or depends on a worklet / JSI to map a source per frame | **no** by default — depth 4, breaks rule #7; gated regime C only (below) |
| **per-frame bridge values** | JS computes and sends a value across the bridge every frame | **no** — violates rules #1/#8 |

The channel is orthogonal to the boundary: a scroll-linked header is Boundary A driven by a
*native continuous source* — it writes no layout and crosses no per-frame JS, so it fits the
contract; it becomes Boundary L only if it must resize into Yoga.

### Substrate depth (how fx binds to native)

| depth | binding mechanism | rule cost |
|---|---|---|
| **1 — Expo Modules view** | the current Swift/Kotlin path: props in, events out, async functions — including a UI-thread-animatable prop the app's Reanimated drives (DEF-006) | none — the default |
| **2 — component-view shim** | ObjC++/Kotlin against RN internals (e.g. a Fabric `updateLayoutMetrics` override) | a substrate escalation; does **not** move a boundary |
| **3 — custom Fabric component** | a real `ShadowNode` + `ComponentDescriptor` with a Yoga measure function (C++) | breaks rule #7 (C++); the **only** path that can write layout (Boundary L) |
| **4 — JSI / worklets** | **fx-authored or fx-depended** synchronous JS↔native calls, worklets, or host-objects driving frames | breaks rule #7 (JSI); rejected by default |

Depth is independent of boundary: a Fabric-pushed layout *read* (depth 2) stays a Boundary-A
read — a robustness optimization, not a rule-#9 move. Writing layout is depth 3 *and* Boundary
L. JSI/Nitro (depth 4) moves neither boundary by itself and cannot host RN children (the
falsification finding below), so it is **never** the path to layout participation. The depth-4
discriminator is **ownership** — who authors the worklet: the app's own Reanimated driving an
fx-exposed prop is depth 1; fx authoring or depending on a worklet/JSI is depth 4.

### Escalation regimes (crossing a boundary)

For the capabilities that *move* a boundary, the escalation is one of three — each touching a
different rule with a different trigger. The Decision below is the gate; this names which one:

| escalation | boundary | source | substrate depth | rule touched | trigger |
|---|---|---|---|---|---|
| **measured-content flow** | A → L (writes layout) | discrete | 3 — custom Fabric | #9 + #7 | outside siblings must move via Yoga size |
| **pushed-layout read** | stays A (read) | unchanged | 2 — component-view shim | substrate only | observation lag / robustness — not a product gate |
| **authored continuous (regime C)** | usually none | native → authored | 4 — JSI / worklets | #7 + #1/#8 | native presets cannot express the mapping *and* it must drive fx-owned state |

The first row is the product gate; the second is an optimization investigation; the third is the
named regime-C exception Decision 5 reserves.

### Two lanes for continuous interaction, and the falsifying test

Most "live" interactions (gesture → transition progress, scroll → header transform) split into
two lanes:

- **Lane 1 — native continuous source** (additive, depth 1, no rule-break): a native source
  drives a fixed native mapping/preset on a native clock. Build here first; Lane 1's design problem
  is **preset expressiveness** — a native mapping vocabulary rich enough to keep Lane 2 empty.
- **Lane 2 — authored continuous source** (gated regime C, depth 4): the user authors the
  mapping (a worklet) and it runs on the UI thread. Doubly narrow — it earns itself only when
  **native presets cannot express the interaction** *and* the mapping must drive **state only fx
  owns** (a retained slot's frame, the Fabric-invisible layer). Authored mapping of the
  *content's own* visuals is already solved by composition (nest Reanimated inside your content),
  so a Lane 2 that re-drives content would just rebuild Reanimated — which this doc forbids.

Before opening Lane 2 / regime C, the interaction must fail **the falsifying test**:

> Can it be built with discrete targets + native source events + native presets + no per-frame JS?

**Yes** → no regime C; build it in Lane 1 (a missing preset is *vocabulary* work, not a
rule-break). **No, and the mapping must be user-authored per frame against fx-owned state** →
regime C is justified, and the break is depth-4 (JSI/worklets), not Nitro for its own sake.

### Lane 1 native signal grammar

Lane 1 is a small native signal grammar for fx-owned presentation. It is not a general animation
language, and it is not a graph API for app code.

```txt
native source -> normalized signal -> native mapping -> fx-owned target
```

The target is either transform/opacity on an fx-owned wrapper (Boundary A) or an effect uniform
(Boundary B). The target is never height, width, flex, child order, or arbitrary app state.

Lane 1 has two phases:

- **Track:** while the source is active, the target follows the mapped value.
- **Settle:** when the source ends, an optional fixed native operator resolves the rest state.

The track phase is stateless. It can condition and shape the signal with a small vocabulary:

- `smooth` as source-side conditioning for noisy sources only;
- `range-map`, `curve`, and `deadzone` as pure transforms;
- `extrapolate: "clamp"` or `extrapolate: "rubberBand"` as the range-edge policy.

The settle phase owns the hidden state. Its operators are fixed, enumerated, and
parameterized: `threshold`, `hysteresis`, `snap`/`detent`, `spring-to`, and `velocity-settle`.
Developers pick an operator through a preset's typed parameters; they do not assemble a state
machine.

Lane 1 falsifies on three edges:

- the consequence must move siblings through Yoga → Boundary L;
- the consequence changes React child structure or order → cross-tree frontier;
- the mapping or commit decision needs arbitrary user-authored per-frame math → Lane 2 / regime C.

Most rich interactions split across those edges. Lane 1 can move the driven element, while the
layout consequence or structural commit stays a separate capability decision.

## Reference repos to fork / inspect

Fork reference projects **by problem**, not as architecture authorities. fx's architecture
stays: Expo-style native view boundary, RN/Yoga-owned layout, native-owned presentation
state, no per-frame JS, Nitro-shaped native objects only if the default boundary fails.

| Priority | Reference | Use it to answer | What not to copy |
|---|---|---|---|
| 1 | **expo / expo-modules-core** | How to export `FxNativeView`, pass structured props, emit view events, expose async ref methods, handle children / `GroupView`, autolink. | Do not become an `@expo/ui` universal component or cede fx's layout/hit-test boundary to auto-Host (`01`). |
| 2 | **react-native core** | Fabric view identity, Yoga measurement timing, `collapsable`, child insertion, transform hit-testing, responder behavior. | Do not take on flow-layout animation; fx reads layout and animates presentation only (`04`/`33`). |
| 3 | **react-native-gesture-handler** | Native recognizer lifecycle, cancellation, scroll/RNGH coexistence, semantic press events for `FxPressable` and interactive `<Fx>`. | Do not add RNGH as a V1 dependency; borrow the arbitration model, not the package. |
| 4 | **react-native-reanimated / worklets** | What requires UI-thread worklets/shared values; how per-frame JS is avoided; the future regime-C escape hatch. | Do not copy the public worklet API or make fx a Reanimated competitor. |
| 5 | **react-native-nitro-modules** | HybridObject / HybridView shape: typed native refs, long-lived native identity, future controller objects. | Do not take the JSI/C++ dependency until `33`/`35` prove Expo Modules cannot hold wrapper identity or layout state. |
| 6 | **react-native-runtimes** | Named runtime ownership and native-backed shared-state ideas; "keep props small" across boundaries. | It does not solve fx's view/layout/animation problem; keep as conceptual reference only. |

The first code spike should therefore inspect **Expo + React Native core first**, then
Gesture Handler for touch arbitration. Reanimated, Nitro, and RN Runtimes are second-layer
references for the future lanes and fallback boundary.

## Decision

1. **Expo Modules + Fabric remains the default boundary until proven insufficient.**
2. **Nitro / JSI is a possible *backend* only if** shadow-node / layout ownership or
   native object identity cannot be solved cleanly through Expo Modules — a call made by
   the `33`/`34`/`35` research, **not upfront**.
3. **Adopt the HybridObject *shape* for the native runtime objects now** (stable logical
   owners, `Fx`-prefixed), so the boundary can change later without reshaping the runtime.
4. **React Native Runtimes is not a core dependency** — kept only as the "stable logical
   owner" naming inspiration.
5. **Continuous interaction splits by ownership; the regime-C Reanimated lane is app-owned only**
   (`4-runtime/34`, `3-motion/40`): **fx-owned** continuous interaction (drag/tilt, DEF-011) is
   **native** — a native recognizer reads the gesture and writes the uniform natively (route-1
   `source`, no JS, no Reanimated); it is *not* regime C. The **regime-C lane is the app-owned
   case**: an *app's own* Reanimated shared value drives an fx-exposed UI-thread-animatable prop —
   depth 1, the Expo Modules prop path, no per-frame JS and **no fx worklet/JSI** (Reanimated is the
   caller's transport, not fx's runtime; optional/trigger-gated — DEF-006). fx **authoring or
   depending on** a worklet / JSI / host-object to drive frames is the depth-4 carve-out —
   **rejected by default**, revisited only under the `33`/`35` triggers. This is the
   depth-1-allowed / depth-4-rejected line drawn in §Capability mechanism above.
6. **Lane 1 has a fixed native signal grammar, not a user-authored graph.** Native source →
   mapping → fx-owned target is additive only while the target stays Boundary A or B and the
   mapping uses the fixed track/settle vocabulary. If a proposed interaction needs layout writes,
   child reordering, cross-tree identity, or arbitrary per-frame authored math, it leaves Lane 1.

## Open questions

- **The falsification test — DEVICE-PROVEN (SPINE-009 closed, U9, 2026-06-13).** The first
  verdict (source-audit PASS) is now confirmed on hardware across the U5–U8 gates. Stable
  wrapper/coordinator **identity holds** (Expo `shouldBeRecycled() = false` → views never
  recycled) — device-proven by identity-stable driver/coordinator/recognizer across
  re-renders, retargets, presence cycles, and the touch path (U6-001/U6-002, U7-001/U7-002,
  U8-001). **Layout is readable natively** (Fabric resolves Yoga *before* mount; the frame is
  in `layoutMetrics`) — device-proven on `FxSurfaceView` (U5-001/RT-013, Fabric-only). The one
  verified *constraint*: Fabric re-applies `transform`/`opacity` props on commit, so fx animates
  an **fx-owned, Fabric-invisible intermediate layer** (`33`/`34`), not a tracked view's prop —
  built (U4) and device-proven. With that, **Expo Modules is sufficient** for the
  container-scoped model — the whole no-Nitro bet, now device-settled for V1. The remaining
  trigger is precise and unchanged: **per-child control** (staggered children, child-anchored
  `menu`/`tooltip`) — *that* is the day to reconsider Nitro / raw Fabric.
- **The Nitro fallback is narrower than it looked.** Verified: **Nitro Hybrid Views do not
  host RN children** (`HybridViewProps` is empty). So a "swap to Nitro" would cover the
  runtime **objects**, *not* the content-wrapper view — that stays Expo Modules (which can
  host RN children) or becomes a custom Fabric `ViewManager`. This *reinforces* the default.
- Whether the effect renderer and the content runtime would adopt Nitro independently, or
  it is an all-or-nothing boundary swap.

## Sources

- This decision (design conversation), grounded in the boundary research below.
- [Nitro — What is Nitro](http://nitro.margelo.com/docs/what-is-nitro),
  [mrousavy/nitro](https://github.com/mrousavy/nitro),
  [margelo/react-native-runtimes](https://github.com/margelo/react-native-runtimes),
  [Reanimated — Worklets](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/).
- `00` (rule #7 rationale), `01` (substrates), `4-runtime/34` (the driver finding this
  generalizes), `33`/`35` (the ownership research that gates the revisit), `51` (the
  Expo Modules view base).
