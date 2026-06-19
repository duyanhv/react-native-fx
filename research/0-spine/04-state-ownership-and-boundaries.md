# State ownership & boundaries
Status: researched
Phase: v1 (foundational — cross-cutting)
Feeds: 05-native-boundary-decision, 40-motion-reactivity-and-data-flow, 33/34/35, 42, 54
Owns: the **ownership-boundary model** — who owns which state across the JS↔native stack.

## Why this matters

Almost every hard problem in fx — the layout problem, the JS-state problem, deferred
unmount, wrapping children, animating content — is the same problem wearing different
clothes: **unclear ownership.** When two layers both think they own a piece of state, you
get jank, severed touch, or a unmount race. This doc draws the lines once. After it,
every runtime question reduces to a single test: *whose state is this?* — and the answer
dictates who may write it and who must only read or ask.

This is the **static spine** beneath two dynamic docs: `40` (the data-flow *contract* —
how state moves) and `05` (the boundary *mechanism* — which native substrate carries it)
are both consequences of the lines drawn here.

## The five owners

State in an fx-animated view belongs to exactly one of five owners. Each owns one stage of
a pipeline; **fx sits between layout and pixels**, and owns only that slice.

```
 JS                React              RN / Yoga          fx                 Native platform
 desired state  →  mounted tree   →   layout         →   presentation   →   frames / pixels
 (what I want)     (what exists)      (where/how big)    state (how it         (the actual
                                                         looks & moves)        render)
```

| Owner | Owns | Does **not** own | The rule for fx |
|---|---|---|---|
| **JS (the app)** | *desired* state — `visible`, `state`, `preset`, uniform/config targets; declarative intent | frames, pixels, layout, presentation | fx **receives** desired state as props; never asks JS to compute motion |
| **React** | the *mounted tree* — which components exist, identity (keys), mount/unmount, reconciliation | anything visual or native | fx may not seize unmount; it **coordinates** with React (the handshake) |
| **RN / Yoga** | *layout* — every view's frame (size, position), flow | transforms, opacity, the render loop | fx **reads** the post-layout frame; it never **writes** layout, never fights Yoga |
| **fx** | *presentation state* — transform, opacity, the animation envelope, the presence lifecycle | desired state, layout, pixels | fx owns the slice **above layout, below pixels** — its actual territory |
| **Native platform** | *frames & pixels* — the compositor / render server, Core Animation, RenderEffect, Metal | what to animate toward | fx **sets targets**; the platform **owns the frame loop** |

## The seams (where the rules live)

The bugs live at the boundaries, so each seam gets one rule:

- **JS → React** — declarative: JS sets props, React reconciles. fx's desired state
  arrives as props (`visible`, `tune`, uniform targets), nothing imperative per frame.
- **React → Yoga** — the mounted tree drives layout. fx does not insert itself here; it
  wraps content in **one host view it owns** (per `33`) and lets Yoga lay it out.
- **Yoga → fx** — fx **reads** the resolved frame to resolve travel/origin, then animates
  **transform** (compositor-level, *above* layout). It never animates layout itself —
  which is exactly why content motion is overlay-scoped and transform-only.
- **fx → platform** — fx writes a **presentation target**; the platform's animator owns
  every frame to it. fx never ticks frames from JS or native-from-JS.
- **platform → fx → React → JS** — results flow back **discretely**: the platform's
  completion → fx's `onTransitionEnd` → JS. And unmount is a **handshake**, not a seizure:
  React owns the tree, so fx keeps the exiting child in a ref and *asks* React to unmount
  only after the native exit completes (`35`).

## How this resolves the known problems

- **The layout problem** → Yoga owns layout; fx owns presentation. fx animates transform
  *above* Yoga's frame, so it never reflows siblings (overlay-scoped). It reads the frame;
  it does not own it.
- **The JS-state problem** → React owns the tree; fx owns presentation. The deferred-
  unmount handshake exists precisely because fx may not override React's unmount — it
  coordinates across the React→fx seam.
- **Wrapping children** → React/RN own the children tree. An Expo native view **should not
  assume arbitrary RN-descendant management** (expo/expo #27846): **container-scoped
  ownership is the default**, and per-child control is a *boundary trigger* (`33`/`05`). So
  fx owns only the **presentation of the wrapper it created**, never the children themselves.
- **Animating content** → JS owns *desired*, the platform owns *frames*; fx owns the
  *presentation* in between. That is the entire content of "targets in, native owns
  frames, events out" (`40`).

## The presentation boundaries (A / B / L)

The five owners draw *who owns what state*; this refines the fx slice into the three
**boundaries** a capability can occupy. The boundary answers one question for any proposed
capability — **can fx add it inside an existing boundary, or does it move one?** "Inside" is
additive (reuse shipped machinery, no rule change); "moves a boundary" crosses a fence the
rules draw — most concretely Decision 2 (read layout, never write it) — and needs an explicit
`05` decision before it ships.

| boundary | fx owns | RN still owns | retention handshake | layout |
|---|---|---|---|---|
| **A — content motion** | the wrapper's internal transform/opacity/frame inside an RN-laid-out box | the content and its layout | yes — fx may defer React's unmount | reads only |
| **B — effect** | generated or native pixels | everything; content is never sampled or hosted to distort (rule #4) | no | reads `cornerRadius` / neither |
| **L — layout participation** | a size/measurement contributed into Yoga/Fabric | the content | depends | **writes** |

Boundaries are **capabilities a view performs, not a taxonomy of views.** One native view can
straddle several: `FxSurfaceView` does both A (a Fabric-invisible content container animated
above layout) and B (a Metal effect over it), kept clean by routing RN children into the
invisible container and letting `hitTest` pass their touches through.

**Boundary L is empirically absent in the shipped primitives.** Every primitive reads layout
or neither; none writes it. The Decision-2 / rule-#9 fence is real and measurable, not
theoretical — so any capability that would write Yoga layout is a boundary *move*, not an
addition.

**The cross-tree frontier.** Some capabilities sort into none of A/B/L — a shared-element
transition needs endpoint discovery across the React tree, retention of a view as it
conceptually moves between tree locations, and possibly mutation coordination. The rule is to
**refuse to mis-file it as a stretched L**: it is a candidate **new boundary**, gated by its
own `05` decision.

### The sorting rule

```txt
Does it retain or move RN content?                 -> Boundary A
Does it draw native/generated pixels without
  owning or sampling RN content?                   -> Boundary B
Does it write Yoga layout / rewrite Fabric
  mutations?                                        -> Boundary L (moves rule #9; gate at 05)
Does it need user-authored per-frame mapping
  of fx-owned state?                               -> gated regime C (substrate depth 4; 05)
Does it need cross-tree identity + retention?      -> candidate new boundary (05)
```

The source channel (what *drives* the target) and the substrate depth (how fx *binds* to
native) are independent of the boundary and are decided separately — both live in
`05 §Capability mechanism`.

### The nine-question gate

Reviewer machinery: every proposed capability answers these before it earns a build slot.

1. Which boundary — A, B, L, or a candidate new one?
2. What native resource does fx own?
3. What does React still own?
4. Does it retain RN content? (the memory-policy detail is a `05` mechanism question)
5. Does it write layout?
6. Does it sample RN pixels? (must be **never** for RN content on iOS)
7. What crosses JS↔native, on which **source channel**? → answer against `05`
8. What **memory policy** applies (retention budget, duration cap, cleanup triggers, background behavior)? → `05`
9. What device proof would falsify the classification?

Question 9 keeps it honest: a classification with no falsifying device scenario is a guess, not
a decision. The **substrate-depth** a capability needs is likewise a `05` mechanism question.

## Decisions

1. **Five owners, one slice each; fx owns presentation state only** — above layout, below
   pixels. fx never owns desired state, the tree, layout, or pixels.
2. **Read layout, never write it.** fx reads Yoga's frame and animates transform above it;
   flow-layout animation is out of scope (it would mean owning layout).
3. **Coordinate the tree, never seize it.** Mount/unmount is React's; fx defers unmount via
   a handshake, never by force.
4. **Set targets, never drive frames.** The platform owns the frame loop; fx is discrete on
   both edges. This is why the boundary can stay thin and async (`05`).
5. **Own the wrapper, not the child.** fx's presentation authority extends only to the host
   view it creates; RN descendants belong to React/RN.
6. **The *platform* owns the default *shape* of presentation, not just the curve.** Native
   feel is shape, origin, distance, edge/anchor, timing, *and* interruption behavior — the
   whole presentation, not the easing alone. So a `preset`'s default presentation **may
   diverge per platform** (iOS and Android can differ in geometry). fx/the user reclaim that
   ownership **only** by an explicit `motion` override (partial `edge`/`origin` sugar is
   deferred, `41`), which then fixes the cross-platform **semantic** shape. This is the shape-native law (`41`) stated as an ownership
   boundary: shape defaults belong to the platform until explicitly overridden — which is
   what stops `preset="transient"` from collapsing into a fixed `edge="bottom"` with native
   curves.
7. **Native presentation state is exposed to JS only as semantic events or async
   snapshots** — never as a live frame stream. JS may *receive*: `phase`
   (enter/hold/exit), `loaded`/`error`, the resolved lowering, an interrupt result, a
   measured frame (on demand). JS may **not** subscribe to per-frame state — the frame
   loop stays native (the contract, `40`). This is the read-side of "fx owns presentation
   state": JS sets the target and hears *outcomes*, not *frames*.
8. **Three presentation boundaries — A (content motion), B (effect), L (layout
   participation) — and a capability either adds inside one or moves one.** Boundary L (writing
   Yoga layout) is the Decision-2 / rule-#9 fence and is empirically absent in shipped
   primitives; moving it, or opening a cross-tree boundary, needs an explicit `05` decision. The
   source-channel and substrate-depth axes that classify *how* a capability binds are independent
   of the boundary and live in `05`. (Promoted from the capability-boundary classifier — DOC-026;
   DOC-021 §1.)

## Open questions

- **Native object identity as "fx presentation state" persistence** — the coordinator /
  driver that holds presentation state must survive React re-renders; confirming that
  identity across Fabric commits is the `05` falsification test (`35`).
- **Where `composition` (background/overlay/surface) sits** — it is presentation-adjacent
  but resolved at the API layer (`50`); confirm it never leaks into Yoga's ownership.
- **Nitro Hybrid Views as an alternative presentation-state carrier** — Nitro now exposes
  view components; whether that changes the `05` mechanism (not the ownership lines here)
  is an `05` question, deferred.

## Sources

- Expo Modules API docs; Expo `RNHostView` / auto-Host docs (the layout-owning host
  boundary, expo/expo#46549); [Expo native child-view discussion #27846](https://github.com/expo/expo/discussions/27846)
  (an Expo view should not assume arbitrary RN-descendant management; container-scoped is
  the default, per-child control is a boundary trigger).
- [Nitro — Hybrid Objects / Hybrid Views](http://nitro.margelo.com/docs/what-is-nitro);
  [React Native Runtimes](https://github.com/margelo/react-native-runtimes) (off-thread
  JS ownership — out of scope for presentation).
- Android `RenderEffect`/AGSL docs and `SpringAnimation` (`androidx.dynamicanimation`);
  Apple SwiftUI visual-effect / Core Animation (model vs presentation layer) — the
  platform's ownership of frames/pixels.
- `01` (substrates/hosting), `40` (the data-flow contract this underlies), `05` (the
  mechanism that carries the fx-presentation boundary), `33`/`34`/`35` (the runtime that
  implements these seams).
