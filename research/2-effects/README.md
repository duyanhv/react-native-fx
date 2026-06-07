# 2-effects · domain: Effects — what fx draws (semantics)

**Plane:** Vocabulary/semantics (mechanics → `5-realization`) · **Domain:** Effects ·
**Substrate:** mostly `hosted` (v1) · **Phase:** v1
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

The **semantics** of each render-target / modifier capability — what the node *means*,
its typed uniforms, its intended look and composition. One doc per IR node.

Out of scope, and this is the boundary an agent must not cross: **per-platform mechanics
live in `5-realization/structure.{ios,android}`; the lowering ladder lives in
`0-spine/02`.** This folder describes the capability; it never pins how Metal/AGSL/
SwiftUI/Compose realizes it.

## Invariants that bite here

- **No UI components, no RN-content wrappers.** Effects are render-targets/modifiers
  **mounted by `<Fx>`** (the effect primitive) **or attached to `FxView` as decoration**
  (`50`/`55`/`57`). This folder defines effect *semantics*, never components or content
  wrappers; the only compound is `FxGroup`/`FxItem` (surface, `57`) — there is no
  `Material`/`GlassContainer`.
- **Semantics here, mechanics in `5-realization`** — a mechanic has exactly one home,
  and it is not this folder.
- **Node ids are the naming authority** (`0-spine/02`) — doc name = manifest key =
  public prop vocabulary.
- **The law** — describe the capability agnostically; the platform-native realization is
  the lowering's job. No `SwiftUI*` / `Compose*` names.
- A capability with no satisfiable rung on a platform is **unavailable, not an error**.

## Doc shape (effect docs)

Beyond the base template, every effect doc answers **how it behaves in the surface** with
five sections: **Surface consumption** (mounted by `<Fx>` / `FxView effect` / `FxGroup`;
which `effect=` ids it feeds; what's *not* allowed) · **Composition & stacking** (kind,
valid `composition` modes, what it stacks with) · **Runtime behavior** (static /
native-clock / state-eased / interactive-native-input) · **Degradation** (the semantic
fallback ladder) · **Events** (what JS may observe — semantic only, no per-frame stream).

**Events — the shared rule.** Render-targets may expose `onLoad`/`onError`/`onTransitionEnd`
depending on native resource lifecycle (a `shader` compiles → `onLoad`/`onError`; a uniform
transition completes → `onTransitionEnd`); `interaction:'fx'` adds `onPress*`. **Modifiers
(`filter`) expose no direct events.** `interaction:'self'` effects (material/symbol) don't
surface press — the system view owns it.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 20 | fills | the `fill` node (gradient, mesh) | researched |
| 21 | materials-and-glass | the `material` node (glass / blur) | researched |
| 22 | shaders | the `shader` node (curated + BYO) | researched |
| 23 | filters | the `filter` modifier node | researched |
| 24 | symbols | the `symbol` node | researched |

## Feeds

- **Consumes ←** `0-spine/02` (each node's lowering ladder + `requires`).
- **Feeds →** `1-surface/50` (the API wraps these nodes), `5-realization` (which renders
  their mechanics per platform).

## Open research targets

The catalog is `researched`; the open work is depth and reconciliation:

- Keep each doc's `uniforms` and semantics in lockstep with `0-spine/02`.
- Resolve each doc's own Open questions (per-capability).
- **Where curation ends and BYO begins** — how large the curated catalog grows before
  the drop-in-your-own path is genuinely needed (ties to `00`).
- Confirm every node degrades gracefully where a platform lacks it (e.g. `shape-morph`
  absent on iOS; `content-distort` out-of-scope on iOS).
