# Capability: fill
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the `fill` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`fill` is the simplest, highest-bang capability and a big part of the named use
cases (mesh backgrounds, gradient washes behind onboarding/cards). It is also the
cleanest **parity** node — native gradient primitives exist on both platforms. It sets the pattern every
capability doc follows: own the *semantics* here, defer *mechanics* to the structure
docs and the *rungs* to the manifest.

## The node

- **id:** `fill` · **kind:** render-target · **interaction:** `none` · **phase:** v1.
- A self-contained generative fill drawn as a layer (the `hosted` substrate); never
  samples RN content. Pairs with `composition: background | overlay` only (`50`) — **not
  `surface`**: a fill is a backdrop/wash, never a content surface.

## Semantic surface

The V1 renderer's only input is the surface-level `intensity` prop (0–1, drives the rendered layer's opacity). The gradient style and palette are platform defaults. The `kind`/`colors`/`angle`/`width`/`height`/`drift` wire-through is a planned follow-up, deferred until native `MeshGradient`/`LinearGradient` inputs have examples and device proof. `intensity` is a surface prop, not a node uniform — the `fill` node's `uniforms` are empty in V1.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| fill | native `MeshGradient` (18) → `LinearGradient` (13) fallback | static `LinearGradient` (21) |

In V1 both platforms draw a **fixed platform-default gradient** — `intensity` drives the
rendered layer's opacity (iOS) / alpha (Android); nothing animates and no per-call gradient
inputs are read. The earlier mesh-vs-gradient split, the AGSL mesh shader, and the per-call
`colors`/`angle`/grid are the deferred wire-through. Render mechanics live in
`structure.{ios,android}.md`.

## Surface consumption

Mounted by `<Fx>`; attachable to `FxView` as background decoration. Feeds `effect=` id
`mesh-gradient` (and gradient variants). Decorative only — never interactive, never wraps RN
content.

```tsx
<Fx effect="mesh-gradient" composition="background" />
<FxView effect={fx.effect.mesh()}><MyScreen /></FxView>
```

## Composition & stacking

- **kind:** render-target · **interaction:** `none`. **composition:** `background` /
  `overlay` (a fill is a backdrop or a wash, not a content `surface`).
- Stacks as a base layer: `fill + filter` (e.g. `.mesh().blur()`), or under a `shader`/glow
  in a stack (`55`).

## Runtime behavior

- **static** — the V1 renderers draw a fixed platform-default gradient; only `intensity` varies.
- **state-eased** when `intensity` changes discretely, eased by `transition`.

## Degradation

- iOS below 18 falls from `MeshGradient` to `LinearGradient` (13); Android draws a static
  `LinearGradient` (21). Both are decorative fallbacks of the same fixed gradient — never an error.

## Events

None of consequence — decorative. `onLoad` is trivially available; no interaction events.

## Decisions

1. **One `fill` node, two families** (`gradient`, `mesh`) under a future `kind` control —
   not separate nodes; they share composition. V1 renders platform defaults for both; per-call
   `colors`/`angle`/mesh-grid controls are a planned follow-on.
2. **Mesh lowers to a native primitive on iOS, a generated shader on Android** — the manifest
   carries the fallback ladder; consumers never see the split.
3. **`intensity` is the surface prop, not a node uniform** — it drives the rendered layer's
   opacity; it is not declared in the node's `uniforms`, which are empty in V1.

## Sources

- `02-capability-ir-and-lowering.md` — the `fill` rungs.
- `structure.ios.md` / `structure.android.md` — MeshGradient / LinearGradient fill mechanics.
- `_legacy/04-preset-system.md` — the JS uniform-resolution model (now `50`).
- Apple `MeshGradient`; Android Compose `Brush` (links in the structure docs).
