# Native slot layout transitions — exploration

Status: open — WIP, non-authoritative
Phase: post-v2 / v3 exploration
Feeds: `0-spine/05-native-boundary-decision.md`, `4-runtime/33-shadow-nodes-and-layout.md`, `4-runtime/35-view-state.md`, `5-realization/structure.{ios,android}.md`
Scope: explore whether react-native-fx can use platform-native transition APIs for layout-continuity use cases without copying Reanimated's full Fabric mutation proxy or becoming a second layout engine.

> **Reconciliation note (supersedes earlier naming in this draft).** The identity question is
> resolved and the boundary/escalation vocabulary now lives in canon —
> `0-spine/04 §The presentation boundaries (A / B / L)` and `0-spine/05 §Capability mechanism`
> (the historical [`capability-boundary-classifier.md`](./capability-boundary-classifier.md)
> derived it). Read the draft below through these corrections:
>
> - **`FxPresence`** owns a single subtree's lifecycle. The `Fx.Transition` name used below is
>   **dropped** — a single-slot transition *is* `FxPresence` (and `FxTransition` is already a
>   shipped type). The `Fx.Flow` / `Fx.FlowSlot` alternate spelling is also dropped; the public
>   surface is `FxFlow` / `FxFlow.Slot`.
> - **`FxGroupView`** is the multi-child native substrate — an A+B straddle, mirroring how
>   `FxSurfaceView` is the single-child A+B straddle. **`FxFlow` is not a new native substrate**;
>   it is a flow *policy / coordinator* realized over `FxGroupView`. Wherever this draft says
>   `FxFlowView` or `FxFlowSlotView`, read "`FxGroupView` carrying a flow policy" and "the existing
>   presence/surface wrapper parented under `FxGroupView`" — not new classes.
> - **Reserved-size flow is a mechanics proving ground (depth-1 Boundary A), not the headline
>   product.** Measured-content flow is the headline gate (depth-3 **Boundary L** — it writes a
>   size into Yoga); only it requires a custom Fabric component, and Nitro cannot provide it.
> - A slot's enter / exit / retention **reuses the presence machine** (`presenceMachine.ts`); the
>   group adds only the cross-slot frame coordination (the FLIP step).

## Why this matters

V2 `FxPresence` and `FxView` animate presentation above layout: transform, opacity, effects, and native motion envelopes on an fx-owned wrapper. That keeps the current rule intact: Yoga owns layout, and fx reads layout without writing it.

Some real app transitions need more. A banner appears, and content below should move down smoothly. A disclosure opens, and siblings should flow with it. A list of actions appears one by one from top to bottom. Pure transform animation can make the entering view feel native, but it cannot make siblings move as part of flow layout unless something coordinates the old and new layout states.

This note holds the undecided fork. The goal is not to become Reanimated. The goal is to find a narrower way for platform-native transition APIs to cooperate with React Native layout.

## The problem statement

The desired behavior is:

```tsx
<FxFlow axis="vertical" preset="native">
  <FxFlow.Slot id="banner" visible={showBanner}>
    <Banner />
  </FxFlow.Slot>

  <FxFlow.Slot id="content">
    <Content />
  </FxFlow.Slot>
</FxFlow>
```

When `showBanner` changes, native should animate the visible slot frames so `content` moves up or down smoothly. JS sends the discrete target. JS does not drive frames.

The hard part is not the animation curve. The hard part is ownership:

- Yoga decides the correct final layout.
- React decides what exists.
- Native platform APIs can animate views well when they own a container.
- Fabric can clobber transforms and removals if fx animates the wrong view or reacts too late.

## Prior-art reality check

Reanimated's layout-animation path uses a deep Fabric integration. In the local reference, `LayoutAnimationsProxy_Experimental` implements `MountingOverrideDelegate`, overrides `pullTransaction`, walks Fabric `ShadowViewMutation` lists, keeps a light tree, starts entering/layout/exiting animations, and can rewrite mounting transactions.

That architecture exists for good reasons:

- It sees old and new `layoutMetrics` at the point where React Native still knows the relationship.
- It can delay or rewrite removal so exiting views stay alive.
- It can update `ShadowView` layout metrics and props as animation progress changes.
- It supports arbitrary worklet-driven layout animation semantics.

react-native-fx should not copy that whole stack unless a narrower model fails. Reanimated's problem is general animation. fx's potential problem is smaller: native presentation continuity for explicit layout slots.

## React Native path findings

The viable architecture has to start from React Native's actual order of operations:

```txt
React render
  -> ShadowTree commit
  -> commit hooks may alter the shadow tree
  -> Yoga layout runs
  -> ShadowViewMutation diff is produced
  -> optional MountingOverrideDelegate may rewrite mutations
  -> platform mounting applies Create/Insert/Update/Remove/Delete
  -> native view props and layout apply on the UI/main thread
```

The important timing detail is that commit hooks run before Yoga layout, then `layoutIfNeeded`
computes frames, then the mounting coordinator diffs old and new revisions into native
mutations. So a native view cannot measure itself after mount and still influence the same Yoga
pass through Expo Modules. If `FxFlow` must report content-derived size to Yoga, that is a
measure/shadow-node problem, not a native animation problem.

The mutation rewrite point is explicit. `MountingCoordinator::pullTransaction()` creates a
`ShadowViewMutation` list and then lets `MountingOverrideDelegate` replace or edit the
transaction. This is the Reanimated-shaped escape hatch. It is powerful because it sees
`Create`/`Insert`/`Update`/`Remove`/`Delete`, can keep deleted views alive, and can emit
additional `Update` mutations. It is also the line fx should not cross for the first `FxFlow`
unless the slot-island model fails a product-critical case.

React Native view props make the clobber risk concrete. `opacity`, `transform`,
`pointerEvents`, `collapsable`, and clipping are Fabric-tracked view props. On iOS,
`RCTViewComponentView` applies opacity to `layer.opacity` and transform to
`layer.transform`. On Android, Fabric prop updates flow through the `ViewManager`, where
opacity calls `setAlpha()` and transform decomposes into translation, rotation, and scale.
Any fx animation that writes those properties on a Fabric-tracked view can be overwritten by a
later React Native commit. `FxFlow` therefore needs native-owned slot wrappers as the animation
targets.

Platform layout application reinforces the same boundary. iOS applies layout by setting
`center` and `bounds`, not `frame`, because changing `frame` while a layer transform is active
is undefined. Android's Fabric mounting layer measures with exact specs, then calls
`layout(x, y, x + width, y + height)` unless the parent manager owns custom child layout.
`FxFlow` should let Fabric/Yoga assign only the outer flow box, then lay out and animate its
own slot wrappers inside that box.

Child mounting is strict. iOS `RCTViewComponentView` asserts that a mounted child has no
existing superview, and unmount asserts the child sits under the expected container at the
expected index. Android `SurfaceMountingManager` inserts and removes through
`IViewGroupManager.addView`, `getChildAt`, and `removeViewAt`; bad child-count or child-index
proxies produce hard-to-debug crashes. A future `FxGroupView` carrying a flow policy must either
follow the proven Expo/RN child-routing pattern exactly or use a custom manager seam that keeps
these invariants true.

Hit testing also matters for performance and correctness. Android `TouchTargetHelper` consults
`ReactPointerEventsView` on any view. This lets fx mark decorative/internal children as
`NONE` and pass-through containers as `BOX_NONE`. iOS needs the equivalent explicit `hitTest`
filter for bare internal surfaces. `FxFlow` should not let non-content implementation views
become touch targets.

## Candidate A: Fabric-aware layout observer

This is the most powerful path.

```txt
React commit
Yoga computes frames
Fabric creates mutations
fx layout proxy reads old/new ShadowViews
fx delays/remaps selected mutations
platform animator or fx driver plays visual transition
final committed layout remains truth
```

Benefits:

- Handles arbitrary insert, remove, and reorder more robustly.
- Sees old/new frames before the native tree loses context.
- Can keep exiting views alive even when React deletes them.
- Can avoid wrapper ceremony in some cases.

Costs:

- Likely requires C++/Fabric participation, which crosses the current Expo Modules-only default.
- Risks becoming a Reanimated-shaped subsystem.
- Carries RN minor-version compatibility risk.
- Needs a surface-wide or subtree light tree.
- Must reason about screens, portals, nested groups, removal order, view flattening, and mutation rewriting.

This path is only justified if explicit slot containers cannot meet the intended product use cases.

## Candidate B: native slot container

This is the narrower path.

```txt
Yoga owns layout outside FxFlow.
FxFlow owns slot choreography inside itself.
Each slot is one native wrapper with opaque RN content.
Native platform APIs animate slot frames.
```

The public model is explicit:

```tsx
<FxFlow axis="vertical" preset="native">
  <FxFlow.Slot id="banner" visible={showBanner}>
    <Banner />
  </FxFlow.Slot>
  <FxFlow.Slot id="content">
    <Content />
  </FxFlow.Slot>
</FxFlow>
```

`FxFlow.Slot` is a native-backed wrapper. The `visible` prop belongs to the slot, not the child, because native needs a stable object to retain, measure, animate, and remove. If React conditionally deletes the slot itself, fx cannot run an exit without a Fabric removal proxy.

Benefits:

- Avoids observing arbitrary Fabric mutations globally.
- Gives platform APIs a clean native container to own.
- Keeps user content opaque inside each slot.
- Enforces identity with `id`.
- Makes edge cases explicit instead of pretending arbitrary children work.

Costs:

- Adds one native wrapper per slot.
- Does not transparently animate arbitrary RN layout.
- Needs a clear answer for the outer container's measured size.
- Needs strict child validation so users cannot put random direct children in the group.
- May still need a custom shadow node or deeper Fabric integration if `FxFlow` must participate in Yoga sizing based on animated slot content.

## Working direction

Treat `FxFlow` as a new, explicit native island. Do not start from arbitrary layout animation.

The first product should be:

- `FxFlow` owns a bounded set of direct slots.
- `FxFlow.Slot` owns visibility, identity, retention, and its own enter/exit state.
- Yoga owns the `FxFlow` box in the parent layout.
- Native owns only the slot frames inside that box.
- The first shipping model reserves or receives its outer size from the app.

This gives fx a real layout-continuity primitive without crossing the line into a Fabric mutation proxy. It also creates useful pressure tests. If this model cannot host RN children, preserve slot identity, animate sibling slot frames, or cleanly release retained exits, then the problem is concrete enough to justify revisiting `0-spine/05`.

The wrong first step is a general "animate layout changes" API. That API needs old and new `ShadowViewMutation` lists, deletion deferral, a light tree, and mutation rewriting. Reanimated proves that shape. It also proves the cost. fx should only take that path if the explicit island fails a product-critical case.

## Product shape

The surface should make the ownership tradeoff obvious:

```tsx
<FxFlow axis="vertical" preset="native" style={{ height: 320 }}>
  <FxFlow.Slot id="banner" visible={showBanner}>
    <Banner />
  </FxFlow.Slot>

  <FxFlow.Slot id="content">
    <Content />
  </FxFlow.Slot>
</FxFlow>
```

`FxFlow` is not a drop-in replacement for `View`. It is a choreography container. Direct children are slots because native needs stable objects to measure, retain, hide, and release. A plain child is a bug, not an implicit slot.

The V1 surface for the idea should stay small:

| prop | first meaning |
|---|---|
| `axis` | `vertical` first; `horizontal` only after the vertical model works |
| `preset` | platform-native defaults; no cross-platform uniform curve unless explicitly overridden |
| `style` | required or effectively required in the reserved-size prototype |
| `Slot.id` | stable slot identity; required |
| `Slot.visible` | discrete target; default `true` |
| `Slot.placement` | optional later: `normal`, `overlay`, or `pinned` if needed |

Do not expose platform API names. `TransitionManager`, `LayoutTransition`, `UIViewPropertyAnimator`, and springs are realization choices under the manifest, not public vocabulary.

## Developer mental model

fx belongs at transition boundaries. App-owned animation stays inside the component.

Developers already use `Animated.View`, Reanimated, and UI-kit components inside their own
components. `FxFlow` should not ask them to replace that local animation layer. The clean
composition is:

```tsx
<FxPresence visible={showCard} preset="native">
  <Card />
</FxPresence>
```

```tsx
function Card() {
  return (
    <Animated.View style={cardAnimatedStyle}>
      <CardContent />
    </Animated.View>
  );
}
```

The native ownership is layered:

```txt
FxPresence          fx owns enter/exit/layout movement
  Animated.View     the app owns local visual animation
    CardContent
```

For flow:

```tsx
<FxFlow transition="nativeDisclosure">
  <FxFlow.Slot id="summary">
    <Summary />
  </FxFlow.Slot>

  <FxFlow.Slot id="details" visible={expanded}>
    <Details />
  </FxFlow.Slot>
</FxFlow>
```

`Details` may still contain `Animated.View` internally. The slot controls where the details
block lives in the transition; the component controls its own local visuals.

The rule is strict:

```txt
Do not put fx and Animated/Reanimated on the same native view.
Nest them so each layer owns different native properties.
```

Usually this means:

```tsx
<FxPresence>
  <Animated.View />
</FxPresence>
```

not:

```tsx
<Animated.View>
  <FxPresence />
</Animated.View>
```

Transition owns lifecycle, layout boundary, retention, interruption, cleanup, and completion
events. Local animation owns the visuals of the component after it exists. If a child
`Animated.View` changes the layout size of the whole slot, fx treats that as a discrete slot
retarget unless a future measured-content flow backend owns that transition explicitly.

## Full viable flow

The first viable `FxFlow` is a reserved-size native slot island:

```txt
React/JS
  declares stable slots and discrete targets

Yoga/Fabric
  lays out only the outer FxFlow box

Native FxGroupView (carrying the flow policy)
  owns slot registry, slot measurement, retention, and animation

Native slot wrappers (reused presence/surface wrappers)
  host RN content and animate transform/opacity

React/JS
  receives semantic completion/cancel events
```

The native tree shape should be:

```txt
FxGroupView                Fabric/Yoga-owned outer box (multi-child A+B straddle)
  slot wrapper banner      reused presence/surface wrapper — native-owned animation target
    RN content subtree     React-owned content
  slot wrapper content     reused presence/surface wrapper — native-owned animation target
    RN content subtree     React-owned content
```

When a slot target changes, the runtime follows a FLIP-like native sequence:

```txt
First:  read old slot frame
Last:   compute final slot frame inside FxFlow
Invert: set final layout, apply transform from old frame to final frame
Play:   animate transform/opacity back to identity
```

JS sends only slot targets such as `visible`. Native computes frames, writes transforms, runs
the platform clock, and emits semantic completion events. React continues to own the slot
content. Yoga continues to own the outer `FxFlow` box.

The first implementation should not move siblings outside `FxFlow`. This works:

```txt
inside FxFlow:
banner enters
content moves down smoothly
```

This stays deferred:

```txt
outside FxFlow:
a sibling below FxFlow moves down because FxFlow's height changed
```

That second case is measured-content flow. It requires a separate proof because Yoga needs the
new outer size before platform mounting.

## The sizing fork

The native slot container has one unresolved core issue: how the outer `FxFlow` participates in parent layout.

### Reserved-size model

The app gives `FxFlow` a size through style or placement.

```tsx
<FxFlow style={{ height: 320 }} />
```

This is easy to ship and lets native own animation inside the reserved box. It does not solve true flow layout where siblings outside `FxFlow` move when its content height changes.

### Measured-content model

`FxFlow` computes its slot stack height and reports that size to Yoga.

This is the real flow-layout version. It may need a custom Fabric component or shadow-node path, because Yoga wants size during layout calculation. If this requires C++, the reason is specific: the native container needs to participate in layout measurement, not because JS needs to drive frames.

### Recommended sequencing

Do not mix these models in the first spike.

Build the reserved-size model first. It proves the child-hosting, slot-retention, platform-animation, accessibility, and cleanup mechanics with no custom shadow-node obligation. It also gives product value for common bounded areas: drawers inside a panel, action stacks, disclosure content inside a card body, anchored menus, and overlay-like groups.

Then run a separate measured-content spike. That spike should answer only one question: can `FxFlow` report a content-derived size to Yoga without a forbidden Fabric hook? If the answer is no, the measured-content model becomes the precise trigger for a raw Fabric component or a deferred V3 lane. The reserved-size product can still ship.

The key distinction:

- Reserved-size `FxFlow` animates layout continuity inside an already-laid-out box.
- Measured-content `FxFlow` changes the box size that Yoga uses to lay out siblings outside the box.

Only the second one challenges rule #9.

## Implementation attack plan

### Phase 1: prove the slot island

Build the flow policy over a private multi-child `FxGroupView` substrate — not a new `FxFlow`
view class — reusing the presence/surface wrapper per slot, on the `expo-view` substrate.

The prototype accepts exactly two vertical slots. Each slot is a native-backed wrapper that hosts one opaque RN child subtree. Slot frames are computed inside native from slot measured sizes and visibility targets. When one slot exits, native retains the slot wrapper until the exit completes, then releases it through the same JS-retention handshake shape as `FxPresence`.

Proof target:

- toggling one slot moves the other slot inside the flow container;
- JS sends only `visible`;
- native emits one semantic completion event;
- no per-frame JS, no `onLayout` round trip, no mutation interception.

### Phase 2: prove interruption and cleanup

Add the lifecycle cases before broadening the API:

- visible `true → false → true` retargets from the current presentation state;
- visible `false → true → false` does the same in the opposite direction;
- parent unmount cancels and releases every retained slot;
- backgrounding pauses clocks and resumes without leaking;
- reduce motion jumps to the final slot arrangement.

This is where `35-view-state.md` applies. A slot is not allowed to become a native-owned React subtree. React still owns mounted content; fx only retains through an explicit coordinator while a live `FxFlow` exists.

### Phase 3: prove platform layout backends

Prefer explicit property animation over platform layout systems at first.

On iOS, compute target `CGRect`s inside `FxGroupView` (carrying the flow policy), set final native layout, and animate each slot's transform and opacity from old frame to new frame with platform-native defaults. Do not use SwiftUI for RN child content.

On Android, compute target `Rect`s inside a custom `ViewGroup`, lay children to their final positions, and animate translation and alpha with `ViewPropertyAnimator` or `SpringAnimation`. Treat `TransitionManager` and `LayoutTransition` as experiments, not defaults, until device proof shows they behave predictably with RN-hosted children.

This mirrors the existing content-motion strategy: Fabric owns the tracked outer view, and fx animates views it owns. The difference is that `FxFlow` owns several slot wrappers instead of one intermediate content container.

### Phase 4: harden API constraints

Only after the two-slot proof works:

- support more than two slots;
- validate direct children in development;
- enforce stable `id`;
- define duplicate-id behavior;
- define order changes as either unsupported or explicit reorder transitions;
- set a default slot-count warning budget;
- document virtualized lists as one heavy opaque slot;
- reject nested `FxFlow` until device proof says otherwise.

Do not add stagger, per-child selectors, arbitrary descendants, or reorder-by-key in the first product. Each of those moves the feature toward Reanimated's general layout problem.

### Phase 5: measured-content spike

Run this as its own ratification task after the reserved-size island works.

Questions:

- Can `FxFlow` measure direct flow slot wrapper content and report a native-derived intrinsic size through Expo Modules alone?
- Does that size reach Yoga early enough to move siblings outside `FxFlow` in the same React layout pass?
- If the size changes during an exit, does the parent layout jump, reserve the exiting size, or animate a staged size?
- Does the answer differ between iOS and Android?

If this requires a custom shadow node, record the exact reason: `FxFlow` needs a measure function or layout state that Yoga consumes. Do not phrase it as a performance need or a synchronous JS need.

## Kill criteria for the narrow path

Switch away from the native slot container only if one of these fails:

- Expo Modules cannot host direct slot children with stable native identity.
- `FxFlow` cannot retain an exiting slot without leaking or seizing React ownership.
- Fabric commits clobber the slot transforms even though fx animates its own slot wrappers.
- Android or iOS cannot produce reliable child layout inside the custom container.
- Accessibility order or focus cannot be made coherent during retained exits.
- Measured-content sizing is a must-have for the product, and it cannot be solved without Yoga/Fabric participation.

If only measured-content sizing fails, keep the reserved-size product alive and defer measured flow. That failure does not invalidate `FxFlow` as a bounded choreography primitive.

## What not to build first

- No arbitrary sibling animation outside `FxFlow`.
- No global Fabric mutation listener.
- No per-frame JS, worklets, or shared values.
- No platform-named public props.
- No snapshot exits by default.
- No automatic wrapping of random direct children.
- No list reorder animation.
- No navigation transition primitive.
- No "animate height to auto" promise until measured-content sizing is proven.

## Memory and performance reality check

A slot container does not eliminate memory cost. It moves cost from global Fabric machinery to explicit bounded containers.

Expected per-container cost:

- one native `FxGroupView` (carrying the flow policy)
- one flow slot wrapper per slot
- per-slot id, visibility, current frame, target frame, measured size, and animation state
- per-slot animator objects
- retained exiting slots until exit completes

Largest risk: exit retention of heavy subtrees. A hidden slot containing a map, video, chart, or virtualized list can stay alive during exit. That is acceptable for a short transition only if cleanup is strict.

Initial constraints should be hard API rules, not documentation-only guidance:

- direct children must be `FxFlow.Slot`
- every slot requires a stable `id`
- slot count has a development-time budget
- virtualized lists count as one opaque slot
- nested `FxFlow` is unsupported at first
- no snapshot exits by default
- native animates transform and opacity first
- reduce motion collapses to one committed state
- parent unmount cancels and releases every retained slot

## Platform API role

Platform APIs are the animation backend, not the global layout authority.

iOS candidates:

- `UIViewPropertyAnimator`
- Core Animation transform and opacity
- native container layout plus `layoutIfNeeded` only inside a native-owned slot island

Android candidates:

- `ViewPropertyAnimator`
- `SpringAnimation` / DynamicAnimation
- custom `ViewGroup` layout and property animation
- `TransitionManager` or `LayoutTransition` only if device proof shows they behave predictably inside RN-hosted content

SwiftUI and Jetpack Compose transitions are not the default for arbitrary RN children. They apply cleanly only when fx owns the native subtree.

## Product boundary

Do not promise arbitrary layout animation.

Promise slot choreography:

> `FxFlow` animates a small, explicit set of native slots. Yoga owns the app layout outside the container. Slot content remains ordinary React Native content.

This keeps react-native-fx aligned with its identity as a presentation runtime. It does not become a UI kit, a second Yoga, or a Reanimated clone.

## Prototype sequence

1. Ratify the reserved-size slot island as the first spike.
2. Build two vertical slots and prove the enter/exit plus sibling-motion case.
3. Add interruption, cleanup, reduce motion, and accessibility proof.
4. Measure a retained heavy slot on low-end Android hardware.
5. Decide whether the reserved-size product is useful enough to ship as the first `FxFlow`.
6. Run measured-content sizing as a separate spike with its own boundary decision.

## Open questions

- Can an Expo Modules view host direct slot children with enough native control, or does the flow slot wrapper need a depth-3 custom Fabric component (shadow-node path)?
- What is the least awkward TypeScript shape for enforcing `FxFlow.Slot` as the only direct child?
- Can accessibility order, focus, and announcements stay coherent while an exiting slot remains mounted?
- What slot budget keeps memory predictable on low-end Android hardware, especially with maps, video, charts, and virtualized lists?
- Is reserved-size `FxFlow` valuable enough to ship if measured-content flow requires a V3 Fabric/shadow-node lane?
- If measured-content sizing is required, can it report native-derived size to Yoga without mutation interception?

## Sources

- `research/4-runtime/33-shadow-nodes-and-layout.md` — current boundary: fx reads layout and animates an intermediate container; no flow-layout animation.
- `research/0-spine/05-native-boundary-decision.md` — Expo Modules remains default until layout/shadow-node ownership proves insufficient.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/mounting/ShadowTree.cpp` — commit ordering: commit hook, Yoga `layoutIfNeeded`, revision commit, and mount handoff.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/mounting/MountingCoordinator.cpp` — old/new revisions become `ShadowViewMutation` lists, then optional override delegates can rewrite the transaction.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/mounting/MountingOverrideDelegate.h` — the mutation-rewrite escape hatch used by animation systems.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/mounting/Differentiator.cpp` — mutation generation, flattening/unflattening, and concrete view insert/remove/update behavior.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/mounting/ShadowViewMutation.h` — the concrete `Create`/`Delete`/`Insert`/`Remove`/`Update` mutation vocabulary.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp` — view-forming and stacking-context rules for `opacity`, `transform`, pointer events, accessibility, clipping, and collapsability.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/components/view/BaseViewProps.h` — Fabric-tracked view props, including `opacity`, `transform`, `pointerEvents`, `collapsable`, and `removeClippedSubviews`.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/core/LayoutMetrics.h` — layout frame semantics: origin is parent-relative, size includes border, padding, and content.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/components/view/YogaLayoutableShadowNode.cpp` — Yoga layout writes child layout metrics and treats transforms as cosmetic for layout.
- `example/node_modules/react-native/React/Fabric/Mounting/UIView+ComponentViewProtocol.mm` — iOS applies layout by setting `center` and `bounds`, not `frame`.
- `example/node_modules/react-native/React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm` — iOS child mount/unmount assertions and `opacity`/`transform` prop application.
- `example/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/fabric/mounting/SurfaceMountingManager.kt` — Android `addViewAt`/`removeViewAt`, exact measure/layout, and prop-update flow.
- `example/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/BaseViewManager.java` — Android `opacity` and `transform` lower to `setAlpha`, translation, rotation, and scale setters.
- `example/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/TouchTargetHelper.kt` — Android touch targeting consults `ReactPointerEventsView`.
- `example/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ReactPointerEventsView.kt` and `PointerEvents.kt` — Android internal pass-through and untargetable view contracts.
- `references/reanimated/packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.{h,cpp}` — Fabric mutation interception and light-tree layout-animation model.
- `references/reanimated/packages/react-native-reanimated/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.h` — layout-metric update utilities.
- `references/react-native/packages/react-native/ReactCommon/react/renderer/uimanager/UIManager.h` — commit and mount hook entry points.
