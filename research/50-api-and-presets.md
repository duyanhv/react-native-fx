# API surface & presets
Status: researched
Phase: v1
Feeds: the public package; consumes 02, 20–24, 30, 40
Owns: the public JS surface — components, props, presets/palettes, BYO, adapter dispatch.

## Why this matters

The public surface is the product (the consumer persona, `00`). This doc is the
authoritative definition of the JS-facing API: the semantic components, how presets/
palettes/themes resolve in JS, the prop-vs-compound rule, the composition/interaction
props, and how the adapter dispatches over the manifest (`02`). Everything here is
platform-agnostic; the lowering it triggers lives in `structure.{ios,android}`.

## Components: semantic, capability-named

The front door is a small set of **semantic components**, named by capability/effect,
not by platform. Each is a thin JS binding that resolves props → a manifest node +
uniforms and mounts the adapter-selected native view.

```tsx
<MeshGradient palette="aurora" composition="background" />
<EdgeGlow mood="listening" playing={isLoading} />
<GlassView effect="regular" interactive />
<Shader id="plasma" uniforms={{ speed: 0.4 }} interactionMode="active" onPress={…} />
```

A generic `<Effect node="…">` primitive exists under the curated wrappers (the Tier-2
escape hatch), but curated semantic components are the surface 95% of users touch.

## Props by default; compound only for real native layers

The deciding rule (carried from `_legacy/09`):

> **Compound (shadcn/Radix-style) components are honest only when each subcomponent is
> a real native view/layer. The moment a subcomponent would just carry configuration,
> it must be a prop.**

So nearly everything is flat props on one component. The one honest compound is
`GlassContainer` (each child is a real glass view that morphs — `21`). No
config-children, no `asChild`, no copy-paste distribution.

## Orthogonal props: composition × interaction

Two separate, orthogonal props (never one collapsed `mode`):

- **`composition`** — `background | overlay | surface`: where the effect sits in the
  native layer order.
- **`interactionMode`** — `none | passive | active | controlled` (`30`): whether/how
  the recognizer attaches. Only meaningful for `interaction: 'fx'` nodes on `expo-view`.

Plus the reactive props from `40`: `state`/`mood`/`playing`, `transition`, and the
events (`onPress*`, `onTransitionEnd`, `onLoad`/`onError`).

## Presets, palettes, themes — resolved in JS

Resolution happens in JS, before the bridge (carried from `_legacy/04`):

- A **preset** = a capability node id + a typed uniform set. `SHADER_DEFAULTS` is the
  single source of truth; a designer tweaks one table and the default look changes
  everywhere.
- **Override** = a `Partial<>` of the chosen node's uniforms, **shallow-merged** over
  the preset defaults in JS; override wins.
- **Palettes/themes** = named color sets a consumer applies across effects — pure
  config, shareable, no native code.
- `time`/`resolution` are **never** in the resolved record (native-injected).

The resolved value crosses as one flat record; native runs no preset branching.

## Adapter dispatch (the JS consumer of the manifest)

The component layer is the **adapter**: it runs `select(node, platform, ctx)` over the
manifest (`02`), picks the rung for the device OS + intended interaction, and mounts the
corresponding native view/prop. Unavailable degrades to a graceful no-op (`{via:'none'}`),
never throws. This is the trivial manifest consumer; the compiler (`03`) is the later
additive one.

## BYO

A bring-your-own effect registers as a `shader` node with developer-supplied `.metal`+
`.agsl` assets and a uniform table (`22`); it then flows through the identical
component/preset/adapter path. No separate API.

## Decisions

1. **Curated semantic components are the front door**; a generic `<Effect>` primitive is
   the Tier-2 escape hatch. Components are capability-named, never platform-named.
2. **Props by default; compound only for real native layers** (`GlassContainer`).
3. **`composition` and `interactionMode` are separate orthogonal props.**
4. **Presets resolve in JS** — one `SHADER_DEFAULTS` table, shallow-merge override,
   palettes/themes as pure config; `time`/`resolution` never in the record.
5. **The component layer is the adapter** — `select()` over the manifest; unavailable
   degrades, never throws.
6. **BYO reuses the `shader` node + the standard path** — no separate API.

## Open questions

- **Final component set + naming** — which curated wrappers ship (`EdgeGlow`,
  `MeshGradient`, `GlassView`, …) vs the generic `<Effect>`; reconcile with the catalog (`22`).
- **`uniforms` memoization** — inline object literals re-resolve every render; document
  stable-reference guidance or shallow-compare.
- **Per-shader uniform typing source** — generate TS types from the manifest (`02`) vs
  hand-maintain.
- **Theme distribution** — are consumer-authored palettes/themes a shareable artifact of
  their own?

## Sources

- `_legacy/09-api-layering.md` — the prop-vs-compound rule, composition modes, the
  layered surface.
- `_legacy/04-preset-system.md` — JS resolution, `SHADER_DEFAULTS`, shallow-merge override.
- `02-capability-ir-and-lowering.md` (the manifest the adapter consumes), `40` (reactive
  props), `20`–`24` (the nodes), `30` (interaction).
