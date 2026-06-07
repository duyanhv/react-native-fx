# 3-motion · domain: Motion — what fx animates (semantics)

**Plane:** Vocabulary/semantics (mechanics → `4-runtime` + `5-realization`) · **Domain:**
Motion · **Substrate:** v1 semantics · v2 owned runtime · **Phase:** v1 (semantics) ·
v2 (engine)
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The **semantics** of motion — now a peer domain of Effects, because fx owns its engine.
The agnostic animatable vocabulary, the reactive/transition channel, and the
presence/lifecycle contract.

Out of scope, the boundary: **the engine that executes motion lives in `4-runtime`**
(shadow/layout `33`, driver `34`, view-state `35`); **per-platform animation mechanics
live in `5-realization`.** This folder owns the cross-platform *contract*, not the
mechanism.

## Invariants that bite here

- **The law — and this is where it is most tempting to break it.** Default springs /
  easings are the **platform's own**; never invent a cross-platform-uniform default.
  Customize by semantic intent (`speed` / `emphasis` / `distance`), biased toward the
  platform family.
- **The contract** — targets in, native owns frames, events out. No per-frame JS;
  **regime C on the JS thread is forbidden**. Presence is a discrete handshake.
- **Semantics here, mechanics in `4-runtime` / `5-realization`.**
- **Platform-exclusive motion = an empty-ladder / platform-only node** (the
  `shape-morph` pattern), never forced into a fake-agnostic shape.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 40 | motion-reactivity-and-data-flow | regimes A/B/C; the reactive/transition channel | researched |
| 41 | motion-vocabulary | the agnostic animatable primitives + the law | researched |
| 42 | presence-and-lifecycle | enter/hold/exit; the presence preset catalog | researched (semantics) |

## Feeds

- **Consumes ←** `0-spine/00` (the law), `0-spine/02` (the IR + `kind:'driver'`).
- **Feeds →** `4-runtime` (`33`/`34`/`35`, the engine that executes), `1-surface`
  (`54`/`55`, the API), `5-realization` (per-platform animation mechanics).

## Open research targets

- **`41`** (researched) — remaining: the exact `tune` dimension vocabulary, which
  semantic primitives ship in v1, the primitive-layer naming (Compose enter/exit names).
- **`42`** (researched semantics) — remaining: the per-platform preset default catalog, anchor-origin / travel
  measurement contract (with `33`), named states beyond binary `visible`, per-platform
  feel on device.
- **Motion in the manifest — done.** `0-spine/02` carries the single `motion` driver
  node; presence / `appear` / `dismiss` are orchestrations over it, **not** nodes.
- ~~Should the data-flow contract promote from `40` to `0-spine`?~~ **Resolved:** no —
  `0-spine/04` now owns the *static* ownership boundaries; `40` keeps the *dynamic*
  contract (regimes, targets/frames/events) as its consequence. No promotion.
