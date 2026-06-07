# 5-realization · Runtime plane (per-platform) — how capabilities become native

**Plane:** Runtime (the per-platform face) · **Domain:** both · **Substrate:** both ·
**Phase:** v1 + v2
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The **single home for platform mechanics.** Each file is one platform column of the
manifest, fully expanded: the concrete primitives, API levels, render loops, recognizer
config, and animation mechanisms that realize every capability on that OS.

These two docs use a **different shape** from the rest of the vault: **§ Platform
fundamentals** (substrate, hosting, clock, render, touch, lifecycle, version gates) then
**§ Per-capability realization** (one section per IR node, expanding the manifest).

Out of scope: capability semantics (→ `2-effects` / `3-motion`); the cross-platform
runtime contracts (→ `4-runtime`); the lowering schema (→ `0-spine/02`). This folder
*renders* those; it does not redefine them.

## Invariants that bite here

- **A mechanic lives here exactly once.** This is the sole home — if a mechanic appears
  in a capability or runtime doc instead, it is in the wrong place.
- **iOS and Android are peers** (rule #6) — divergence is localized here and **nowhere
  else**. Designed cross-platform, not ported.
- **The law, realized** — this is where "platform-native default" becomes concrete
  (iOS system spring, Material emphasized easing, Liquid Glass, M3 physics).
- **Render only what the manifest declares** — don't invent capability beyond `02`.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| — | structure.ios | the iOS column + iOS fundamentals | researched |
| — | structure.android | the Android column + Android fundamentals | researched |

## Feeds

- **Consumes ←** `0-spine/02` (the columns to render), `2-effects` / `3-motion` (the
  semantics to realize), `4-runtime` (the contracts to expand per platform).
- **Feeds →** the native implementation in `packages/{ios,android}`.

## Open research targets

- Expand the **new motion mechanics** per platform: Core Animation / `UIView` +
  `CASpringAnimation` (iOS) and `ViewPropertyAnimator` / `androidx.dynamicanimation`
  (Android) for wrapped-content motion; SwiftUI / Jetpack Compose for effect motion
  (per `4-runtime/34`).
- Keep each per-capability section in lockstep with `0-spine/02`'s single `motion` node
  (the content + effect rungs are now rendered in both `structure.*`).
- **Device verification** — every mechanic here stays `open`-until-`verified`; effects
  and animations do not run headless.
