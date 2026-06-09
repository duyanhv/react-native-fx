# Capability: fill
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the `fill` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`fill` is the simplest, highest-bang capability and a big part of the named use
cases (mesh backgrounds, gradient washes behind onboarding/cards). It is also the
cleanest **parity** node — native primitives exist on both platforms for plain
gradients — with one shader fallback (mesh on Android). It sets the pattern every
capability doc follows: own the *semantics* here, defer *mechanics* to the structure
docs and the *rungs* to the manifest.

## The node

- **id:** `fill` · **kind:** render-target · **interaction:** `none` · **phase:** v1.
- A self-contained generative fill drawn as a layer (the `hosted` substrate); never
  samples RN content. Pairs with `composition: background | overlay` only (`50`) — **not
  `surface`**: a fill is a backdrop/wash, never a content surface.

## Semantic surface

Two families under one node, selected by a `kind` uniform:

```ts
type FillUniforms =
  | { kind: 'gradient'; type: 'linear' | 'radial' | 'angular'; colors: string[]; stops?: number[]; angle?: number }
  | { kind: 'mesh'; width: number; height: number; colors: string[]; /* width*height stops */ drift?: number };
```

- **gradient** — `colors` (hex, coerced natively) + optional `stops`; `type` picks
  the geometry. Static by default.
- **mesh** — a `width × height` control grid with one `color` per vertex; `drift`
  animates vertex positions for the fluid aurora look (driven by the native clock,
  not JS). V1 exposes the full grid. It does not expose N-stop auto-placement sugar.
- Colors resolve in JS (palettes/themes, `50`); `time` is native-injected for `drift`.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| gradient | native `LinearGradient`/`RadialGradient`/`AngularGradient` (13) | `Brush.linearGradient`/`radialGradient`/`sweepGradient` (21) |
| mesh | native `MeshGradient` (18) → gradient fallback below 18 | AGSL mesh shader (33) → `Brush.sweepGradient` fallback |

So `fill` is **parity** for gradients and **shader-on-Android** for mesh — the only
blue rung in this node. Mechanics (how each renders, the AGSL mesh shader) live in
`structure.{ios,android}.md`.

## Surface consumption

Mounted by `<Fx>`; attachable to `FxView` as background decoration. Feeds `effect=` id
`mesh-gradient` (and gradient variants). Decorative only — never interactive, never wraps RN
content.

```tsx
<Fx effect="mesh-gradient" composition="background" />
<FxView effect={fx.effect.mesh({ palette })}><MyScreen /></FxView>
```

## Composition & stacking

- **kind:** render-target · **interaction:** `none`. **composition:** `background` /
  `overlay` (a fill is a backdrop or a wash, not a content `surface`).
- Stacks as a base layer: `fill + filter` (e.g. `.mesh().blur()`), or under a `shader`/glow
  in a stack (`55`).

## Runtime behavior

- **static** for plain gradients; **native clock** for `mesh.drift` (vertex animation off
  `time`, not JS). `drift` is mesh-only in V1; plain gradients do not get implicit
  animated drift.
- **state-eased** — palette/points change discretely, eased by `transition`.

## Degradation

- mesh on iOS <18 → `LinearGradient` fallback; mesh on Android <33 (no AGSL) →
  `Brush.sweepGradient` fallback. Gradients are parity everywhere (iOS 13 / Android 21).

## Events

None of consequence — decorative. `onLoad` is trivially available; no interaction events.

## Decisions

1. **One `fill` node, two families** (`gradient`, `mesh`) under a `kind` uniform —
   not separate nodes; they share composition and the colors/clock model.
2. **Colors are semantic and JS-resolved** (palettes/themes); `time` for `drift` is
   native-injected.
3. **Mesh lowers to a native primitive on iOS, a generated shader on Android** — the
   manifest carries the fallback ladder; consumers never see the split.
4. **V1 mesh exposes the full `width × height` grid** — N-stop auto-placement sugar stays
   out of V1 until real usage shows the grid is too heavy.
5. **`drift` is mesh-only** — plain gradients stay static unless a later capability adds
   explicit animated-gradient semantics.

## Sources

- `02-capability-ir-and-lowering.md` — the `fill` rungs.
- `structure.ios.md` / `structure.android.md` — MeshGradient / AGSL mesh mechanics.
- `_legacy/04-preset-system.md` — the JS uniform-resolution model (now `50`).
- Apple `MeshGradient`; Android Compose `Brush` (links in the structure docs).
