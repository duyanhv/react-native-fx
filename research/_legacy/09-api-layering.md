# API layering & component style
Status: researched
Feeds: skills/react-native-fx/references/shader-view.md, presets.md, interaction.md, effect-pressable.md, glass-view.md

## Why this matters
The public surface is the product. Under the thesis (`README`), fx V1 is an
**interactable native iOS Metal `ShaderView`** — an `MTKView`/`CAMetalLayer`-backed
Expo view that renders a curated, build-time `.metal` shader selected by id (`08`),
runs its own native loop, and owns native interaction (`05`). JS configures it
declaratively and never drives frames.

This doc is the **authoritative definition of the V1 public API**. It pins three
things and nothing should contradict it: (1) `ShaderView` is *the* primitive — the
single thing apps render; (2) its exact TypeScript surface — every prop, the
per-shader uniform typing, the imperative ref handle, and the semantic events; and
(3) whether any curated wrappers (`<EffectBackground preset>`-style) ship in V1 or
are deferred. All three are constrained by a fact unique to this library: **every fx
component is a native view**, so "composition" is a native compositing concern, not a
JS-tree concern (`05`/`08`), and "what layers with the shader" is a native question.

## Research questions
- What is THE primitive, and at what grain? (Answer: `ShaderView`, one curated
  semantic shader per native surface.)
- The full TS surface: `ShaderViewProps` (every prop + type + default), `uniforms`
  narrowed per `shader`, the `ShaderViewRef` imperative handle, and the events.
- Do curated wrappers (`<EffectBackground preset>`) exist in V1, or only
  `ShaderView` with curated `shader` ids? Make a clear V1 call.
- Props-config vs. compound (shadcn/Radix) components — the deciding rule, and is
  `composition` (`background`/`overlay`/`surface`) a prop or a compound?
- Where does dev-authored shader source enter? (Answer: it does not, in V1 — a
  scope/product choice, not a platform limit; runtime `source` is feasible on iOS
  via `makeLibrary(source:)` and on Android via AGSL, so it's a post-V1 escape
  hatch on both — `08`.)

## Findings

### `ShaderView` IS the primitive (one tier in V1)
There is **one public primitive**: `<ShaderView>`. It runs a single curated,
build-time Metal shader (selected by `shader` id) on one native surface, accepts
typed-per-shader `uniforms`, an `interactionMode`, a `composition` mode, and
`style`; it emits semantic press events and exposes an imperative ref. Internally it
is the single `FxShaderView` `ExpoView` base from `01`/`08`. There is no separate
`EffectView`/`GlassView` *primitive*: glass is a **secondary** system-material
component (`02`), not a Metal shader and not the front door (`README` demotes it).
Earlier drafts framed `EffectView`/`GlassView` as the primitive or `ShaderView` as a
"Tier-2 advanced escape hatch behind curated wrappers" — **that framing is dropped.**
`ShaderView` + curated `shader` ids *is* the V1 surface.

```tsx
// The V1 primitive — everything apps render goes through this.
<ShaderView
  shader="aurora"                    // curated build-time .metal id (string union; 04/08)
  uniforms={{ intensity: 0.6 }}      // typed semantic uniforms for *that* shader (04)
  interactionMode="active"           // none | passive | active | controlled (05)
  composition="background"           // background | overlay | surface (08/05)
  style={{ flex: 1 }}
  onPress={() => {}}
>
  {children}
</ShaderView>
```

### The primitive's grain: one curated *semantic* shader per surface — not lower
- **`shader` is a curated id** (a string-literal union resolved to a build-time
  `.metal` function on iOS / an AGSL pair on a later Android backend — `08`), **not
  raw source and not a raw pipeline.** `uniforms` are the **typed semantic** inputs
  that shader reads (`04`). This keeps the primitive cross-platform and absorbs the
  MSL-vs-AGSL divergence *beneath* it. A primitive that exposed raw modifiers/source
  would leak the MSL-vs-AGSL authoring split, the async runtime-compile cost (`08`),
  and the SwiftUI hosting swallow (`05`) straight to the dev — breaking write-once
  polish, which is the moat.
- **Do not go lower.** No shader-pipeline composition, raw `ShaderLibrary` /
  `MTLRenderPipelineState` handles, or multi-pass graphs in V1 — that is the
  Skia-competition trap and the scope/cost it adds (`08`). The dev picks a curated
  shader and tunes its uniforms; they never assemble a pipeline.

### The full V1 TypeScript surface (authoritative)

#### `ShaderId` and per-shader uniform typing
The curated catalog is a string-literal union; each id maps to its own typed
semantic uniform set via a lookup map, so `uniforms` is narrowed by `shader` and a
uniform that doesn't belong to the chosen shader is a **compile error** (`04`).
`time` and `resolution` are intentionally absent from every uniform type — they are
injected natively each frame and must not be settable (`04`/`08`).

```ts
// Curated shader ids — the public string-literal union (the front door). 08 §5.3
// owns this set; the native `ShaderId: String, Enumerable` enum mirrors it 1:1.
export type ShaderId =
  | 'aurora'        // default — calmest, most generally flattering
  | 'mesh-gradient'
  | 'noise-field'
  | 'ripple'
  | 'spotlight';

// Per-shader SEMANTIC uniforms. time/resolution are ABSENT (native-injected, 04/08).
export interface AuroraUniforms {
  speed: number;        // animation rate multiplier
  intensity: number;    // brightness / contrast
  colorA: string;       // hex; coerced to float4 natively
  colorB: string;
}
export interface MeshGradientUniforms {
  points: number;       // 2..6 control points
  blur: number;
  colorA: string; colorB: string; colorC: string;
}
export interface NoiseFieldUniforms { scale: number; speed: number; contrast: number }
export interface RippleUniforms   { amplitude: number; frequency: number; decay: number }
export interface SpotlightUniforms { radius: number; softness: number; colorA: string }

// The map that ties each id to its uniform set → gives us `uniforms` typed per shader.
export interface ShaderUniforms {
  'aurora': AuroraUniforms;
  'mesh-gradient': MeshGradientUniforms;
  'noise-field': NoiseFieldUniforms;
  'ripple': RippleUniforms;
  'spotlight': SpotlightUniforms;
}
```

#### `ShaderViewProps` — every prop, type, and default
```ts
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** How the native press recognizer behaves on the Metal surface (05). */
export type InteractionMode = 'none' | 'passive' | 'active' | 'controlled';
/** How RN children layer with the Metal surface — a real native arrangement (08/05). */
export type CompositionMode = 'background' | 'overlay' | 'surface';

/** Semantic press payload (low-frequency; per-pointer move never crosses the bridge — 05). */
export interface ShaderPressEvent { x: number; y: number }

export interface ShaderViewProps<K extends ShaderId = 'aurora'> {
  /** Curated build-time shader, selected by id. Default 'aurora'. Unknown id → falls back once (08). */
  shader?: K;

  /** Advanced: override individual semantic uniforms for the chosen shader.
   *  Shallow-merged over the curated defaults in JS before crossing the bridge (04).
   *  Typed against `shader`, so a foreign uniform is a compile error. */
  uniforms?: Partial<ShaderUniforms[K]>;

  /** Native press behavior. Default 'none' (decorative, never steals gestures — 05). */
  interactionMode?: InteractionMode;

  /** Where the shader sits relative to RN children. Default 'background' (08/05). */
  composition?: CompositionMode;

  /** Standard RN view style (size/position/opacity of the native surface). */
  style?: StyleProp<ViewStyle>;

  /** Layered RN content (see composition modes). In 'surface' mode, children are
   *  non-interactive labels only — the surface is one interactive unit (05). */
  children?: ReactNode;

  // --- Semantic events (native-emitted, low-frequency — 05). NOT per-pointer. ---
  /** Release inside bounds (tap-up-inside). Not emitted on cancel. */
  onPress?: (e: ShaderPressEvent) => void;
  /** Finger down / `.began` / `ACTION_DOWN`. */
  onPressIn?: (e: ShaderPressEvent) => void;
  /** Release or cancel. */
  onPressOut?: () => void;
  /** Held past the long-press timeout without crossing slop. */
  onLongPress?: (e: ShaderPressEvent) => void;

  // --- controlled-mode discrete inputs (declarative; V1 ships these, not animated props — 05). ---
  /** Discrete press state when interactionMode='controlled'. */
  pressed?: boolean;
  /** Discrete highlight location (normalized 0→1) when interactionMode='controlled'. */
  highlight?: { x: number; y: number };
}
```

Defaults, restated: `shader='aurora'`, `interactionMode='none'`,
`composition='background'`, all uniforms fall through to the curated per-shader
defaults (`04`'s `SHADER_DEFAULTS`). `pressed`/`highlight` are meaningful only in
`controlled` mode and are ignored otherwise (`05`).

#### `ShaderViewRef` — the imperative handle (controlled mode)
Two main-thread `AsyncFunction`s on the ref write directly into the native uniform
buffer the render loop reads each frame — no per-call bridge-per-frame, no re-render
(`05`/`08`). This is how `controlled` mode and developer-owned gesture pipelines
drive the shader in V1.

```ts
export interface ShaderViewRef {
  /** General escape hatch: write any named uniform (e.g. 'pressDepth', 'glowX'). */
  setUniform(name: string, value: number): void;
  /** Convenience: set the finger-following highlight (normalized 0→1). */
  setHighlight(point: { x: number; y: number }): void;
}

// Usage
const ref = useRef<ShaderViewRef>(null);
ref.current?.setHighlight({ x: 0.5, y: 0.3 });
ref.current?.setUniform('pressDepth', 0.6);
```

#### The typed wrapper (one thin JS layer over the native view)
`ShaderView` is a single generic component: it resolves `shader` + `uniforms` into
one flat Record in JS (`04`), forwards the ref, and maps props onto the native view
(`01`). It is **not** a "wrapper tier" over a more primitive component — it *is* the
primitive's JS binding.

```tsx
import { requireNativeView } from 'expo';
import { forwardRef, useMemo } from 'react';
const NativeShaderView = requireNativeView('FxShaderView');

export const ShaderView = forwardRef<ShaderViewRef, ShaderViewProps>(
  function ShaderView({ shader = 'aurora', uniforms, interactionMode = 'none',
                        composition = 'background', children, ...rest }, ref) {
    const resolved = useMemo(() => resolveUniforms(shader, uniforms), [shader, uniforms]); // 04
    return (
      <NativeShaderView
        ref={ref}
        shader={resolved.shader}
        uniforms={resolved.uniforms}
        interactionMode={interactionMode}
        composition={composition}
        {...rest}
      >
        {children}
      </NativeShaderView>
    );
  },
) as <K extends ShaderId = 'aurora'>(p: ShaderViewProps<K> & { ref?: React.Ref<ShaderViewRef> }) => JSX.Element;
```

### V1 composition modes — how RN children layer with the Metal surface
This is the first-class answer to "where do my RN children go?" A Metal surface is
**not** a content-sampling filter over the live RN subtree in V1 (the hard research
problem, severed on iOS by SwiftUI hosting — `05`/`README`). Instead, RN children
layer through three explicit `composition` modes, each a real native arrangement of
layers (`08` §2):

| `composition` | Shader position | RN children | Touch | Use |
|---|---|---|---|---|
| **`background`** (default) | behind RN children (`insertSubview(at:0)`) | rendered on top, native-layered, fully interactive | children interactive normally; pair with `interactionMode="none"` | shaded backdrop behind a card/screen |
| **`overlay`** | above RN children, hit-test pass-through | below; touches pass straight through to them | base below stays interactive; shader decorates only (sheen/glow/grain) | animated accent over real UI |
| **`surface`** | *is* the interactive unit; no RN children sampled | optional non-interactive label children only | the surface presses/highlights as **one native unit** (`05` recognizer), emits `onPress*` | a magnetic/animated shader button |

These map 1:1 to the `README` effect-capability matrix and `05`'s surface-choice
matrix: `background`/`overlay` keep "the shader never intercepts content touches,"
and `surface` is the native-first interactive unit that survives the swallow (`05`).
**None of the three samples the live RN subtree** — which is exactly why all three
stay fully interactive on both platforms.

`composition` and `interactionMode` are **orthogonal, separate props**, not one
collapsed `mode`. `composition` is *where the shader sits in the native layer order*
(`08` §2); `interactionMode` is *whether/how the press recognizer attaches* (`05`).
Common pairings: `background`+`none` (decorative backdrop), `overlay`+`none`
(pass-through accent), `surface`+`active` (pressable shader button),
`surface`+`controlled` (developer-driven). Earlier drafts that wrote a single
3-value `mode={'background'|'overlay'|'surface'}` **or** a single `mode="active"`
are reconciled here into these two distinct props — this is the authoritative split.

### `composition` is a PROP, not a compound component (V1 decision)
The deciding rule (kept, unchanged):

> **Compound (shadcn/Radix-style) components are honest only when each subcomponent
> is a *real native view/layer*. The moment a subcomponent would just carry
> configuration, it must be a prop.**

A compound `EffectSurface` (`<EffectSurface.Shader/>` + `<EffectSurface.Content/>`)
is *defensible* because its subcomponents are genuine native layers (a Metal surface
and an RN content host) — so it is not dishonest. But it is **heavier** than the
common case needs: the overwhelmingly common usage is one shader surface with RN
children layered behind/above/around it, which a single `composition` prop on
`ShaderView` expresses leanly and idiomatically. **V1 decision: `composition` is a
prop on `ShaderView`; the compound `EffectSurface` is deferred** (revisit only if a
real multi-distinct-layer case — e.g. several independently-styled native layers
under one interactive unit — emerges). For V1, `<ShaderView composition="surface">`
*is* the interactive shader unit; no compound needed.

```tsx
// V1 — props, not compound. One native surface, children layered by `composition`.
<ShaderView shader="shimmer" composition="surface" interactionMode="active">
  <Text>Press me</Text>     {/* non-interactive label only, in surface mode */}
</ShaderView>

// Deferred (NOT V1) — the compound form, only if multi-real-layer need emerges:
// <EffectSurface interactionMode="active">
//   <EffectSurface.Shader shader="shimmer" />
//   <EffectSurface.Content>{children}</EffectSurface.Content>
// </EffectSurface>
```

### Curated wrappers (`<EffectBackground preset>`): DEFERRED in V1
The lead-with-curated *thesis* is right in spirit — curated presets are the product
value (`04`) — but in V1 that value is already delivered by `ShaderView` + the
curated `shader` ids. A thin wrapper like `<EffectBackground preset="aurora" />`
(= `<ShaderView shader="aurora" composition="background" interactionMode="none" />`)
adds a second name and a second doc surface for **near-zero ergonomic gain** while
the curated set is small (a handful of ids). It also risks two front doors that can
drift. **V1 decision: ship `ShaderView` only; defer the `<EffectBackground preset>`
/ `<EffectSurface>` wrappers.** The defaults already encode the calm path
(`composition='background'`, `interactionMode='none'`, `shader='aurora'`), so
`<ShaderView />` with no props *is* the "just give me a nice backdrop" affordance.

Revisit wrappers post-V1 when (a) the curated catalog is large enough that
task-named entry points (`EffectBackground`, `EffectButton`) aid discovery, or (b)
a wrapper would pin a non-trivial default *combination* (composition + interaction +
a uniform preset) that's clumsy to repeat. Until then, curated `shader` ids are the
curation surface, and the curated `.metal` files double as **forkable examples**
without a wrapper layer. Leading with raw shader authoring is still rejected — but
the curated id *on `ShaderView`* already prevents that; a separate wrapper isn't what
prevents it.

### Shader source does not enter the cross-platform API in V1 — by scope choice
Curated shaders are real `.metal`/`.agsl` code internally, but V1 exposes only
curated `shader` **ids** + typed `uniforms`. Raw dev-authored `source={msl}` is
rejected in V1 as a **deliberate scope / product decision** — curation is the
value — **not** because iOS is incapable: runtime MSL compilation *is* possible on
iOS via
[`MTLDevice.makeLibrary(source:options:)`](https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary)
(public, App-Store-safe; the build-time-only constraint is specific to the SwiftUI
`.layerEffect`/`ShaderLibrary` path, not the `MTKView` engine — `08` §5.4,
Decision 8). A bring-your-own-shader escape hatch therefore stays **post-V1 but is
feasible on both platforms** — iOS `makeLibrary(source:)` + Android AGSL
`RuntimeShader` — kept out of V1 to avoid async-compile jank, compile-error
fallback UX, the MSL-vs-AGSL split, and validating arbitrary GPU code. So the V1
primitive means "run a *curated* native shader by id," never "run my arbitrary
shader."

### Component style summary: props by default, compound only for real native layers
- **Single shader on one surface → props.** One native view, one shader → one set of
  `Prop()` setters (`shader`, `uniforms`, `interactionMode`, `composition`, `style`).
  Idiomatic RN, typed and discoverable; mirrors `@callstack/liquid-glass` /
  `expo-glass-effect`. (Not "prop drilling" — flat config on one view.)
- **Compound only where children are distinct *real* native layers** — deferred in
  V1 (`EffectSurface`), and used in the secondary/glass path where each child is a
  real glass view:

  ```tsx
  // Secondary / glass (02): container morphing — each child is a real glass view,
  // maps 1:1 to UIGlassContainerEffect. Compound is correct (native merge over real views).
  <GlassContainer spacing={12}>
    <GlassView preset="adaptive" />
    <GlassView preset="adaptive" />
  </GlassContainer>
  ```
  The Metal `ShaderView` path is primary; glass is secondary (`02`).

### Explicitly avoid
- **Config-only children** (`<Shader.Distortion strength={…}/>` rendering nothing) —
  in a native lib that means context/`cloneElement` gymnastics to hoist config to
  the parent view. Use a prop or a `uniforms` field.
- **`asChild` / Slot** (Radix's merge-onto-child) — the shader surface *is* a native
  view, so it can't merge onto an arbitrary RN child without wrapping. Skip it.
- **The shadcn *distribution* model** (copy-paste components you own) — can't copy
  Swift/Metal into an app. Only Radix's *composition* idea partially transfers, and
  only for the deferred `EffectSurface` / the secondary `GlassContainer` cases.

## Decisions
1. **`ShaderView` IS the V1 primitive — one public tier.** Apps render `<ShaderView>`
   directly. No `EffectView`/`GlassView`-as-primitive framing; no "Tier-2 advanced"
   reframing. Glass is a secondary system-material component (`02`), not the front door.
2. **Primitive grain = one curated semantic shader (`shader` id + typed `uniforms`)
   per native surface.** No raw source, no raw pipeline, no lower (`08`).
3. **Authoritative TS surface:** `ShaderViewProps<K extends ShaderId>` with
   `shader` (default `'aurora'`), `uniforms: Partial<ShaderUniforms[K]>` (typed per
   shader; `time`/`resolution` absent), `interactionMode` (default `'none'`),
   `composition` (default `'background'`), `style`, `children`, the semantic events
   (`onPress`/`onPressIn`/`onPressOut`/`onLongPress`), and `pressed`/`highlight` for
   `controlled`. Imperative `ShaderViewRef` = `setUniform(name, value)` +
   `setHighlight({x,y})`.
4. **`interactionMode` and `composition` are two separate, orthogonal props** — not
   one collapsed `mode`. `composition` = native layer order
   (`background`/`overlay`/`surface`); `interactionMode` = recognizer attachment
   (`none`/`passive`/`active`/`controlled`). This reconciles the single-`mode`
   shorthand used in earlier 04/05/08 sketches.
5. **`composition` is a PROP on `ShaderView`; the compound `EffectSurface` is
   deferred.** The compound is honest (real layers) but heavier than the common
   single-surface case needs. Revisit only on a real multi-distinct-layer need.
6. **Curated `<EffectBackground preset>` / `<EffectSurface>` wrappers are DEFERRED.**
   V1 ships `ShaderView` only; curated `shader` ids + sensible defaults
   (`aurora`/`background`/`none`) already deliver the curated front door. Revisit
   wrappers when the catalog grows or a wrapper pins a non-trivial default combo.
7. **No shader source in the V1 cross-platform API — a scope choice, not a platform
   limit.** Curated shaders use real `.metal`/`.agsl` internally; raw `source={msl}`
   is rejected in V1 because curation is the value, **not** because iOS can't compile
   at runtime (it can, via `MTLDevice.makeLibrary(source:options:)` —
   https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary).
   A bring-your-own path is post-V1 and **feasible on both platforms** (iOS
   `makeLibrary(source:)` + Android AGSL), kept out of V1 to avoid async-compile
   jank, fallback UX, the MSL-vs-AGSL split, and validating arbitrary GPU code (`08`).
8. **Props for the single-shader surface; compound only where children are real
   native layers** (the deferred `EffectSurface`; the secondary `GlassContainer`).
   No config-children, no `asChild`, no copy-paste distribution.

## Open questions
- **Naming the primitive — confirm `ShaderView`.** `ShaderView` vs.
  `Effect`/`EffectView` vs. `FxView`. `ShaderView` is most honest to the Metal
  thesis; the curated-id framing (no `source` prop) is what holds it back from
  implying raw-source authoring. Lean: keep `ShaderView`. Confirm against the
  skill-doc naming and `01`'s native `FxShaderView`.
- **The V1 curated `ShaderId` set (must finalize with `04`/`08`).** Which shaders
  ship and their typed uniform tables. This doc lists `aurora` (default),
  `mesh-gradient`, `noise-field`, `ripple`, `spotlight` — reconcile with `04`'s
  example set (`plasma`/`caustics`) and `08` §5.3's native enum
  (`aurora`/`ripple`/`spotlight`) so the TS union, the `ShaderUniforms` map, and the
  Swift `Enumerable` enum are one source of truth. Keep `shader` a string-literal
  union; keep uniforms typed per shader; default `'aurora'`.
- **The deferred-wrapper trigger.** Re-evaluate `<EffectBackground>` /
  `<EffectSurface>` once the curated catalog crosses ~6–8 ids or a task-named entry
  point (button/background) demonstrably aids discovery. Track as post-V1.
- **`composition='surface'` vs. `interactionMode` coupling.** `surface` is the only
  composition where `interactionMode='active'`/`'controlled'` is the common intent.
  Decide whether to *warn* on incoherent combos (e.g. `background`+`active`) or leave
  them free; prototype the `surface` interactive case from `05`.
- **`GlassView` as a `ShaderView` sibling vs. separate primitive.** Glass is system
  material (`02`), not a Metal shader, so it stays a distinct (secondary) component
  rather than a `ShaderView` preset. Confirm.
- **`pressed`/`highlight` controlled props vs. ref-only.** V1 exposes both
  declarative `controlled` props and the imperative ref (`05`). Confirm whether both
  ship or the ref alone suffices for V1, and pin highlight coordinate units
  (normalized 0→1) consistently across props, events, and `setHighlight` (`05` open q).

## Sources
- Prior-art component shapes: `@callstack/liquid-glass`
  (https://github.com/callstack/liquid-glass), `expo-glass-effect`
  (https://docs.expo.dev/versions/latest/sdk/glass-effect/).
- Compound-component / `asChild` prior art: Radix Primitives / shadcn/ui.
- Cross-refs: `01-expo-modules-view.md` (the `FxShaderView` base, `requireNativeView`
  typed wrapper, two-phase props, ref `AsyncFunction`s), `04-preset-system.md`
  (curated `shader` id + typed per-shader `uniforms`, JS resolution, `ShaderUniforms`
  map), `05-gestures-and-interaction.md` (`interactionMode` recognizer, semantic
  events, `controlled` mode, `setUniform`/`setHighlight`, native-first `surface`),
  `08-shader-accents-and-distribution.md` (curated Metal shaders by id, `ShaderId`
  enum, composition as native view-ordering, no raw source in V1),
  `02-ios-glass-materials.md` (`GlassView`/`GlassContainer`/`UIGlassContainerEffect`,
  secondary).
