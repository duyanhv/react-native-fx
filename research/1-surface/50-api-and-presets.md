# API model & presets
Status: researched
Phase: v1
Feeds: the public package; consumes 02, 20–24, 30, 40; defines the shared surface for 54–57
Owns: the public JS surface — the three layers, the shared prop language, presets/palettes, adapter dispatch.

## Why this matters

The public surface is the product (the consumer persona, `00`). fx is a **presentation
runtime**, so the surface spans more than effects: content presence, content motion, and
effects, all behind one prop language. This doc is the umbrella — it defines the **three
public layers**, the **shared prop vocabulary** (so a word like `transition` means exactly
one thing everywhere), and how presets resolve and the adapter dispatches. The per-surface
detail lives in `54`–`57`; everything here is platform-agnostic.

## The three public layers

The hierarchy is explicit and ordered top-down — **platform-native behavior presets are the
front door**,
because the goal is native-feeling defaults, not asking users to design motion/effects from
scratch. **fx is not a UI kit; it wraps any UI kit.** So the top layer is named
presentation *behaviors* (presets applied to *your* content), not exported UI components.

| Layer | What it is | Who | Docs |
|---|---|---|---|
| **1 · Behavior presets** (platform-native) | named behaviors via props on primitives — `preset="transient"`, `feedback="native"`, `effect="edge-glow"` — applied to *your* content; each resolves the whole behavior per platform. Plus the curated **effect components** fx draws whole (`EdgeGlow`/…) — the one exception. | 95% of users | `56` |
| **2 · Primitives** | the composable components: `FxPresence`, `FxView`, `FxPressable` (wrap *your* content); `<Fx>` (effects, single or stack); `FxGroup`/`FxItem` | power users | `54`, `55`, `57` |
| **3 · Builders & data** | `fx.effect.*` → `EffectStack`, `fx.motion.*` → `MotionSpec`; BYO assets | escape hatch | `55` |

A preset (layer 1) is a primitive (layer 2) with a `preset`/`feedback`/`effect` + native
defaults; a primitive accepts builder output (layer 3) when you customize past the
defaults. Each layer is a thin skin over the one below. **fx ships presets and primitives,
not toasts and buttons** — only effects, which fx owns whole, are also named components.

## The prop language (one word, one meaning; scoped by ownership)

Each prop means exactly one thing, and props are **scoped to the component that owns the
behavior** — there is no flat "shared props" pool. The de-overload: `transition` is timing
only, and the `preset`/`motion`/`tune`/`transition` split is the law's shape-native engine
(`41`).

| Prop | Type | Meaning |
|---|---|---|
| `preset` | behavior id (`transient`, `lift`, …) | **platform-idiomatic behavior bundle** — fx resolves the *whole shape + timing per platform*. Behavior-named, never UI-named. |
| `motion` | **typed `MotionSpec` map** | **explicit shape override** — fixes the shape cross-platform. *Different map per component* (phases vs states), never one universal map. |
| `tune` | `{ speed, emphasis, distance }` | **intent** adjustment inside the platform family (`41`) |
| `transition` | `{ duration?, delay?, easing?, spring? }` | **expert timing override only** — never a shape |
| `effect` | **`EffectStack`** or effect id | the visual effect bundle/layer(s). **Two meanings by owner:** on `<Fx>` it *is* the fx-owned drawn surface; on `FxView` it is decoration *attached to your content*. |
| `feedback` | press-behavior id (`native`) | press feedback bundle (`FxPressable`) |
| `state` | named discrete | mounted-**state** target (`FxView`); native eases |
| `visible` | boolean | presence **lifecycle** target (`FxPresence`) — mount retention, exit, unmount |
| `composition` | `background \| overlay \| surface` | effect-layer position only |
| `interactionMode` | `none \| passive \| active \| controlled` | interactive **effect** surface (`<Fx>`, `30`) — shader uniforms `pressDepth`/`pointerX/Y` |

`preset` / `feedback` / `effect` are three **preset-like bundles** on three different owned
surfaces — a clear domain split, not a reduction. Events: `onTransitionEnd` (`{phase}`),
`onStateChange`, `onPress*`, `onLoad`/`onError`.

**Two builders, two data types** (`55`/`41`): `fx.effect.*` → `EffectStack` (visual
layers); `fx.motion.*` → `MotionSpec` (shape). `motion` takes a `MotionSpec` map; `effect`
takes an `EffectStack`; `transition` takes a `Transition`. They never cross.

### Per-component surfaces (props are scoped, not shared)

```tsx
<FxPresence visible preset="transient" motion={{ enter, exit }} tune transition />   // lifecycle
<FxView     state="selected" preset="lift" motion={{ idle, selected }} effect transition />  // mounted state
<FxPressable feedback="native" onPress />                                            // press recognizer
<Fx         effect="plasma" interactionMode="active" onPress />                      // drawn effect (+ interactive)
<FxGroup>…</FxGroup> / <FxItem>…</FxItem>                                            // morph compound
```

`visible` only on `FxPresence`; `state` only on `FxView`; `feedback` only on `FxPressable`;
`interactionMode` only on `<Fx>`. Need both presence and state? Nest:
`<FxPresence visible><FxView state>…`. The "shared" props are **shared conceptually but
still scoped by owner** — there is no universal prop:

- `transition` / `tune` apply only where a `motion`/`preset` exists (the components that move).
- `effect` applies to `<Fx>` (the drawn surface) and optionally to `FxView` (decoration on
  your content) — different meaning per owner.
- `composition` applies **only to effect layers** (where the effect sits), nowhere else.

## Props by default; compound only for real native layers

> **Compound components are honest only when each subcomponent is a real native view/layer.
> The moment a subcomponent would just carry configuration, it must be a prop.**

So nearly everything is flat props. The honest compounds are the **`FxGroup`/`FxItem`**
boundary (each item a real morphing native view — glass containers, `21`/`57`). No
config-children, no `asChild`.

## Presets, palettes, themes — resolved in JS

- A **preset** = a behavior id + a platform-default `motion`/`effect`/`transition` bundle
  (resolved per platform — the shape-native law, `41`). One defaults table is the single
  source of truth; tweak it once, the default behavior changes everywhere.
- **Override** = a `Partial<>` shallow-merged over the defaults in JS; override wins.
- **Palettes/themes** = named color sets applied across effects — pure config, shareable.
- `time`/`resolution` are **never** in the resolved record (native-injected).

The resolved value crosses as one flat record; native runs no preset branching.

## Adapter dispatch (the JS consumer of the manifest)

The component layer is the **adapter**: `select(node, platform, ctx)` over the manifest
(`02`) — `ctx` carries `{ deviceOS, wantInteractive, target }`. It picks the rung and
mounts the native view/prop. Unavailable degrades to a graceful no-op, never throws.

## BYO

A bring-your-own effect registers as a `shader` node with developer `.metal`+`.agsl` and a
uniform table (`22`); it flows through the identical preset/primitive/adapter path.

## V1 shader catalog

The V1 `ShaderId` catalog is `fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`,
`dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`.

`fractal-clouds`, `ink-smoke`, `liquid-chrome`, `loop`, and `dots` are the implemented
starter shaders. `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow` are V1
catalog entries that need native MSL+AGSL implementations before package types/runtime
expose them.

Public shader uniforms stay shared and minimal in V1. `intensity` is the stable semantic
override. `time`, `resolution`, `pressDepth`, and `touch` are native-owned values injected
by the runtime.

## Decisions

1. **Three explicit layers, platform-native behavior presets on top** — presets → primitives → builders;
   each a thin skin over the next. **fx ships presets and primitives, not UI components**
   (it wraps any UI kit); only effects, owned whole, are also named components.
2. **One prop language, scoped by ownership; `transition` is timing only.** The
   `preset`/`motion`/`tune`/`transition` split is the law's shape-native engine: `preset`
   resolves the whole behavior per platform, `motion` is the explicit cross-platform shape
   override, `tune` adjusts intent, `transition` is expert timing. Props are scoped to their
   owning component (`visible`→`FxPresence`, `state`→`FxView`, `feedback`→`FxPressable`,
   `interactionMode`→`<Fx>`), not a flat pool.
3. **Two builder namespaces, two data types** — `fx.effect`→`EffectStack`,
   `fx.motion`→`MotionSpec`; they are not interchangeable. `preset`/`feedback`/`effect` are
   three preset-like bundles on different owned surfaces (an honest domain split).
4. **Props by default; compound only for real native layers** (`FxGroup`/`FxItem`).
5. **Presets resolve in JS**; palettes/themes are pure config; `time`/`resolution` never in
   the record. V1 shader uniforms are shared and minimal.
6. **The component layer is the adapter** — `select()` over the manifest; degrades, never
   throws. **BYO reuses the `shader` node**, no separate API.

## Open questions

- **The preset vocabularies** — exactly which `preset`/`feedback`/`effect` values ship v1 and
  their native defaults (`56`, ties to the `42` preset set + `41`'s default catalog).
- **`uniforms`/spec memoization** — inline literals re-resolve each render; document
  stable-ref guidance.
- **Theme distribution** — consumer-authored palettes/themes as a shareable artifact (`52` `lab`).

## Sources

- `_legacy/09-api-layering.md` (prop-vs-compound, the layered surface), `_legacy/04`
  (JS resolution, shallow-merge override).
- `02` (the manifest + `select()`), `40` (reactive props + the data-flow contract), `41`
  (the law + `tune`), `54`–`57` (the per-surface detail this umbrella governs).
