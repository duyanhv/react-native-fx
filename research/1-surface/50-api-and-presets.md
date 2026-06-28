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
| **2 · Primitives** | the composable components: `FxPresence`, `FxView`, `FxPressable` (wrap *your* content); `<Fx>` (effects, single or stack); `Fx.Scroll` (hosted scroll-source context); `FxGroup`/`FxItem` | power users | `54`, `55`, `57` |
| **3 · Builders & data** | `fx.effect.*` → `EffectStack`, `fx.motion.*` → `MotionSpec`, `fx.source.*` → `SourceSpec`; BYO assets | escape hatch | `55` |

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
| `motion` | **typed `MotionSpec` map** | **explicit shape override** — fixes the shape cross-platform. *Different map per component* (phases vs states), never one universal map. **The sole shape-override channel — no partial top-level shape props (`edge`/`origin`); MOT-004/DEF-005.** |
| `tune` *(deferred — V1.x / MOT-002)* | `{ speed, emphasis, distance }` | **intent** adjustment inside the platform family (`41`). Not on the V1 surface (DOC-019). |
| `transition` | `{ duration?, delay?, easing?, spring? }` | **expert timing override only** — never a shape |
| `effect` | **`EffectStack`** or effect id | the visual effect bundle/layer(s). **Two meanings by owner:** on `<Fx>` it *is* the fx-owned drawn surface; on `FxView` it is decoration *attached to your content*. |
| `feedback` | press-behavior id (`native`) | press feedback bundle (`FxPressable`) |
| `state` | named discrete | mounted-**state** target (`FxView`); native eases |
| `visible` | boolean | presence **lifecycle** target (`FxPresence`) — mount retention, exit, unmount |
| `composition` | `background \| overlay \| surface` | effect-layer position only |
| `interactionMode` | `none \| passive \| active \| controlled` | interactive **effect** surface (`<Fx>`, `30`) — shader uniforms `pressDepth`/`pointerX/Y` |
| `source` | **`SourceSpec`** (`fx.source.scroll`) | **native source binding** — drives an fx-owned hosted scroll context's tiles from native scroll position (`Fx.Scroll`, `40`); iOS-hosted render-server (DEF-014), deferred elsewhere |

`preset` / `feedback` / `effect` are three **preset-like bundles** on three different owned
surfaces — a clear domain split, not a reduction. Events: `onTransitionEnd` (`{phase}`),
`onStateChange`, `onPress*`, `onLoad`/`onError`. These are the **public** prop names; the
native views register prefixed names (`onShader*`/`onFx*`) — the canonical mapping is pinned
in `40` §Native ↔ public event-name mapping.

**Builders and data types** (`55`/`41`): `fx.effect.*` → `EffectStack` (visual
layers); `fx.motion.*` → `MotionSpec` (shape); `fx.source.*` → `SourceSpec` (a native
source binding — DEF-014). `motion` takes a `MotionSpec` map; `effect` takes an
`EffectStack`; `source` takes a `SourceSpec`; `transition` takes a `Transition`. They
never cross.

### Per-component surfaces (props are scoped, not shared)

```tsx
<FxPresence visible preset="transient" motion={{ enter, exit }} transition />        // lifecycle
<FxView     state="selected" preset="lift" motion={{ idle, selected }} effect transition />  // mounted state
<FxPressable feedback="native" onPress />                                            // press recognizer
<Fx         effect="plasma" interactionMode="active" onPress />                      // drawn effect (+ interactive)
<FxGroup>…</FxGroup> / <FxItem>…</FxItem>                                            // morph compound
```

`visible` only on `FxPresence`; `state` only on `FxView`; `feedback` only on `FxPressable`;
`interactionMode` only on `<Fx>`. Need both presence and state? Nest:
`<FxPresence visible><FxView state>…`. The "shared" props are **shared conceptually but
still scoped by owner** — there is no universal prop:

- `transition` (and the V1.x-deferred `tune`) applies only where a `motion`/`preset` exists (the components that move).
- `effect` applies to `<Fx>` (the drawn surface) and optionally to `FxView` (decoration on
  your content) — different meaning per owner.
- `composition` applies **only to effect layers** (where the effect sits), nowhere else.

### Lane 1 interaction surface direction

Lane 1 interactions follow the same layered surface as presence and effects: preset first,
builder/IR underneath, and typed overrides only where they preserve the preset's ownership.

The authoring surface is an `interaction` preset on the component that owns the target:

```tsx
<FxPresence
  visible={open}
  interaction={{ type: "dragDismiss", direction: "positive", distance: "self" }}
  onSignalEvent={handleSignal}
/>
```

This is a direction for future source-driven interactions, not a shipped blanket prop; the exact
event prop name is settled with the first feature. The rule it pins is the important part:

- developers choose an interaction shape, not a graph;
- the lowered `source -> mapping -> settle -> target` descriptor is implementation IR, not the
  public authoring object;
- overrides are typed leaf parameters per preset, not descriptor patches;
- an override may tune thresholds, distance, direction, spring, or enabled state;
- an override may not change source type, target property, event kinds, lifecycle target,
  retention, layout participation, or introduce a new React-unowned outcome.

Lifecycle-committing interactions attach to the lifecycle owner (`FxPresence` or a future flow
slot). Pure continuous mappings attach to the content-motion or effect owner. In both cases the
surface stays preset-first and platform-native by default.

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
  **Deferred — no V1 consumer (DOC-025 / DOC-029):** fx exposes platform-native presentation
  presets, not a color-token / theme layer, until a real consumer forces it. `presets/{palettes,themes}.ts`
  are not built.
- `time`/`resolution` are **never** in the resolved record (native-injected).

The resolved value crosses as one flat record; native runs no preset branching.

**V1 resolution status (DOC-025):** the section above describes the *designed* surface. In shipped
V1 the `preset` bundle resolves **natively** — `FxPresence` passes `preset` raw to the native
coordinator, where the platform catalog lives (the shape-native law, `41`). The JS resolver /
defaults-merge (`src/presets/`) is **deferred** — no consumer until `<Fx effect>` (Unit 10/11)
needs JS default-merge.

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

All ten ship in the package today — each with a native MSL (iOS) + AGSL (Android)
implementation on the hosted substrate, device-verified on iOS 17+ and Android API 33+
(U3-006). They are reachable from JS through the canonical `<Fx effect="id">` surface
(shipped + device-verified, U10-001) — `<Fx effect="aurora" />` decorative, or
`interactionMode="active"` for the interactive path. The iOS interactive raster path renders a
subset of the catalog (`fractal-clouds` / `ink-smoke` / `liquid-chrome` / `loop` / `dots`); the
rest are hosted-only on iOS and report `onError` if mounted interactive, while Android's AGSL
path renders all ten interactively.

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
   override, `tune` adjusts intent, `transition` is expert timing. **V1 ships the
   `preset`/`motion`/`transition` triad; `tune` is deferred to MOT-002 (DOC-019).** Props are scoped to their
   owning component (`visible`→`FxPresence`, `state`→`FxView`, `feedback`→`FxPressable`,
   `interactionMode`→`<Fx>`), not a flat pool.
3. **Builder namespaces map one-to-one to data types** — `fx.effect`→`EffectStack`,
   `fx.motion`→`MotionSpec`, `fx.source`→`SourceSpec` (the source-binding builder, DEF-014);
   they are not interchangeable. `preset`/`feedback`/`effect` are
   three preset-like bundles on different owned surfaces (an honest domain split).
4. **Props by default; compound only for real native layers** (`FxGroup`/`FxItem`).
5. **Presets resolve in JS**; palettes/themes are pure config; `time`/`resolution` never in
   the record. V1 shader uniforms are shared and minimal. **V1 narrowing (DOC-025/DOC-029):**
   in shipped V1 the `preset` bundle resolves **natively** (`FxPresence` passes it raw; the JS
   resolver is deferred, no consumer); palettes/themes are **deferred — no V1 consumer** (not a
   design-token layer).
6. **The component layer is the adapter** — `select()` over the manifest; degrades, never
   throws. **BYO reuses the `shader` node**, no separate API.

## Decisions

7. **V1 vocabulary ratified (DOC-005), presence set narrowed (DOC-018).** The `preset`/`feedback`/`effect` value sets that ship in V1 are: `transient` (presence); `lift` (state); `native` (feedback); `edge-glow` · `mesh-gradient` · `glass` + the ten curated shader ids (`22`, ratified by DOC-007). `sheet`/`modal` (presence) are **deferred to `DEF-018`** (re-homed from MOT-001 at its closure, U7-003) — they name screen-scale presentations that collide with presence's scope ceiling (`42`, DOC-018). The `transient` per-platform defaults are **device-verified** (MOT-001 closed, U7-003); the `lift` (state) and `native` (feedback) defaults stay **device-pending** — they ride the as-yet-unbuilt `FxView` / `FxPressable`.
8. **Surface-freeze naming pass ratified (DEF-015, 2026-06-13).** The public surface is frozen with four calls:
   - **`<Fx effect={fx.effect.*}>` stays as-is.** The repetition of the `fx`/`effect` token appears only at the layer-3 builder call site (the power-user escape hatch); the front door is the string form `<Fx effect="plasma" />` and the presets, which do not repeat. The `fx.effect.* → EffectStack` / `fx.motion.* → MotionSpec` symmetry (Decision 3) is a deliberate mnemonic and is not broken to de-stutter a rare site. Lead public docs with the string form; treat `fx.effect.*` as the escape hatch. **No bare `effect` export ships in V1** (`55`).
   - **`interactionMode` and its `none | passive | active` vocabulary stay.** The names are platform-agnostic (no rule-#2 leak), and the obvious intent-word substitutes collide inside fx's own vocabulary (`pressable` is `FxPressable`; `reactive` reads as Reanimated). The V1 *public* value set was `none | passive | active`; `controlled` was deferred to DEF-020 and **ships in V2 (device-verified 2026-06-15)** as the view-ref discrete `setUniform`/`setHighlight` write path (continuous motion stays DEF-006; the detached `SharedObject` handle is DEF-021) — `30`.
   - **`hosted` / `expo-view` stay research-internal.** They are lowering vocabulary, never end-user vocabulary; the user picks a capability (`preset`/`effect`/`interactionMode`) and the adapter derives the substrate. Public docs state capability constraints ("interactive effects need an interactive surface"), never substrate names (`01`/`02`).
   - **The package publishes unscoped as `react-native-fxkit`** (revised 2026-06-13 — already owned and published, `react-native-fxkit@0.0.1`). The unscoped `react-native-fx` is unclaimable (npm typosquat filter vs `react-native-fs`), and a scoped `@react-native-fx/core` would force a by-hand npm org creation; `react-native-fxkit` is claimed and removes that step. API symbols stay short — `Fx`, `FxPresence`, `FxView`, `FxPressable`, `EdgeGlow`, `fx.effect.*`/`fx.motion.*` — so install/import read `react-native-fxkit` while the surface keeps the `fx`/`Fx` branding (the package name is not an API symbol). The mechanical `package.json` + docs rename to `react-native-fxkit` is DEF-016 (no scope-claim step).
9. **The `source` driver surface ratified + shipped on iOS hosted (DEF-014, 2026-06-14).**
   The native-source binding is `fx.source.scroll({ axis })` → `SourceSpec`, applied to the
   minimal `Fx.Scroll` hosted scroll context. Three calls, made under the DEF-015 naming
   discipline (agnostic, no `hosted`/`expo-view` leak):
   - **`fx.source.scroll` joins `fx.effect.*`/`fx.motion.*`** as the third builder namespace
     (Decision 3) — one namespace, one data type, mnemonic-consistent.
   - **`Fx.Scroll` is a compound under `Fx`.** It ships today as an `Fx` namespace object
     (`{ Scroll }`); when the general `<Fx effect>` surface lands (Decision 8) it becomes a
     callable component carrying the same `.Scroll` static — forward-compatible, no rename.
   - **The source binds at the container, with tiles as fx-owned data, not children.** Live RN
     content cannot be scroll-linked without hosting it (rule #4 — it would sever RN touch), so
     `Fx.Scroll` takes a `tiles` data prop of fx's own generative effects, not JSX children; the
     `source` binding is container-scoped. A per-`<Fx>`-item source binding can arrive only for
     fx-owned effect children, never wrapped RN content. iOS ships the render-server tier;
     Android ships the fx-owned best-effort UI-thread tier; the ambient-RN-scroll tier is
     deferred (`40`/`02`).

## Open questions

- ~~**`uniforms`/spec memoization**~~ — **resolved (SURF-010; verified SDK 56, iOS + Android).**
  No manual memoization is required: the native side compares props by *value*, not reference
  (Expo's `previousProps` per-prop equality), so an inline builder that re-resolves to the same
  value triggers no native work. React Compiler memoizes the builder chain automatically; without
  it, module-level constants for static presets are an optional optimization, not a correctness need.
- ~~**Theme distribution**~~ — **resolved (SPINE-002; DOC-003).** Consumer-authored
  palettes/themes as a shareable artifact are deferred to V2. Pure-config palettes resolve
  in JS within the core package (`presets/`). A distribution surface would live in
  `@react-native-fx/lab` if demand justifies the split (`52` Decision #11).

## Sources

- `_legacy/09-api-layering.md` (prop-vs-compound, the layered surface), `_legacy/04`
  (JS resolution, shallow-merge override).
- `02` (the manifest + `select()`), `40` (reactive props + the data-flow contract), `41`
  (the law + `tune`), `54`–`57` (the per-surface detail this umbrella governs).
