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
  samples RN content. Pairs with `composition: background | overlay` at the API layer.

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
  not JS).
- Colors resolve in JS (palettes/themes, `50`); `time` is native-injected for `drift`.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| gradient | native `LinearGradient`/`RadialGradient`/`AngularGradient` (13) | `Brush.linearGradient`/`radialGradient`/`sweepGradient` (21) |
| mesh | native `MeshGradient` (18) → gradient fallback below 18 | AGSL mesh shader (33) → `Brush.sweepGradient` fallback |

So `fill` is **parity** for gradients and **shader-on-Android** for mesh — the only
blue rung in this node. Mechanics (how each renders, the AGSL mesh shader) live in
`structure.{ios,android}.md`.

## Decisions

1. **One `fill` node, two families** (`gradient`, `mesh`) under a `kind` uniform —
   not separate nodes; they share composition and the colors/clock model.
2. **Colors are semantic and JS-resolved** (palettes/themes); `time` for `drift` is
   native-injected.
3. **Mesh lowers to a native primitive on iOS, a generated shader on Android** — the
   manifest carries the fallback ladder; consumers never see the split.

## Open questions

- **Mesh control-point ergonomics** — expose the full `width×height` grid, or a
  simpler "N color stops, auto-placed" sugar for the common case? (Ties to `50`.)
- **Animated gradient drift for the non-mesh gradients** — is `drift` mesh-only, or
  do plain gradients get a subtle animated variant?

## Sources

- `02-capability-ir-and-lowering.md` — the `fill` rungs.
- `structure.ios.md` / `structure.android.md` — MeshGradient / AGSL mesh mechanics.
- `_legacy/04-preset-system.md` — the JS uniform-resolution model (now `50`).
- Apple `MeshGradient`; Android Compose `Brush` (links in the structure docs).
