# Runtime: shadow nodes & layout
Status: researched (design) · source-audit pass · device-proven (layout read U5-001, 2026-06-11; wrapper identity / `05` falsification U9-002, 2026-06-13)
Phase: v2 (the owned content-motion runtime lives on the `expo-view` substrate)
Feeds: 34-animation-driver.md, 35-view-state.md, 42-presence-and-lifecycle.md, structure.{ios,android}

## Why this matters

The decision to own content motion outright — no Reanimated, no other lib — means fx
reaches into the parts of React Native it has so far stayed above: the shadow tree,
Yoga/Fabric layout, and the native view registry. This doc owns the **layout
contract**: who computes the frame, when fx may read it, and how fx animates a view
whose layout belongs to RN.

This is the harder of the two problems `FxPresence` surfaced (the other is state →
`35`). It is what separates "wrap content and animate it natively" from "host content
and sever its touch" (rule #4) and from "drive frames from JS" (the data-flow
contract). Get the layout ownership wrong and either touch breaks or the animation
fights Yoga.

## The constraint that bounds it

fx animates **transform + opacity** of the **fx-owned wrapper carrying the real RN content**
— not the RN view's own Fabric-tracked transform, which gets clobbered (see below). The
pixels are never sampled, so hit-testing geometry moves with the layer and **touch survives at
rest** (mid-flight behavior follows `34`'s iOS/Android caveat). fx does
**not** take on flow-layout animation (list reorder, animate-content-size, siblings
pushing each other); that stays RN's `LayoutAnimation` / the app's concern. The
tractable scope is **overlay presence** (transient overlays, sheets, modals, app-owned
overlay content; anchored `menu`/`tooltip` are v2; a fab is *composed*, not a primitive) —
content that does not participate in flow layout, so enter/exit is pure compositor-level
transform with no sibling reflow.

## Findings — own the wrapper, never the child

The design that makes Expo Modules sufficient: fx wraps `children` in **one managed host
view it owns** (the Expo module's own native view) and animates **that container's**
transform/opacity. The RN content mounts as a child subview and rides along; fx never
needs a programmatic handle to an RN child.

This relates to expo/expo #27846. **Verified against source** (`references/`): an Expo view
does *not* intercept `insertReactSubview`; it hooks Fabric's `mountChildComponentView` /
`unmountChildComponentView` directly, so it **knows** when children mount and can read
`childComponentView.bounds` *imperatively at mount* — but there is **no per-child
measurement reactivity** (children are opaque `AnyChild` wrappers). The wrapper-transform
approach sidesteps it: transform the container fx owns, not the children.

- **Measurement** comes from fx's own view frame, and Fabric resolves **Yoga layout *before*
  mounting** (`ShadowTree.cpp:417`) — so the final frame is in the mount/Update mutation's
  `layoutMetrics`; fx reads it natively, no JS round-trip.
- **Touch** survives **at rest** because a transformed container preserves hit-testing into
  its child subtree (transform-only, no snapshot); the mid-flight tappable position follows
  `34`'s iOS/Android caveat.

### The clobber constraint → the intermediate container

**Verified, and it sharpens the design:** `transform`/`opacity` are **Fabric props re-applied
on every commit** (`BaseViewProps.h`; `Differentiator.cpp`). So animating a *Fabric-tracked*
view's layer transform directly gets **clobbered** by the next commit. Therefore fx animates
an **intermediate container** — a native view inside `FxSurfaceView` that Fabric does not track,
so Fabric cannot clobber its `transform`/`opacity`. `FxSurfaceView` overrides
`mountChildComponentView` to route RN children into this intermediate container; the children
ride along as the container animates. The animator targets the intermediate container, not
the outer `FxSurfaceView` that Fabric tracks. This is a view, not a raw `CALayer`, so
children mount as subviews and hit-testing survives at rest. (`34`/`35` build on this.)

**Child-routing realization (proven precedent, not naive override).** Hosting Fabric-mounted
children in a nested container is a shipping Expo/RCT pattern, but it must mirror the proven
templates exactly — the per-platform mechanics and the references are pinned in
`5-realization/structure.{ios,android}.md`. A one-sided override (mount without unmount on iOS;
a partial `addView` + `getChild*` proxy on Android) breaks Fabric's mounting invariants and
crashes — the templates (`expo-glass-effect`/`currentContainerView` on iOS, `expo-blur` or the
`GroupView` ViewManager DSL on Android) are the contract. **Fallback if reparenting ever proves
too fragile:** Reanimated avoids reparenting entirely, animating in place by participating in
the committed props — but its mechanism is a C++ `UIManagerCommitHook` (rule #7 forbids it). The
fx-legal analogue is to animate fx's *own* `expo-view` where fx is the sole writer of
transform/opacity, so there is no Fabric prop to clobber — reserved as the alternative if the
container model breaks down, not the V1/V2 default.

### The falsification test — verdict: PASS (device-proven, U9-002, 2026-06-13)

Verified against Expo/RN source — a **source-audit** pass, not a device proof: **stable
wrapper identity holds** (Expo
`shouldBeRecycled() = false` → views are never recycled), and **layout is readable natively**
(`layoutMetrics` pre-mount). With the Fabric-invisible intermediate container above, **Expo
Modules is sufficient** for the container-transform model. It is **insufficient only the day
fx needs per-child control** (staggered children, child-anchored `menu`/`tooltip`) — *that*
is the concrete trigger to reconsider Nitro / raw Fabric (`0-spine/05`). Until then, the
default holds.

## Research questions

- How does fx keep a stable handle to the **intermediate container** across
  re-renders, on each platform (iOS UIView, Android ViewGroup)? (fx animates the container it
  owns — no child RN-view ref is needed; #27846.)
- ~~When is the post-layout frame available, and how does fx read size/position
  **natively** to resolve a relative target (e.g. `distance: 'compact'` → the view's
  own measured height) without a JS round-trip?~~ **Answered (U5-001, device-verified
  2026-06-11).** The frame is available natively at mount (Fabric resolves layout before
  mounting) and on every layout update. `FxLayoutObserver`, owned by `FxSurfaceView`,
  captures it event-driven — iOS observes `bounds` (RN applies layout as `center` then
  `bounds`), Android attaches a layout-change listener — and serves parent-space frame,
  window origin, edge travel, and insets by synchronous native read; zero JS round-trip,
  zero layout writes. The per-platform read points live in
  `5-realization/structure.{ios,android}.md` §Layout read.
- Does transform animation provably preserve hit-testing on both platforms, including
  mid-animation (the presentation-layer vs model-layer subtlety on iOS)?
- Is the wrapper layout-transparent enough that inserting `FxPresence` does not change
  the child's flex layout? (RN has no `display: contents`.)
- What is the exact boundary fx refuses to cross into flow-layout animation, stated as
  a rule a consumer can predict?

## Open questions

- **Falsification test for the boundary decision (gates `0-spine/05`).** This doc owns
  the layout half. fx animates the **intermediate container** inside `FxSurfaceView` (so it
  holds that handle trivially — no child ref needed, #27846); the open questions are whether
  Expo Modules can keep that **container's identity stable across re-renders** and let fx
  **read post-layout frames natively**. If either cannot be done cleanly through Expo Modules,
  that is a concrete trigger to reconsider Nitro/JSI. Until one fails on device, the default
  holds. **The layout-read half passed on device (U5-001, 2026-06-11)** — Expo Modules reads
  post-layout frames natively with no C++/JSI; the identity half is **device-proven** (the `05`
  falsification test — SPINE-009 closed, U9-002, 2026-06-13).
- ~~Whether any of this is reachable on the `hosted` substrate, or strictly `expo-view`.~~
  **Resolved (RT-013 / U5-001, device-verified 2026-06-11): strictly `expo-view`.** The read
  rides `FxSurfaceView` with no hosted-substrate involvement; content motion and its layout
  read are `expo-view`-only (rule #3).
- ~~Shadow-node interaction on the New Architecture only, or a Paper fallback at all.~~
  **Resolved (RT-013 / U5-001, device-verified 2026-06-11): New Architecture only.** The
  read point exists only in Fabric's mounting flow (SDK 56 floor); no Paper fallback is
  built or supported.

## Sources

- Conversation deciding the no-other-lib, own-the-runtime direction.
- `01-substrates-and-hosting.md` (rule #4, the Host boundary), `40` (the data-flow
  contract), `35-view-state.md` (the mount/unmount handshake this layout work serves).
