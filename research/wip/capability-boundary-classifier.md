# Capability boundary classifier — exploration

Status: open — WIP, non-authoritative
Phase: cross-cutting architecture tool (feeds the "expand the lib" question)
Feeds: `0-spine/02-capability-ir-and-lowering.md`, `0-spine/04-state-ownership-and-boundaries.md`, `0-spine/05-native-boundary-decision.md`, `5-realization/structure.{ios,android}.md`
Scope: give every proposed native presentation capability one decision — **can fx add it inside an existing boundary, or does it move a boundary?** — derived bottom-up from the shipped primitives, not invented top-down.

## The central question

This note is not a feature list. It is the tool that sorts feature lists. For any proposed
native presentation capability, it answers one thing:

> Can fx add this inside an existing ownership boundary, or does it move a boundary?

"Inside an existing boundary" means additive: reuse machinery that already ships, no rule
changes. "Moves a boundary" means it crosses a fence the rules draw — most concretely rule #9
(fx reads layout, never writes it) — and therefore needs an explicit `0-spine/05` decision
before it can ship. The classifier exists so that distinction is mechanical, not a matter of
taste.

## The shared contract

Every shipped primitive — presence, surface, hosted, shader, symbol, glass, fill, material —
obeys one contract. This is verified in the source, not aspirational:

- **JS sends discrete semantic targets and config.** Props are stashed and applied as one
  coherent snapshot per batch (`applyResolvedConfig` under Expo's `OnViewDidUpdateProps`), never
  per frame.
- **Native owns timing, resources, interruption, and cleanup.** The clock is a display link, a
  Core Animation spring, a gesture recognizer, or a SwiftUI timeline — always native.
- **JS receives semantic events and one-shot snapshots.** Completion (carrying whether it
  finished or was interrupted), press boundaries, load, and error are the back-channel; a
  `snapshot()` async read exists on every view. Never a frame stream.
- **No per-frame bridge traffic, and no JSI / C++ / HybridObject.** The boundary is pure Expo
  Modules. There is no native C/C++ in the library's JS↔native path.

The contract is the same for effects and for content motion. What differs between them is **what
fx owns** — and collapsing that difference into one boundary is exactly what would make rule #4
(never sample or host RN content to distort it) go fuzzy. One contract, several boundaries.

## Three axes

A capability is classified on three independent axes. Conflating them is the most common sorting
error.

### Axis 1 — boundary (what fx owns)

| boundary | fx owns | RN still owns | retention handshake | layout |
|---|---|---|---|---|
| **A — content motion** | the wrapper's internal frame/transform/opacity inside an RN-laid-out box | the content and its layout | yes — fx may defer React's unmount | reads only |
| **B — effect** | generated or native pixels | everything; content is never sampled or hosted to distort | no | reads cornerRadius / neither |
| **L — layout participation** | a size/measurement contributed into Yoga/Fabric | the content | (depends) | **writes** |

Boundaries are **capabilities a view performs, not a taxonomy of views.** One native view can
straddle several: `FxSurfaceView` is a single view that does both A (a Fabric-invisible content
container animated above layout) and B (a Metal effect drawn over it), kept clean by routing RN
children into the invisible container and letting `hitTest` pass their touches straight through.

### Axis 2 — source channel (what drives the target)

| channel | meaning | accepted? |
|---|---|---|
| **discrete target** | JS sets a semantic target; native runs the envelope (`visible`, `preset`, effect id) | yes — the default |
| **native continuous source** | a native signal drives the value continuously (scroll position, gesture, sensor, audio, time), with the clock still native | yes — no per-frame JS crosses |
| **external UI-thread prop drive** | the app's own Reanimated shared value updates an fx-exposed UI-thread-animatable prop/uniform; fx owns no worklet/JSI (Reanimated is the caller's transport) | yes — depth 1, the Expo Modules prop path; no per-frame JS crosses (DEF-006) |
| **fx-authored continuous mapping** | fx authors or depends on a worklet / JSI / host-object to map a source per frame | **no** by default — depth 4, breaks rule #7; gated regime C only if it must drive fx-owned state no preset can express (see escalation regimes) |
| **per-frame bridge values** | JS computes and sends a value across the bridge every frame | **no** — violates rules #1/#8 |

Axis 2 is orthogonal to Axis 1. A scroll-linked header is Boundary A driven by a *native
continuous source*; it writes no layout and crosses no per-frame JS, so it fits the contract. It
becomes Boundary L only if it must resize something into Yoga — which is about layout, not about
the source being continuous. Keeping these axes separate stops continuous-source capabilities
from being mis-filed as boundary moves.

### Axis 3 — substrate depth (how fx binds to native)

| depth | binding mechanism | rule cost |
|---|---|---|
| **1 — Expo Modules view** | the current Swift/Kotlin Expo Modules path: props in, events out, async functions — including a **UI-thread-animatable prop the app's Reanimated drives off the JS thread** (DEF-006) | none — the default |
| **2 — component-view shim** | ObjC++/Kotlin against RN internals (e.g. a Fabric `updateLayoutMetrics` override) | a substrate escalation beyond the Expo Modules Swift/Kotlin path; does **not** move a boundary |
| **3 — custom Fabric component** | a real `ShadowNode` + `ComponentDescriptor` with a Yoga measure function (C++) | breaks rule #7 (C++); the **only** path that can write layout (Boundary L) |
| **4 — JSI / worklets** | **fx-authored or fx-depended** synchronous JS↔native calls, worklets, or host-objects driving frames | breaks rule #7 (JSI); rejected by default. The app's own Reanimated updating an fx-exposed UI-thread-animatable **prop** is **depth 1**, not depth 4 — fx owns no worklet/JSI (DEF-006). The discriminator is **ownership**: who authors the worklet. |

Depth is independent of boundary. A capability can escalate substrate depth without moving a
boundary: a Fabric-pushed layout read (depth 2) stays a Boundary-A *read* — it does not write
layout, so it is a robustness optimization, not a rule #9 move. Measured-content flow does both —
depth 3 *and* Boundary L. JSI/Nitro (depth 4) moves neither boundary by itself, and `0-spine/05`
verified it cannot host RN children, so it is **never** the path to layout participation; that is
depth 3. Keeping depth separate from boundary stops "we need C++" and "we move rule #9" from being
treated as one decision when they are two.

## The boundaries

### Boundary A — content motion

RN owns content and layout. fx owns the presentation wrapper's state, may defer unmount through
a retention handshake, and animates transform/opacity (and, inside a reserved box, frame) above
Yoga. The machinery already exists and is reusable: the presence state machine (defer unmount,
freeze a snapshot, release on the native completion event, guard against a stranded exit), a
Fabric-invisible intermediate container as the animation target, and the native animation driver
that runs the spring.

Examples: `FxPresence`; the content-motion half of `FxSurfaceView`; reserved-size `FxFlow`/group
slots (see the flow draft).

### Boundary B — effect

fx owns generated or native pixels and never samples or hosts RN content to distort it (rule #4,
structurally enforced — the iOS surface is full-screen generative and sits above RN content; on
Android the shader view is `PointerEvents.NONE`). There is no content retention handshake.

Examples: shaders, glass/material, symbols, fills, EdgeGlow, and the effect half of
`FxSurfaceView`.

### Boundary L — layout participation

Named **L**, not C, to avoid colliding with the pre-existing *regime C* term (`0-spine/05`'s
continuous-motion escape hatch, used below for the authored-mapping lane).

fx contributes a size or measurement into Yoga/Fabric. This is the one boundary no shipped
primitive crosses today: every primitive reads layout or neither, and none writes it. Crossing it
moves rule #9 and triggers `0-spine/05` scrutiny, possibly a custom shadow node.

Example: measured-content `FxFlow` (siblings *outside* the container move because its content
height changed).

### Unsorted frontier — cross-tree

Some capabilities do not sort into A, B, or L as written. A shared-element transition needs
endpoint discovery across the React tree, retention of a view as it conceptually moves between
tree locations, and possibly mutation coordination — the Reanimated-shaped territory the flow
draft fences off. The classifier's job here is to refuse to mis-file it: it is a candidate **new
boundary**, gated by its own `0-spine/05` decision, not a stretched L.

## The sorting rule

```txt
Does it retain or move RN content?                  -> Boundary A
Does it draw native/generated pixels without
  owning or sampling RN content?                    -> Boundary B
Does it need to write Yoga layout or rewrite
  Fabric mutations?                                 -> Boundary L (moves rule #9; 0-spine/05)
Does it need user-authored per-frame mapping
  of fx-owned state?                                -> gated regime C (depth 4; see escalation regimes)
Does it need cross-tree identity + retention?       -> unsorted; candidate new boundary
```

Then, independently, pick the source channel: discrete target, native continuous source, or —
gated — authored continuous mapping. Per-frame *bridge* values are not a channel; they are a
rejection (an authored worklet on the UI thread is regime C, not a bridge frame).

## Crossing a boundary — the escalation regimes

The sorting rule says whether a capability is additive or a boundary move. For the moves, this
section says *which* escalation it is — because they are not one rule-break, they are three, each
touching a different rule with a different trigger. `0-spine/05` is the gate for all three; this
only classifies them so the gate is applied to the right one.

| escalation | boundary | source | substrate depth | rule touched | trigger |
|---|---|---|---|---|---|
| **measured-content flow** | A → L (writes layout) | discrete | 3 — custom Fabric component | #9 + #7 | outside siblings must move via Yoga size |
| **pushed-layout read** | stays A (read) | unchanged | 2 — component-view shim | none of #9 / JSI; substrate only | observation lag / robustness — an optimization, not a product gate |
| **authored continuous (regime C)** | usually none | native → authored | 4 — JSI / worklets | #7 + #1/#8 | native presets cannot express the mapping *and* it must drive fx-owned state |

The product gate is the first row; the second is an optimization investigation, not a break to
spend the project on; the third is the named exception `0-spine/05` decision #5 already reserved.

### Two lanes for continuous interaction

Most "live" interactions — gesture progress → transition progress, scroll offset → header/slot
transform, drag distance → reveal — split into two lanes, and the line between them is exactly the
falsifying test below.

**Lane 1 — native continuous source (additive, depth 1, no rule-break).** A native source
(scroll, gesture, sensor) drives a native mapping/preset on a native clock. No JSI, no per-frame
bridge. This is the lane to build first, and it covers an interaction as long as a *native preset*
can express the mapping. So Lane 1's real design problem is **preset expressiveness**: a native
mapping vocabulary (range-map, clamp, curve, spring-to) rich enough to keep Lane 2 empty as long
as possible. Every interaction a preset can express never needs the rule-break.

**Lane 2 — authored continuous source (gated regime C, depth 4).** The user authors the mapping
(a worklet / shared value) and it runs on the UI thread:

```tsx
<FxMotion source={gesture} map={worklet((x) => ({ progress: clamp(x / width, 0, 1) }))} />
```

Lane 2 is narrower than "user-authored mapping," on two counts. First, it earns itself only when
**native presets cannot express the interaction** (the falsifying test). Second, it earns itself
only when the authored mapping must drive **state only fx owns** — a retained exiting slot's
frame, the Fabric-invisible layer — because authored continuous mapping of the *content's own
visuals* is already solved by composition: nest Reanimated inside your content and let fx own the
boundary (the flow draft's `<FxPresence><Animated.View /></FxPresence>` rule). A Lane 2 that
merely re-drives content visuals would be rebuilding Reanimated, which `0-spine/05` explicitly
forbids. So the gate is doubly narrow: authored mapping, of fx-owned state, that no preset can
express.

**Not Lane 2: the external UI-thread prop drive (DEF-006).** When the *app's own* Reanimated drives
an fx-exposed UI-thread-animatable prop/uniform, fx authors no worklet and takes no JSI — Reanimated
is the caller's transport, not fx's runtime. That is **depth 1** (the Expo Modules prop path),
allowed by default, and does **not** pass through the Lane 2 / regime-C gate. Lane 2 is only fx
*authoring or depending on* a worklet/JSI integration (the `<FxMotion map={worklet}>` shape above).
The discriminator is **ownership**: who authors the worklet.

### The falsifying test (the regime-C gate)

Before opening Lane 2 / regime C, the interaction must fail this — concretely:

> Can it be built with discrete targets + native source events + native presets + no per-frame JS?

- **Yes** → no regime C. Build it in Lane 1; if a preset is missing, the work is *extending the
  preset vocabulary*, not breaking a rule.
- **No, and the mapping must be user-authored per frame against fx-owned state** → regime C is
  justified, and the rule-break is depth-4 (JSI/worklets), not Nitro for its own sake.

This is question 9 of the classifier made specific: a regime-C proposal with no interaction that
genuinely fails this test is breaking a rule for nothing.

## Bottom-up classification of shipped and provisioned primitives

Derived by reading the source, so the schema reflects what *is*, not what is hoped for.

| primitive | boundary | source | owns | retains RN content | writes layout |
|---|---|---|---|---|---|
| shader (`FxShaderView`, surface Metal) | B | native continuous (time) | GPU surface, render loop, uniforms | no | no |
| glass / material | B | discrete | native effect surface | no | no |
| symbol | B | discrete | hosted native symbol/effect state | no | no |
| fill | B | discrete | generated gradient | no | no |
| EdgeGlow | B | native continuous (time) | generated effect | no | no |
| `FxPresence` | A | discrete (`visible`) | wrapper motion + retention handshake | yes (RN-owned content, deferred unmount) | no (reads measured edge) |
| `FxSurfaceView` | A + B straddle | discrete + native continuous | content container (A) and Metal surface (B), decoupled | yes (A half) | no |
| `FxGroupView` | A + B straddle (candidate) | — | empty stub; events declared, nothing fires; TODO reserved it for compound material (B); flow would add multi-child motion (A) | not yet | no |
| measured-content `FxFlow` | L (candidate) | discrete | a content-derived size reported to Yoga | yes | **yes** |

Two facts fall out of the table. L is empirically absent — the rule #9 fence is real and
measurable, not theoretical. And `FxGroupView` is a genuine empty shell: claiming it as the
native home for flow is a *repurpose* from its compound-material origin into the multi-child A+B
straddle, mirroring `FxSurfaceView`'s single-child straddle.

## The capability descriptor

A classification lens, not a code interface. It stays descriptive — a schema for sorting and
review — until two shipped capabilities prove they need a shared base class. Building
`FxCapabilityAdapter` as real code before then is the "generic native animation adapter" this
note exists to avoid.

```txt
capability
  boundary:          content-motion | effect | layout-participation | (new)
  target:            content | effect | group-slot | flow-size | interaction
  substrate:         expo-view | hosted
  sourceChannel:     discrete-target | native-continuous-source   (per-frame-JS rejected)
  ownsNativeResource: yes | no
  retainsRNContent:  yes | no
  writesYogaLayout:  yes | no
  samplesRNContent:  never (forbidden for RN content on iOS)
  clockOwner:        native
  events:            semantic
  memoryPolicy:      (declared, not an afterthought — see below)
```

The memory policy is part of the descriptor, because retention is where this family leaks:

```txt
memoryPolicy
  retainsSubtree:       does fx hold an RN subtree alive past React's unmount?
  maxRetainedCount:     budget on concurrently retained subtrees
  maxRetainedDuration:  hard cap on how long a retained exit may live
  usesSnapshot:         does it freeze a snapshot while retained?
  gpuSurfaceLifecycle:  when is the GPU surface allocated / paused / released?
  backgroundBehavior:   what happens off-window or backgrounded (clocks pause)
  cleanupTriggers:      what forces release (completion, parent unmount, reduce motion)
```

## Top-down stress cases

Run against the derived contract to find where it is too narrow.

| candidate | boundary | source | fits? |
|---|---|---|---|
| native press feedback | A if it animates a content wrapper; B if it draws a ripple/glow overlay | discrete / native source | fits |
| scroll-linked header collapse | A | native continuous source | fits — unless it must resize into Yoga, then L; does not fit if JS sends scroll per frame |
| shared-element transition | candidate new boundary (cross-tree) | — | does not fit as written; needs endpoint discovery, retention, maybe mutation coordination |
| measured-content disclosure | L | discrete | moves rule #9 — outside siblings move via Yoga size |
| sensor / time / audio material | B | native continuous source | fits — self-contained native effect, no RN content ownership |

The shared-element case is the one that strains the model, and that is the point: the classifier
names it as an open boundary decision rather than pretending it is an L.

## The nine-question classifier

Every future idea answers these before it earns a build slot:

1. Which boundary — A, B, L, or a candidate new one?
2. What native resource does fx own?
3. What does React still own?
4. Does this retain RN content? Under what memory policy?
5. Does this write layout?
6. Does this sample RN pixels? (Must be never, for RN content on iOS.)
7. What crosses JS↔native, and on which source channel?
8. What memory policy applies — retention budget, duration cap, cleanup triggers, background
   behavior?
9. What device proof would falsify the classification?

Question 9 is what keeps this honest: a classification with no falsifying device scenario is a
guess, not a decision.

## What this is and is not

This is an architecture tool, not a roadmap. It does not say which capability to build next; it
says, for any capability, whether building it is additive or a boundary move, and what evidence
would prove the sort wrong. A capability that sorts into A or B with a declared memory policy and
a falsifying device scenario is a candidate for the normal build plan. One that sorts into C, or
into the cross-tree frontier, needs an `0-spine/05` decision first.

## Sources

- `research/wip/native-slot-layout-transitions.md` — the flow draft; reserved-size flow is the
  Boundary-A case, measured-content flow the Boundary-L case this classifier formalizes.
- `0-spine/04-state-ownership-and-boundaries.md` — the ownership spine the boundaries refine.
- `0-spine/05-native-boundary-decision.md` — the gate any Boundary-L or new-boundary capability
  must pass.
- `packages/src/surface/presenceMachine.ts` and `surface/FxPresence.tsx` — the Boundary-A
  retention handshake: defer unmount, freeze snapshot, release on completion, stranded-exit
  guard.
- `packages/ios/FxSurfaceView.swift` — the A+B straddle: the Fabric-invisible
  `intermediateContainer`, the animation driver target, and the `hitTest` that passes RN child
  touches through.
- `packages/ios/FxAnimationDriver.swift` and `FxPresenceCoordinator.swift` — the native clock and
  the enter/exit FSM that emits the single completion event.
- `packages/ios/FxHostedView.swift`, `FxShaderView.swift`, `FxGlassSurfaceView.swift`,
  `FxSymbolView.swift` — the Boundary-B family: generative, never sampling RN content.
- `packages/ios/FxModule.swift` — the Expo Modules boundary: `Prop` targets in, `Events` out, the
  `snapshot()` async read, no JSI/C++.
- `packages/ios/FxGroupView.swift` — the empty stub and its compound-material TODO.
- `packages/android/src/main/java/expo/modules/reactnativefx/FxSurfaceShaderView.kt` — Android `PointerEvents.NONE` on the decorative
  shader view.
