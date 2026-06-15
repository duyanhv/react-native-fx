# 1-surface · Surface plane — the consumer API

**Plane:** Surface · **Domain:** both · **Substrate:** both · **Phase:** v1
Read [`../README.md`](../README.md) first — the model, the law + contract, the doc
template, the fan-out protocol. This is the local map.

## What this folder owns

What the developer actually writes — the public JS surface, the front door of the product
(the consumer persona). fx is a **presentation runtime**, so this is more than effects: it
spans content presence, content motion, and effects, behind **one prop language** and an
explicit **three-layer hierarchy** (top-down):

1. **Platform-native behavior presets** (`56`) — behaviors via props:
   `preset="transient"`, `feedback="native"`, `effect="edge-glow"`, applied to *your*
   content; plus the curated effect components fx draws whole (`EdgeGlow`/`MeshGradient`/
   `GlassView`). Front door for 95%.
2. **Primitives** — content: `FxPresence` (`54`), `FxView`/`FxPressable`/`FxGroup` (`57`);
   effects: `<Fx>` single-or-stack (`55`).
3. **Builders & data** — `fx.effect.*`→`EffectStack` (`55`), `fx.motion.*`→`MotionSpec`
   (`41`); BYO.

`50` is the umbrella: it defines the three layers, the shared prop language, presets/
palettes, and the adapter dispatch (`select()` over the manifest).

Out of scope: how a node lowers (→ `0-spine/02`); what it draws/animates (→ `2-effects` /
`3-motion`); the native engine it mounts on (→ `4-runtime` / `5-realization`).

## Invariants that bite here

- **Platform-native behavior presets are the top layer; fx is not a UI kit.** fx wraps any UI kit and owns
  presentation *behaviors* (`preset`/`feedback`/`effect`), never the components — no
  `<Toast>`/`<Button>`/`<Card>`; only effects (owned whole) are fx components. Each layer is
  a thin skin over the one below; escape is downward, no cliff.
- **Shape-native law.** A `preset` resolves the whole behavior (shape + timing) per platform;
  only an explicit `motion` override goes cross-platform-uniform — fixing the semantic shape,
  while measured magnitudes still resolve natively (`edge`/`origin` sugar deferred, `41`).
- **One word, one meaning; props scoped by ownership.** `transition` = timing **only**;
  `motion` = `MotionSpec` map (shape); `effect` = `EffectStack`; `preset`/`tune` = semantic
  (`tune` deferred from the V1 surface — DOC-019).
  `visible`→`FxPresence`, `state`→`FxView`, `feedback`→`FxPressable`, `interactionMode`→`<Fx>`.
- **The law** — components are **capability-named, never platform-named**; defaults are the
  platform's own. No `SwiftUI*` / `Compose*` in the public API.
- **Props by default; compound only for real native layers** (`FxGroup`/`FxItem`).
- **Presets resolve in JS** — `time`/`resolution` never in the resolved record.
- **The contract** — the resolved value crosses once; no per-frame JS; degrades, never throws.

## Docs

| id | doc | owns | status |
|---|---|---|---|
| 50 | api-and-presets | the umbrella: three layers + shared prop language + presets + adapter | researched |
| 54 | presence | `FxPresence` (content enter/exit; `visible` + `preset` + typed `motion` map) | researched (API) |
| 55 | composition-chain | effect composition — `fx.effect` → `EffectStack` (visual layers only) | researched (API) |
| 56 | platform-behavior-presets | platform-native behaviors — `preset`/`feedback`/`effect` (not UI components) | researched (API) |
| 57 | content-primitives | `FxView` · `FxPressable` · `FxGroup`/`FxItem` (effects → `55`) | researched (API) |

## Feeds

- **Consumes ←** `0-spine/02` (the manifest + `select()`), `2-effects` / `3-motion` (the
  nodes/semantics; `41` owns `fx.motion`/`MotionSpec`), `4-runtime` (the runtime the
  content components sit on).
- **Feeds →** the published package (`6-ship`).

## Open research targets

- **`50`** — the behavior-preset catalog (which ship v1) and spec memoization guidance.
- **`54`** — portal vs app-owned placement, event payload; native mechanics in `33`/`35`.
- **`55`** — the deferred `<Fx.Stack>` skin, `SpringTune` shape, memoization.
- **`56`** — exact `preset`/`feedback`/`effect` vocabularies (behavior-named) + per-platform
  shape+timing defaults (ties to `42` + `41`'s default catalog); whether to ship the named
  effect-component sugar.
- **`57`** — `FxView` state vocabulary, `FxPressable` `feedback` values, `FxGroup` morph
  scope; native mechanics in `33`/`34`/`35`.
- Carried from `50`: per-shader uniform typing source (generate from `02` vs hand-maintain),
  theme/palette as a shareable artifact (`52` `lab`).
