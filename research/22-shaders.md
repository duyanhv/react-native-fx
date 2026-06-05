# Capability: shader
Status: researched
Phase: v1 (decorative) · v2 (interactive surface)
Feeds: 50-api-and-presets.md
Owns: the `shader` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`shader` is the generative-effect capability — the Aurora-class glow, plasma,
caustics, noise fields — and the one node that is **`interaction: 'fx'`**: it can run
decoratively on the `hosted` substrate *or* as an interactive surface on `expo-view`
with the runtime (G). It is also the only `via:'shader'` (blue) node on both
platforms, so it carries the **MSL↔AGSL** authoring split and the **BYO** story. The
demotion from the old thesis lives here: shaders are *one capability*, not the core.

## The node

- **id:** `shader` · **kind:** render-target · **interaction:** `fx` · **phase:** v1.
- Curated effects selected by id; each is a real `.metal` + `.agsl` pair maintained
  by the library (or supplied by a BYO author). Draws itself; samples nothing.

## Semantic surface

A curated `ShaderId` union with **typed per-shader uniforms**; `time`/`resolution`
are native-injected and absent from every public type (so they can't be set):

```ts
type ShaderId = 'aurora' | 'noise-field' | 'plasma' | 'caustics' | 'edge-glow';
// (mesh is a `fill` capability — native MeshGradient/AGSL — not a generative shader.)

interface AuroraUniforms     { speed: number; intensity: number; colorA: string; colorB: string }
interface NoiseFieldUniforms { scale: number; speed: number; contrast: number }
interface EdgeGlowUniforms   { palette: string[]; speed: number; glowSize: number }
// … one typed set per id; uniforms is Partial<ShaderUniforms[K]>, narrowed by id.
```

- **Resolution happens in JS** (preset defaults ⊕ overrides → one flat record), then
  crosses the bridge once; native runs no preset branching (`50` owns this).
- **BYO is the same node** — a developer supplies a `.metal` + `.agsl` pair and a
  uniform table; it reuses the `shader` rungs. No `source={msl}` runtime prop in V1:
  curated ids and build-time BYO assets are the front door, by scope choice (runtime
  compilation is *possible* on both platforms — see `_legacy/08` — but deferred).

## Lowering (summary — authority is 02 + structure.\*)

| substrate | iOS | Android |
|---|---|---|
| `hosted` (decorative) | `.colorEffect` + `.metal` (17) · TimelineView clock | AGSL `RenderEffect` (33) · frame-nanos |
| `expo-view` (interactive) | `MTLRenderPipelineState` + `MTKView` (17) · display-link | AGSL `graphicsLayer.renderEffect` (33) · frame-nanos |

Each curated shader is a `{ ios: '<msl fn>', android: '<agsl>' }` pair. Mechanics —
the MTKView render pipeline, the `.metallib` resource-bundle distribution, the AGSL
`RuntimeShader` path, the uniform `MTLBuffer` layout — live in
`structure.{ios,android}.md`. The MSL↔AGSL split is exactly what the compiler (`03`)
would later collapse to author-once.

## Decisions

1. **`shader` is the only `interaction: 'fx'` render node** — it carries both a
   hosted decorative rung and an expo-view interactive rung; intended use selects.
2. **Curated `ShaderId` + typed per-shader uniforms**; `time`/`resolution`
   native-injected and unsettable; resolution in JS (`50`).
3. **BYO is a `shader` node with author-supplied `.metal`+`.agsl`** — build-time
   assets, not a runtime `source` prop. Curation is the front door.
4. **Each curated shader is an MSL+AGSL pair** maintained by the library — the 2×
   authoring cost is the price of cross-platform, and the compiler's future target.

## Open questions

- **Final curated `ShaderId` set + uniform tables** — reconcile the historical sets
  (`aurora/ripple/spotlight` vs `plasma/caustics`); pin the V1 catalog with `50`.
- **Uniform struct alignment (needs-device)** — Swift↔MSL field order/stride, and the
  AGSL uniform binding equivalent; carried from `_legacy/08`.
- **BYO asset contract** — how a developer registers a `.metal`+`.agsl` pair + uniform
  table (build step, manifest entry); ties to `03`/`53`.

## Sources

- `_legacy/08-shader-accents-and-distribution.md` — the iOS Metal engine, render
  pipeline, `.metallib` bundling, `ShaderId` registry, runtime-compilation analysis.
- `_legacy/04-preset-system.md`, `_legacy/09-api-layering.md` — typed uniforms +
  JS resolution (now `50`).
- `02-capability-ir-and-lowering.md` — the `shader` rungs; `structure.{ios,android}.md` — mechanics.
