# 4-runtime · Runtime plane — the native engines (the moat)

**Plane:** Runtime · **Domain:** both (serves Effects and Motion) · **Substrate:**
`expo-view` · **Phase:** mostly v2
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The native machinery the manifest points at — **mechanics, cross-platform contract
only.** Semantics come from `2-effects` / `3-motion`; the per-platform expansion lives in
`5-realization`. This folder owns:

- **Interaction & gestures** (the recognizer as a native driver), **lifecycle &
  teardown** (the owned GPU/frame loop **and** the content-motion runtime's lifetimes),
  **host-safe hit-testing & SDF pass-through** — the interactive runtime (the original
  "G layer").
- **The owned content-motion runtime** (the fx-builds-it-itself, no-Reanimated
  direction): **shadow-node & layout** integration, the **animation driver**, and
  **view state / the presence handshake**.
- **The Expo Modules view boundary** — the native-view authoring base.
- **The runtime object model** (`36`) — the five stable logical owners (`FxNativeView`,
  `FxLayoutObserver`, `FxAnimationDriver`, `FxPresenceCoordinator`, `FxEffectRenderer`) and
  how they collaborate; the research→code bridge.

Out of scope: per-platform mechanics (recognizer config, exact API levels) →
`5-realization`; what to draw/animate (semantics) → `2-effects` / `3-motion`; the JS API
→ `1-surface`.

## Invariants that bite here

This is where the hard rules are easiest to break:

- **Rule #4 — never host RN content to sample/distort it** (severs iOS touch). Content
  motion is **transform/opacity only**, on the **fx-owned wrapper carrying the RN content**
  (not the RN child view or a Fabric-tracked transform, `33`), so hit-testing survives. fx
  does **not** take on flow-layout animation.
- **Rule #7 — no JSI / C++.** Expo Modules + Fabric only; the content driver uses Core
  Animation / Android View animation, not a custom native bridge.
- **The contract** — native owns frames; **keep the loop paused** off-window /
  backgrounded. No per-frame JS either direction; presence is a discrete handshake.
- **One mechanic, one home** — the cross-platform contract is here; the iOS/Android
  expansion is in `5-realization`. Never duplicate a mechanic across the two.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 30 | interaction-and-gestures | the interaction contract | researched |
| 31 | lifecycle-and-teardown | the owned-loop lifecycle contract | researched |
| 32 | host-safe-hittest-and-sdf | the hit-testing / SDF model | researched |
| 33 | shadow-nodes-and-layout | Yoga/Fabric layout ownership | researched · device-proven (layout read U5-001; wrapper identity U9-002) |
| 34 | animation-driver | the from-scratch native animation engine | researched · device-proven (retarget U6-001/U6-002) |
| 35 | view-state | mount/unmount coordination, the presence handshake + the lifecycle FSM | researched · device-proven (handshake + FSM U7-001/U7-002) |
| 36 | runtime-architecture | the object model — who owns what, how they collaborate | researched · device-proven (object model U9, 2026-06-13) |
| 51 | expo-modules-view | the native-view authoring base (the boundary) | researched |

## Feeds

- **Consumes ←** `0-spine/01` (substrate), `0-spine/02` (clock / `requires`),
  `3-motion` (`42` presence semantics, `41` vocabulary), `2-effects` (what to render).
- **Feeds →** `5-realization` (per-platform expansion of these contracts), `1-surface`
  (`FxPresence` and the chain sit on this runtime).

## Open research targets

The interactive runtime (`30`–`32`) and the owned content-motion runtime (`33`/`34`/`35`) are
both **built and device-proven** (U5–U9, 2026-06-11 → 06-13) — the designs below are realized in
`packages/` and verified on hardware. They stay the source of truth for *why* each mechanic is
shaped the way it is:

- **`33`** — how fx keeps a stable handle to the **managed wrapper it creates** (no child
  ref needed, #27846); reading the post-layout frame natively; proving transform animation
  preserves hit-testing (including mid-animation); the line where fx refuses flow-layout.
- **`34`** — the interruptible-spring contract; binding the platform-default spring per
  `preset` and adjusting by `tune` without leaving the platform family; the content-vs-
  effect driver split; the frame loop's lifecycle.
- **`35`** — the deferred-unmount JS↔native protocol; `onTransitionEnd` ordering under
  rapid toggles; source-of-truth on interrupt; teardown that doesn't leak.
- All of the above is **device-verified** (U5–U9); the JS surface that sits on this runtime is tracked separately in `7-implementation` (`blueprint.md` Phase S / Units 10–14).
