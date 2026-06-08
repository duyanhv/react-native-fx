# Capability IR & the lowering manifest
Status: researched
Feeds: structure.ios.md, structure.android.md, 03-adapter-vs-compiler.md, 50-api-and-presets.md

## Why this matters

fx exposes one platform-agnostic vocabulary of effects and renders each on the
best native primitive per platform — SwiftUI/MSL on iOS, Compose/RenderEffect/AGSL
on Android. The thing that ties those two worlds together is a single **capability
manifest**: a structured table, keyed by IR node then platform, that says exactly
how each effect lowers, what it needs, and what to fall back to.

This doc pins the **schema of that manifest** — the contract. Everything else in
the system is a *consumer* of it: the adapter dispatches against it, the compiler
lowers against it, runtime feature-detection gates against it, substrate selection
and clock wiring read from it. The two `structure.{ios,android}.md` resources are
the **human-readable rendering of one platform column each**; this schema is their
shared source of truth. Get this right and the iOS/Android divergence stays
localized in data, with every other layer platform-agnostic above it.

The manifest is the dispatch + contract layer, **not** a code generator. It
declares *that* a node lowers to a native primitive or a generated shader and with
what requirements; the native bindings, the IR→MSL/AGSL emitter, and the runtime
(G) are the engines it points at.

## Canonical IR node vocabulary

The node ids are the single naming authority. They name the manifest keys, the
capability doc filenames (`20-fills` … `24-symbols`), and the public prop/component
vocabulary. Never name anything `swiftui*` or `compose*` above the manifest.

| Node id | Taxonomy kind | Interaction | Phase |
|---|---|---|---|
| `fill` | render-target | none | v1 |
| `material` | render-target | self | v1 |
| `shader` | render-target | fx | v1 |
| `filter` | modifier | none | v1 |
| `motion` | driver | none | v1 |
| `symbol` | render-target | self | v1 |
| `shape-morph` | render-target | none | v2 (Android-only) |
| `content-distort` | modifier | none | v2 / out-of-scope on iOS |

`interaction` is `none` (inert/decorative), `self` (a system component that handles
its own gestures — glass, symbols), or `fx` (fx-managed interaction, which may demand
the `expo-view` substrate). Only `fx` nodes route to the runtime (G).

The `runtime` layer (G — touch, hit-test, scheduling, SDF pass-through) is **not**
a render node; it is the substrate the interactive nodes sit on, owned by the
`3x-*` docs, not the manifest.

## The schema

The manifest is TypeScript — it doubles as the runtime type the consumers import.

```ts
// ── shared vocabularies ──────────────────────────────────────────────
export type Platform  = 'ios' | 'android';
/** hosted = SwiftUI/Compose host (decorative, Host boundary, pointerEvents passthrough).
 *  expo-view = plain native UIView/ViewGroup (the G runtime; required for interaction). */
export type Substrate = 'hosted' | 'expo-view';
/** how a candidate is realized. */
export type Via       = 'native' | 'shader' | 'draw' | 'lib' | 'none';
/** the build-time asset a candidate consumes, if any. */
export type Asset     = 'metal' | 'agsl' | 'lottie' | 'none';
/** the time source when the node animates. */
export type Clock     = 'timeline' | 'display-link' | 'frame-nanos' | 'infinite-transition' | 'none';
export type Phase     = 'v1' | 'v2';
export type NodeKind  = 'render-target' | 'modifier' | 'driver';
export type Status    = 'supported' | 'planned' | 'out-of-scope';
/** none = inert/decorative · self = self-gesturing system component · fx = fx-managed (may demand expo-view). */
export type Interaction = 'none' | 'self' | 'fx';

// ── one rung of the fallback ladder ──────────────────────────────────
export interface Lowering {
  via: Via;
  /** when via:'native' — the concrete symbol, e.g. 'MeshGradient', '.glassEffect'. */
  primitive?: string;
  /** the attachment mechanism / where it applies, e.g. '.colorEffect',
   *  'RenderEffect', '.overlay', 'graphicsLayer.renderEffect', 'MTLRenderPipelineState'. */
  applyVia?: string;
  /** when via:'shader' | 'lib' — the asset it needs. */
  asset?: Asset;
  /** time source when animated; null for static. */
  clock?: Clock;
  /** kind:'driver' rungs only — what this rung animates. The selector matches it to
   *  ctx.target ('content' | 'effect'); stated explicitly, not inferred from substrate. */
  target?: 'content' | 'effect';
  /** the guard — ALL fields must hold for this candidate to be eligible. */
  requires: {
    os: number;            // min OS: iOS major (17, 18, 26) | Android API (31, 33)
    substrate: Substrate;  // which substrate this lowering lives on
    feature?: string;      // optional extra capability flag
  };
  /** the phase THIS rung lands in; defaults to the node's `phase`. A node can be v1 for
   *  one rung (hosted effect motion) and v2 for another (wrapped-content motion). */
  phase?: Phase;
  status?: Status;         // default 'supported'; marks landmines / planned work
  note?: string;
}

// ── one IR node (capability) ─────────────────────────────────────────
export interface UniformSpec {
  type: 'number' | 'color' | 'vec2' | 'vec4' | 'enum';
  default: unknown;
  range?: [number, number];
  options?: string[];      // for type:'enum'
}

export interface CapabilityNode {
  id: string;              // canonical node name (the vocabulary authority)
  kind: NodeKind;          // A–G taxonomy slot
  interaction: Interaction; // none | self | fx — only 'fx' may demand the expo-view substrate
  phase: Phase;
  uniforms?: Record<string, UniformSpec>;    // render-target/shader inputs (per-shader detail may defer to its capability doc)
  properties?: Record<string, UniformSpec>;  // kind:'driver' only — the animatable channels motion eases (opacity, transform)
  /** ORDERED fallback ladder per platform; the selector takes the first satisfiable rung. */
  lower: Record<Platform, Lowering[]>;
}

/** the selector's runtime context. `target` chooses a driver node's rung (content vs effect). */
export interface SelectCtx {
  deviceOS: number;
  wantInteractive?: boolean;
  target?: 'content' | 'effect';   // default 'effect'; only kind:'driver' nodes read it
}

export interface CapabilityManifest {
  schemaVersion: 1;
  nodes: Record<string, CapabilityNode>;
}
```

## The selection rule (the fallback ladder)

Every consumer picks a lowering the same way: walk the node's per-platform list
top-to-bottom and take the first rung whose guard holds. Order the list
best-first; put hosted/decorative rungs and interactive rungs in the order that
matches the intended default, and let `requires` filter the rest.

```
select(node, platform, ctx = { deviceOS, wantInteractive, target = 'effect' }):
  for rung in node.lower[platform]:          # ordered, best-first
    if rung.status == 'planned':             continue
    if rung.status == 'out-of-scope':        continue
    if rung.requires.os > ctx.deviceOS:      continue
    if rung.requires.feature and rung.requires.feature not in ctx.features:  continue
    if ctx.wantInteractive and node.interaction == 'fx'
       and rung.requires.substrate != 'expo-view':  continue   # only fx-managed interaction needs the G substrate
    if node.kind == 'driver' and rung.target and rung.target != ctx.target:  continue   # motion: match the rung's declared target, not its substrate
    return rung
  return { via: 'none' }                      # empty/guarded-out ladder ⇒ unavailable, never throw
```

The `features` guard (line 146) ensures a rung like Android `shape-morph` (which
requires `feature: 'm3-expressive'`) is only selected when the runtime has
confirmed the feature is present. If `features` is absent or empty, the rung is
skipped and the ladder degrades.

The `wantInteractive` clause is the load-bearing one: it is how a single node
(e.g. `shader`) carries both a **hosted decorative** rung and an **expo-view
interactive** rung, and the selector chooses by intended use. Decorative usage
prefers the hosted rung (auto-Host passthrough, no G); interactive usage forces
the expo-view rung (plain UIView, G runtime, host-safe hit-testing).

## Worked examples

### `fill` — an OS fallback ladder, and mesh-as-shader on Android

```ts
fill: {
  id: 'fill', kind: 'render-target', interaction: 'none', phase: 'v1',
  lower: {
    ios: [
      { via: 'native', primitive: 'MeshGradient',  applyVia: '.overlay', clock: 'timeline',
        requires: { os: 18, substrate: 'hosted' } },
      { via: 'native', primitive: 'LinearGradient', applyVia: '.overlay',
        requires: { os: 13, substrate: 'hosted' }, note: 'pre-18 fallback' },
    ],
    android: [
      { via: 'shader', asset: 'agsl', applyVia: 'ShaderBrush', clock: 'frame-nanos',
        requires: { os: 33, substrate: 'hosted' }, note: 'mesh has no native primitive → AGSL' },
      { via: 'native', primitive: 'Brush.sweepGradient', applyVia: 'background',
        requires: { os: 21, substrate: 'hosted' }, note: 'pre-33 fallback' },
    ],
  },
},
```

### `shader` — one node, both substrates; BYO reuses it

```ts
shader: {
  id: 'shader', kind: 'render-target', interaction: 'fx', phase: 'v1',
  uniforms: {
    intensity: { type: 'number', default: 1, range: [0, 3] },
    colorA:    { type: 'color',  default: '#5B8CFF' },
  },
  lower: {
    ios: [
      { via: 'shader', asset: 'metal', applyVia: '.colorEffect', clock: 'timeline',
        requires: { os: 17, substrate: 'hosted' }, note: 'decorative overlay (Aurora-class)' },
      { via: 'shader', asset: 'metal', applyVia: 'MTLRenderPipelineState', clock: 'display-link',
        requires: { os: 17, substrate: 'expo-view' }, note: 'interactive surface (G runtime)' },
    ],
    android: [
      { via: 'shader', asset: 'agsl', applyVia: 'RenderEffect', clock: 'frame-nanos',
        requires: { os: 33, substrate: 'hosted' } },
      { via: 'shader', asset: 'agsl', applyVia: 'View.setRenderEffect', clock: 'frame-nanos',
        requires: { os: 33, substrate: 'expo-view' }, note: 'plain View/ViewGroup (RenderNode-backed setRenderEffect), not a Compose modifier; draw-time, touch-safe' },
    ],
  },
},
```

**BYO is not a new node.** A bring-your-own effect is a `shader` node whose
`asset` files (`.metal` + `.agsl`) are supplied by the developer instead of
shipped curated; it reuses these exact rungs. The manifest does not special-case
it — same lowering, different asset origin.

### `material` — iOS-premium, Android library fallback

```ts
material: {
  id: 'material', kind: 'render-target', interaction: 'self', phase: 'v1',
  lower: {
    ios: [
      { via: 'native', primitive: '.glassEffect',       applyVia: '.glassEffect',
        requires: { os: 26, substrate: 'hosted' }, note: 'Liquid Glass' },
      { via: 'native', primitive: '.ultraThinMaterial', applyVia: '.background',
        requires: { os: 15, substrate: 'hosted' }, note: 'pre-26 fallback' },
    ],
    android: [
      { via: 'native', primitive: 'RenderEffect.createBlurEffect', applyVia: 'graphicsLayer',
        requires: { os: 31, substrate: 'hosted' }, note: 'blur + overlay glassmorphism' },
      { via: 'lib', asset: 'none', applyVia: 'Haze',
        requires: { os: 21, substrate: 'hosted' }, note: 'pre-31 backport' },
    ],
  },
},
```

### `content-distort` — the asymmetry, encoded

This is the effect-over-live-RN-content case. The manifest records *why* it is out
on iOS and merely planned on Android, so the landmine lives in data, not folklore.

```ts
'content-distort': {
  id: 'content-distort', kind: 'modifier', interaction: 'none', phase: 'v2',
  lower: {
    ios: [
      { via: 'native', primitive: '.layerEffect', requires: { os: 17, substrate: 'hosted' },
        status: 'out-of-scope', note: 'hosting RN content to sample it severs RN touch (01, rule #4)' },
    ],
    android: [
      { via: 'shader', asset: 'agsl', applyVia: 'RenderEffect', clock: 'frame-nanos',
        requires: { os: 33, substrate: 'expo-view' }, status: 'planned',
        note: 'RenderEffect is draw-time → touch survives; Android-only capability' },
    ],
  },
},
```

### `shape-morph` — Android-only, empty iOS ladder

M3 Expressive gives Android a native shape morph with no iOS equivalent. The iOS
ladder is empty, so the selector degrades to `{ via: 'none' }` — that is how a
platform-only capability is expressed.

```ts
'shape-morph': {
  id: 'shape-morph', kind: 'render-target', interaction: 'none', phase: 'v2',
  lower: {
    ios: [],   // no native shape-morph on iOS → selector returns { via: 'none' }
    android: [
      { via: 'native', primitive: 'MaterialShapes (morph)', applyVia: 'graphicsLayer',
        clock: 'frame-nanos',
        requires: { os: 21, substrate: 'hosted', feature: 'm3-expressive' },
        note: 'M3 Expressive native shape morph (Android-only)' },
    ],
  },
},
```

### `motion` — the animatable-property driver (the two realization families)

`motion` is the driver the whole Motion domain rests on: it eases a node's agnostic
animatable `properties` to **discrete targets**, native-eased — no per-frame JS. Its
ladder encodes the load-bearing split as **explicit fields on each rung**: a **content**
rung (`target:'content'`, `phase:'v2'` — animate the **fx-owned wrapper carrying RN content**
(`4-runtime/33`) via its transform on `expo-view`; touch survives because nothing is sampled)
and an **effect** rung
(`target:'effect'`, `phase:'v1'` — animate fx's own drawn layer on `hosted`). So the node
is v1-available for hosted effect motion without implying the content path ships in v1,
and the selector matches `rung.target` rather than guessing from substrate. Per the law,
the spring/easing each rung uses is the **platform's own default**.

```ts
motion: {
  id: 'motion', kind: 'driver', interaction: 'none', phase: 'v1',
  properties: {                                   // driver nodes use `properties`, not `uniforms`
    opacity:    { type: 'number', default: 1, range: [0, 1] },
    scale:      { type: 'number', default: 1, range: [0, 4] },
    translateX: { type: 'number', default: 0 },
    translateY: { type: 'number', default: 0 },
    rotate:     { type: 'number', default: 0 },   // degrees
  },
  lower: {
    ios: [
      { via: 'native', primitive: 'CASpringAnimation', applyVia: 'CALayer', clock: 'none',
        target: 'content', phase: 'v2',
        requires: { os: 13, substrate: 'expo-view' },
        note: 'animates the fx-owned wrapper carrying RN content (33); Core Animation owns timing; transform-only ⇒ touch-safe (rule #4)' },
      { via: 'native', primitive: 'SwiftUI .animation', applyVia: '.animation', clock: 'none',
        target: 'effect', phase: 'v1',
        requires: { os: 16, substrate: 'hosted' },
        note: "fx's own drawn layer; SwiftUI spring" },
    ],
    android: [
      { via: 'native', primitive: 'SpringAnimation', applyVia: 'View (dynamicanimation)', clock: 'none',
        target: 'content', phase: 'v2',
        requires: { os: 21, substrate: 'expo-view' },
        note: 'ViewPropertyAnimator / androidx.dynamicanimation; touch-safe' },
      { via: 'native', primitive: 'animate*AsState', applyVia: 'Compose', clock: 'infinite-transition',
        target: 'effect', phase: 'v1',
        requires: { os: 21, substrate: 'hosted' },
        note: "fx's own drawn layer; Jetpack Compose, M3 Expressive springs where present" },
    ],
  },
},
```

**`presence` and the chain's `.animate()` are orchestrations over `motion`, not new
primitives.** `FxPresence` (`1-surface/54`) adds the enter/hold/exit lifecycle and the
`preset` defaults in the runtime (`4-runtime/33`–`35`) and surface; the chain attaches a
`transition` to a stacked layer. Both dispatch to these same rungs. The Motion semantics
live in `3-motion/41`–`42`; the mechanics in `4-runtime` + `5-realization`.

## Who reads what

Every consumer is a pure function of the manifest. This table is the coverage
proof — each consumer's needs are fields the schema carries.

| Consumer | When | Reads | Produces |
|---|---|---|---|
| **Adapter dispatch** | runtime (JS wrapper) | `lower[platform]`, `requires.os`, `primitive`, `applyVia`, `substrate` | which native view/prop to mount |
| **Compiler lowering** | build time | rungs with `via:'shader'`, `asset`, `applyVia`, `clock`, `uniforms` | emitted `.metal`/`.agsl` + native binding |
| **Runtime feature-detection** | runtime | `requires.os`, `requires.feature`, ladder order | chosen rung / graceful `none` |
| **Substrate selection** | runtime | `node.interaction`, `node.kind`, `requires.substrate`, `ctx.target` | hosted vs expo-view mount (drivers fork by `target`) |
| **Clock wiring** | both | `clock` | TimelineView / display-link / frame-nanos |
| **Build / scaffolding** | build time | `asset` (which shader files must exist), `primitive` (which bindings to gen) | asset + binding manifest |

## Decisions

1. **The manifest is the single source of truth; `structure.{ios,android}.md` is its
   rendered prose, one platform column each.** Keep them generated-from or
   lockstep-with the manifest; never let a mechanic drift between them.
2. **Node ids are the naming authority** — manifest keys = capability doc names =
   public prop vocabulary. No `swiftui*`/`compose*` names above the manifest.
3. **A cell is an ordered fallback ladder**, not one entry. The selector takes the
   first rung whose `requires` holds; unavailable degrades to `via:'none'`, never
   throws — consistent with "hard to make ugly."
4. **`interaction` + `requires.substrate` together encode the substrate fork.**
   `interaction` is `none | self | fx`; only `fx` nodes route to the `expo-view`
   substrate under interactive use, while `self` nodes (glass, symbols) self-handle
   inside `hosted`. One node can still offer a hosted rung and an expo-view rung;
   intended use selects between them.
5. **BYO is a `shader` node with developer-supplied assets**, not a separate
   mechanism. Same rungs, different asset origin.
6. **The manifest is dispatch + contract, not codegen.** It points at three
   hand-written engines: native bindings, the IR→MSL/AGSL emitter, and the runtime
   (G). Green rungs (`via:'native'`) are complete from the manifest; blue rungs
   (`via:'shader'`) still need the emitter.
7. **Adapter and compiler are both manifest consumers** — adapter is the trivial
   reader, compiler the sophisticated one. The choice between them is deferrable
   (`03-adapter-vs-compiler.md`) because the source of truth does not change.
8. **Out-of-scope and planned rungs stay in the manifest** with `status`, so
   platform asymmetries (e.g. `content-distort`) are documented as data.
9. **A node with no satisfiable rung on a platform is *unavailable*, not an error.**
   An empty ladder, or one where every rung is guarded out or `out-of-scope`,
   degrades to `{ via: 'none' }`. This is how platform-only capabilities are
   expressed (`shape-morph` absent on iOS, `content-distort` out-of-scope on iOS).
10. **Motion is one driver node with a content rung and an effect rung.** `motion`
    eases agnostic animatable properties to discrete targets; the same node carries a
    `expo-view` content rung (wrap RN content in an fx-owned wrapper and animate that,
    transform-only ⇒ touch-safe) and a
    `hosted` effect rung (fx's own layer). `presence` and the chain's `.animate()` are
    orchestrations over it, not new primitives. The default spring/easing is always the
    platform's own (the law).
11. **The content-vs-effect fork is explicit on the rung, matched by a `target` axis.**
    Each `kind:'driver'` rung declares `target: 'content' | 'effect'`; `select(node,
    platform, ctx)` keys on `{ deviceOS, wantInteractive, target }` (default `'effect'`)
    and matches `rung.target` directly — it does **not** infer content-vs-effect from
    `hosted`/`expo-view`. Other nodes ignore `target`. Likewise each rung may carry its
    own `phase` (content motion is v2, hosted effect motion v1), so phase is per-rung, not
    only per-node.

## Open questions

- **Where does per-effect typed config live** — every node kind has typed inputs, not just
  `shader`: `fill`/`material`/`shader`/`symbol` carry `uniforms`-style config, `filter` its
  modifier params, `motion`/driver its `properties`. The manifest should describe typed
  config for **every effect node**, fully inline (`uniforms`/`properties`) or via a generated
  types file. Lean: canonical in the manifest, TS types generated from it. (The worked
  examples here currently show only `shader`/`motion` config; at implementation they should
  grow to include `fill`/`material`/`filter`/`symbol` typed config too.)
- **Composition modes in the schema** — does `composition` (background/overlay/
  surface) belong on the node, on the rung, or stay a separate prop resolved by the
  API layer (`50`)? Lean: API-layer prop, not manifest.
- **Multiple assets per rung** — a shader needing helper functions or a texture.
  Currently `asset` is singular; promote to `assets: Asset[]` if needed.
- **`feature` flag vocabulary** — enumerate the non-OS capability flags (e.g. a
  specific Metal feature set, AGSL extension) or keep free-form until a real case.
- **Manifest partitioning** — one file, or split per node / per layer once the node
  count grows? Affects how `structure.{ios,android}.md` are rendered.
- **`via:'lib'` dependency contract** — **resolved** (`6-ship/53` decision 6): a `lib` rung
  (Haze, Lottie) is an **optional peer dependency** the app installs, guarding out (degrading
  the ladder) if absent. The only open part: whether the manifest **names the package +
  version**.
- ~~The selector needs a `target` axis for `motion`.~~ **Resolved (decision 11):**
  `ctx.target: 'content' | 'effect'`, default `'effect'`; `motion` picks the matching
  substrate rung, other nodes ignore it.

## Sources

- `structure.ios.md`, `structure.android.md` — the per-platform realization and API
  inventories (version gates, primitives) the rungs draw from.
- `01-substrates-and-hosting.md` — the hosted vs expo-view substrate definitions and
  the expo Host-boundary constraint (#46549) that `requires.substrate` encodes.
- `03-adapter-vs-compiler.md` — the two consumer strategies this schema feeds.
- `30-interaction` — why interaction forces the expo-view substrate.
- `04`/`50-api-and-presets` — JS-side resolution, presets/palettes, and BYO assets.
