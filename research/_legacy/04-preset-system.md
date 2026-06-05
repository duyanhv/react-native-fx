# Shader preset & uniform config system
Status: researched
Feeds: skills/react-native-fx/references/presets.md

## Why this matters
The curated layer is the main product value. Under the thesis, the
`ShaderView` is a native iOS Metal view that renders **curated, build-time
`.metal` fragment functions selected by id from JS**, with native uniform
updates (README; doc `08`). A **preset is not a generic "effect" — a preset is a
`ShaderId` plus its typed uniform set.** The `shader` prop picks **which curated
shader runs** (`shader="aurora"`); the `uniforms` prop supplies the **typed,
semantic uniforms** that exact shader reads.

This is also V1 plumbing: a reusable JS→native config convention that gets
**typed semantic uniforms into a Metal fragment shader's uniform buffer** (an
`MTLBuffer` written with `setFragmentBytes`/`setFragmentBuffer`, doc `08`). The
design must generalize from discrete shader selection now to any tunable native
uniform later — so the *plumbing* must not be shader-specific, even though each
preset *is* shader-specific in its types. `time` and `resolution` are **never**
in this contract: they are injected natively each frame (doc `08`).

## Research questions
- Where does preset → uniform resolution happen — JS (resolve to a typed uniform
  object, pass primitives across) or native (pass the shader id, resolve in
  Swift)? Trade-offs: JS = one source of truth, easy override; native = less
  bridge payload, but the uniform table forks per shader natively.
- The config shape: a curated **`shader` id** (string-literal union `ShaderId`) +
  a **typed per-shader `uniforms`** object. How is the per-shader uniform type
  selected and enforced, and what are the **defaults + validation** per uniform?
- Auto-injected uniforms: `time` and `resolution`/`size` are supplied **natively**
  from the render loop (doc `08`), not by the dev. How are they kept out of the
  public uniform type *and* out of the JS payload while still reaching the shader?
- Override model: how does a power user override individual uniforms
  (`speed`, `intensity`, `colorA`, …) without rewriting the whole preset?
  Shallow-merge over the resolved uniforms?
- Prop-bridging convention that generalizes from `shader`/discrete uniforms now
  to future tunable native uniforms without a second bridge model.
- Versioning: how to add/rename curated shaders + uniforms without breaking apps;
  default shader.
- Type safety: keep the public `shader` prop a string union; keep the uniform set
  typed *per shader*; keep an advanced override path.

## Findings

### TL;DR — resolve in JS, push ONE flat resolved uniform Record per shader

**Decision up front: resolution happens in JS, BEFORE native.** The public
`shader` id + optional `uniforms` override are resolved in the JS wrapper into
**one flat resolved uniform record** for the current shader (preset defaults ⊕
dev overrides), then handed across as a single Expo **`Record`** (struct). Native
**never** runs preset-name branching logic — it receives a shader id (mapped to a
native `Enumerable` `ShaderId` enum → MSL function → cached pipeline, doc `08`)
plus one already-resolved, flat uniform record. Native stashes both in `Prop`
setters and, in `OnViewDidUpdateProps`, writes the record into the shader's
**`MTLBuffer`** (the two-phase prop rule, doc `01`). The native side then adds
`time`/`resolution` per frame; **those are not in the record.** The rest of this
doc pins the exact types, defaults, validation, and flow.

### Where resolution happens — JS vs native

Two viable architectures:

| | **A. Resolve in JS** (recommended) | **B. Resolve in native** |
|---|---|---|
| What crosses the bridge | shader id + one flat resolved uniform Record (e.g. `{ speed: 0.6, intensity: 1.4, colorA: "#5B8CFF" }`) | the shader id only (`"aurora"`) |
| Source of truth | one TS preset/uniform table, the single canonical default set | a default-uniform table per shader, duplicated in Swift |
| Preset branching logic | lives only in JS; native sees a flat record, no preset names to branch on | native must fork a uniform table per shader id |
| Override / merge | trivial — shallow-merge a JS object before it leaves JS | must re-implement merge in Swift |
| Payload size | shader id + a handful of primitives (negligible; props re-send only on change) | one short string (smaller, but noise) |
| Type safety | shader id + its uniform fields fully typed in TS; the thing devs read | uniform defaults opaque to TS; only the id is typed |
| Generalizes to tunable uniforms | yes — every uniform is just another resolved field | no — continuous values can't live in a static native default table |

We pick **A (resolve in JS)** for four reasons:

1. **Single source of truth.** The curated layer *is* the product. Keeping the
   one canonical default-uniform table in TS (not forked into Swift) is the
   single biggest lever on "hard to make ugly" quality control. A designer tweaks
   `speed: 0.6 → 0.5` in one file and the default look changes everywhere.
2. **Override is free.** A power-user uniform override is a plain object
   shallow-merged over the resolved defaults *in JS, before anything crosses the
   bridge*. Native resolution would force shipping the override across **and**
   re-implementing the merge in Swift.
3. **Bridge cost is irrelevant by design.** The thesis is "JS does not drive
   frames — nothing on the bridge per-frame." Uniforms are set-once-per-render
   config (the *animated* `time` is generated natively, doc `08`), so the marginal
   cost of sending ~5 primitives vs 1 string is meaningless.
4. **It generalizes to future tunable uniforms.** Any uniform computed outside a
   native table still follows the same "resolve to a flat Record, hand to native,
   native writes it into the `MTLBuffer`" convention instead of a second model.

The cost we accept: native must still **defensively default** every uniform it
reads (don't assume JS always sends a complete Record — old JS + new native, or a
partial override). Native treats the incoming Record as "the desired uniform
state," not "a trusted complete object." Expo `@Field` defaults give us this.

### Auto-injected uniforms — `time` & `resolution` are native, not dev-supplied

Two uniforms are **never** part of the public uniform type, **never** in the
resolved JS record, and **never** sent across the bridge: `time` (seconds, from
the native render loop) and `resolution`/`size` (the drawable size in pixels).
They are injected natively per frame:

- `time` is advanced by the native loop driving the `MTKView`/`CAMetalLayer`
  (the `CADisplayLink`-style tick pinned in doc `08`), pausing offscreen / on
  background (doc `06`).
- `resolution`/`size` comes from the drawable size on layout/resize, native side.

So the dev passes — and the record contains — **only semantic uniforms**
(`speed`, `intensity`, colors, …). The native side composes the final uniform
buffer as:

```txt
final MTLBuffer  =  { time, resolution }            // injected natively per frame
                 ⊕  resolved semantic uniforms        // the flat JS Record (set on change)
```

Every curated `.metal` fragment function's `FxUniforms` struct (doc `08` §4)
reserves `time` and `resolution` slots; the dev-facing TS uniform type **omits**
them so they can't be set, mistyped, or fought over. This keeps the public
surface "semantic only" and ties the live animation entirely to the native loop
(doc `08`). **Confirmed: `time`/`resolution` are not in the resolved record.**

### Tie-in to the two-phase prop rule (doc 01)

Doc `01` fixes the rule: **`Prop` setters only stash; `OnViewDidUpdateProps`
applies once per batch.** Resolution-in-JS slots into this cleanly, and the
"apply" step is specifically *"select the MSL function by id and write the
resolved uniforms into the view's `MTLBuffer`"*:

```txt
JS wrapper
  shader="aurora"      ─┐
  uniforms={{speed:.5}} ├─► resolveUniforms() ─► { shader, uniforms } (ONE flat record)
  (other public props)  ┘        (JS)                     │
                                                          ▼  shader id + one `uniforms` Record
NATIVE (ShaderView, doc 08)
  Prop("shader")   ──► view.pendingShaderId = id            // STASH ONLY (phase 1)
  Prop("uniforms") ──► view.pendingUniforms = record        // STASH ONLY (phase 1)
  OnViewDidUpdateProps ──► view.applyShaderAndUniforms()    // APPLY ONCE (phase 2)
        → ShaderId(Enumerable) → MSL fn → cached pipeline (doc 08)
        → write the flat semantic record into the MTLBuffer (setFragmentBytes/Buffer)
        → native loop keeps injecting time/resolution each frame
```

Because JS pre-merges preset defaults + overrides into **one** resolved uniform
record, native receives it through a **single `uniforms` prop**, so there is no
"which uniform prop wins / arrival order" problem on the native side, and **no
preset-name branching ever runs natively** — native stashes a flat record and
maps it straight into the `MTLBuffer`. The two-phase rule's stash step holds
exactly one shader id and one uniform Record. (We *can* still expose a few hot
individual props — e.g. `intensity` — separately for ergonomics; those are
stashed alongside and merged in phase 2.)

### The per-shader uniform type — selected in JS, typed against the shader id

Each curated shader id maps to its own **typed uniform set**. The public
`shader` prop is the string-literal union `ShaderId`; the `uniforms` prop is
typed *for that shader* via a lookup map, so a uniform that doesn't exist on the
chosen shader is a compile error. (The divergence here is **per shader**, not per
platform — iOS is the lead Metal backend; an Android AGSL backend, doc `03`/`08`,
can mirror the same uniform names later without changing this JS shape.)

> **Scope note (not a platform limit).** V1 exposes only curated `shader` ids +
> typed `uniforms`, with **no raw `source` prop**. That is a deliberate scope /
> product choice — curation is the value — **not** an iOS capability gap. Runtime
> shader-source compilation is possible on *both* platforms: iOS via
> [`MTLDevice.makeLibrary(source:options:)`](https://developer.apple.com/documentation/metal/mtldevice/1433431-makelibrary)
> (public, App-Store-safe) and Android via AGSL `RuntimeShader`. So a post-V1
> runtime `source` escape hatch is feasible on iOS too, not Android-only (doc
> `08` §5.4). V1 keeps it out to avoid async-compile jank, compile-error fallback
> UX, the MSL-vs-AGSL split, and validating arbitrary GPU code.

```ts
// Curated shader ids — the string-literal union (the front door).
// Mirrors the native `ShaderId: String, Enumerable` enum (doc 08).
type ShaderId = 'aurora' | 'mesh-gradient' | 'noise-field' | 'plasma' | 'caustics';

// Per-shader SEMANTIC uniform types. NOTE: time & resolution are intentionally
// ABSENT — they are injected natively (see above) and must not be settable.
type AuroraUniforms = {
  intensity: number;          // brightness / contrast
  speed: number;              // animation rate multiplier
  colors?: [string, string];  // optional 2-stop hex palette; coerced to float4 natively
};
type MeshGradientUniforms = {
  points: number;             // 2..6 control points
  blur: number;
  colors: [string, string, string];
};
type NoiseFieldUniforms = { scale: number; speed: number; contrast: number };
// plasma, caustics …

// The map that ties each id to its uniform set. This is what gives us
// `uniforms` typed *per shader*.
type ShaderUniformMap = {
  'aurora': AuroraUniforms;
  'mesh-gradient': MeshGradientUniforms;
  'noise-field': NoiseFieldUniforms;
  // plasma, caustics …
};

// The resolved value that crosses the bridge: shader id + ONE flat uniform record.
type ResolvedShaderConfig<K extends ShaderId = ShaderId> = {
  shader: K;
  uniforms: ShaderUniformMap[K];   // fully resolved, flat, semantic-only
};
```

### Defaults & validation — per uniform, in JS

Each curated shader carries a **complete default uniform set** in one TS table —
the single source of truth. A "preset" *is* `{ ShaderId, its default uniforms }`.

```ts
// SHADER_DEFAULTS = the canonical curated look per shader (single source of truth).
const SHADER_DEFAULTS: { [K in ShaderId]: ShaderUniformMap[K] } = {
  'aurora':        { intensity: 1.4, speed: 0.6, colors: ['#5B8CFF', '#9B5BFF'] },
  'mesh-gradient': { points: 4, blur: 0.3, colors: ['#FF7A5B', '#5BFFB0', '#5B8CFF'] },
  'noise-field':   { scale: 3, speed: 0.4, contrast: 1.2 },
  // plasma, caustics …
} as const;
```

**Validation is layered, cheapest-first:**

1. **Compile time (primary).** `ShaderId` is a string-literal union and
   `uniforms` is `Partial<ShaderUniformMap[K]>`, so an unknown shader, a uniform
   that doesn't belong to the chosen shader, or a wrong-typed uniform is a
   **TypeScript error** — no runtime cost. This catches 95% of misuse.
2. **JS resolve-time clamp (defensive, dev builds).** `resolveUniforms` clamps
   numeric uniforms to each shader's documented sane range (e.g. `intensity`
   `0..3`, `speed` `0..4`, `points` `2..6`) and validates color strings as hex,
   warning in `__DEV__` and falling back to the default for that field. This
   protects against untyped JS callers and out-of-range numbers that would make
   the shader render garbage. Ranges live next to `SHADER_DEFAULTS`.
3. **Native defensive default (last line).** Expo `@Field` defaults mean any
   omitted or coercion-failed field falls back to a sane native value, so even a
   partial/garbage Record renders *something* and never crashes (doc `08`
   unknown-id → default fallback).

Validation never throws in production — invalid input degrades to the curated
default, consistent with "hard to make ugly."

### Crossing the bridge as an Expo `Record`

The resolved semantic uniforms cross as an Expo **`Record`** (a struct of
`@Field`s) — the documented Expo mechanism for passing a structured object to a
view prop setter. A `Record` is a Swift struct whose fields are annotated
`@Field` with defaults, usable directly as a view prop setter's value type;
enum-typed fields conform to `Enumerable` (string-backed), which is right for any
discrete-mode uniform (e.g. a blend `mode`). Color uniforms cross as strings
(hex) and are coerced to `float4` natively.

```swift
// ios — FxShaderUniforms.swift  (the superset of curated semantic uniforms)
enum FxBlendMode: String, Enumerable {
  case normal, additive, screen
}
struct FxShaderUniforms: Record {
  // semantic uniforms (per-shader subsets; unused ones keep their default)
  @Field var intensity: Double = 1
  @Field var speed: Double = 1
  @Field var scale: Double = 1
  @Field var contrast: Double = 1
  @Field var blur: Double = 0
  @Field var points: Int = 3
  @Field var colors: [String] = []      // hex strings → float4[] natively
  @Field var mode: FxBlendMode = .normal
  // time / resolution are NOT here — injected natively each frame (doc 08).
}
```

The `ShaderView` module declares a `shader` id prop (mapped to the native
`ShaderId: String, Enumerable` enum, doc `08`) and **one** `uniforms` prop typed
as this Record; Expo coerces the incoming JS object → struct, applying `@Field`
defaults for anything missing (the defensive-defaulting requirement, handled for
us by `Record`). Phase 2 selects the MSL function by id and writes the relevant
uniforms into the `MTLBuffer`:

```swift
View(FxShaderView.self) {
  Prop("shader") { (view: FxShaderView, id: ShaderId) in
    view.pendingShaderId = id            // PHASE 1: stash only (Enumerable enum)
  }
  Prop("uniforms") { (view: FxShaderView, u: FxShaderUniforms) in
    view.pendingUniforms = u             // PHASE 1: stash only (flat record)
  }
  Prop("intensity") { (view: FxShaderView, v: Double) in view.pendingIntensity = v }
  OnViewDidUpdateProps { (view: FxShaderView) in
    view.applyShaderAndUniforms()        // PHASE 2: select fn + write MTLBuffer
  }
}
```

### Native receives a flat record → the shader's `MTLBuffer` layout

Native receives a **flat resolved uniform record** (numbers, ints, and hex-color
strings) and maps it into the selected shader's uniform struct, bound at fragment
buffer index 0 and written with `setFragmentBytes` (V1 struct is well under the
4 KB limit) or `setFragmentBuffer` for larger/ring-buffered cases (doc `08` §4).
The mapping is positional into the MSL `FxUniforms` struct, so **JS field order
is irrelevant** — but the **Swift `struct` ↔ MSL `struct` field order and
alignment MUST match** (MSL `float2`/`float4` alignment vs Swift `SIMD`), or pad
explicitly. This is the cross-cutting risk pinned in **doc `08` §4 / its
"uniform struct alignment (needs-device)" open question** — this doc's resolved
record is the *input*; doc `08` owns the exact byte layout.

### Override model — shallow-merge in JS

Public API is two-layered (the "Apple model"):

- **`shader`** — a **string-literal union** (`ShaderId`) of curated ids. The front
  door, 95% of usage; picks the `.metal` function (doc `08`) and brings its
  default uniforms.
- **`uniforms`** — an **advanced partial-override** prop. A `Partial<>` of the
  chosen shader's uniform set. Shallow-merged **over** that shader's curated
  defaults, in JS, before the Record crosses the bridge.

```ts
// public component props (V1 API contract).
// uniforms typed against the chosen shader id; interaction & composition are
// SEPARATE props (doc 09): interactionMode (none|passive|active|controlled, 05)
// and composition (background|overlay|surface, how RN children layer).
type ShaderViewProps<K extends ShaderId = ShaderId> = {
  shader?: K;                              // default 'aurora'
  /** Advanced: override individual semantic uniforms. Shallow-merged over preset. */
  uniforms?: Partial<ShaderUniformMap[K]>;
  interactionMode?: 'none' | 'passive' | 'active' | 'controlled';  // doc 05
  composition?: 'background' | 'overlay' | 'surface';              // doc 09
  children?: React.ReactNode;
};
```

```ts
// resolution flow (JS) — runs in the wrapper, output feeds the native props.
function resolveUniforms<K extends ShaderId>(
  shader: K = 'aurora' as K,
  override?: Partial<ShaderUniformMap[K]>,
): ResolvedShaderConfig<K> {
  const base = SHADER_DEFAULTS[shader] ?? SHADER_DEFAULTS['aurora'];   // unknown → default
  const merged = { ...base, ...override } as ShaderUniformMap[K];      // override wins
  return { shader, uniforms: validateUniforms(shader, merged) };       // clamp/validate (dev)
}
```

```tsx
// the typed wrapper (doc 01: requireNativeView + prop mapping + ref forward)
import { requireNativeView } from 'expo';
const NativeShaderView = requireNativeView('FxShaderView');

export function ShaderView<K extends ShaderId>({
  shader, uniforms, interactionMode, composition, children, ...rest
}: ShaderViewProps<K>) {
  const resolved = React.useMemo(
    () => resolveUniforms(shader, uniforms),
    [shader, uniforms],
  );
  return (
    <NativeShaderView
      shader={resolved.shader}
      uniforms={resolved.uniforms}        // ONE flat resolved record
      interactionMode={interactionMode}
      composition={composition}
      {...rest}
    >
      {children}
    </NativeShaderView>
  );
}
```

Shallow merge is the right depth: each uniform set is intentionally **flat** (no
nested objects beyond a fixed-length color tuple), so `{ ...base, ...override }`
is exact and predictable — the same left-to-right precedence model RN devs know
from `StyleSheet.flatten` / array styles. Override always wins; unspecified
uniforms fall through to the curated default. A power user writes
`<ShaderView shader="aurora" uniforms={{ speed: 0.2 }} />` and changes *only* the
animation rate.

### Generic prop-bridging convention (plumbing, not shader-specific)

Generalize the above into one convention the whole library reuses:

> **fx uniform convention:** A `ShaderView`'s tunable native state travels as a
> **shader id + ONE resolved flat uniform Record prop**. JS owns *all* resolution
> (default-uniform lookup, override merge, validation, animation sampling of any
> *non-time* uniform). Native runs **no preset branching** — it **stashes** the id
> + Record in `Prop` setters and **applies** them once in `OnViewDidUpdateProps`:
> select the MSL function (via the `Enumerable` `ShaderId` enum) and write the
> semantic uniforms into the `MTLBuffer` (doc `08`). Native defensively defaults
> every uniform, and **injects `time`/`resolution` itself**.

```ts
// shared/resolveUniforms.ts — generic over a default-uniform table
export function resolveFromTable<K extends string, U>(
  defaults: Record<K, U>,
  id: K,
  fallback: K,
  override?: Partial<U>,
): { shader: K; uniforms: U } {
  const base = defaults[id] ?? defaults[fallback];
  return { shader: id, uniforms: { ...(base as object), ...(override as object) } as U };
}
```

Future high-frequency *semantic* uniforms (a dev-driven `intensity` animation)
should arrive through a UI-thread path such as animated props or an imperative
`setUniform` (doc `09`), **not** JS module calls per frame — but the `time`
uniform is never any of those; it is always native (doc `08`). This doc pins the
discrete Record shape for V1 and keeps it reusable; it does **not** pre-build the
animated-prop / imperative `setUniform` path in v1.

### Versioning & extensibility

The curated shader catalog is additive, append-mostly:

- **Adding a shader** is non-breaking — a new `.metal` function (doc `08`) + a new
  `ShaderId` union member (+ native `Enumerable` case) + its uniform type + a
  `SHADER_DEFAULTS` entry. Old apps are unaffected.
- **Renaming / removing** a shader id *is* breaking (it's a public string). Don't
  hard-remove: keep an `aliases` map (`'gradient' → 'mesh-gradient'`) so renamed
  ids resolve to the new function with a one-cycle deprecation warning, then drop
  the alias in a major. Keeps app code compiling across upgrades.
- **Unknown shader id** (older typing) → resolve to the **default** shader, never
  crash. Native `Enumerable` also defaults the id, and defaults all uniforms, so
  even a partial/garbage Record renders *something* sane.
- **Adding a uniform** to a shader is non-breaking if native defaults it (via
  `@Field` defaults) and the TS field is optional in the `Partial` override. The
  `.metal` function must read the new uniform with a sane fallback too.
- **Default shader: `aurora`** — used when `shader` is omitted; the calmest,
  most generally flattering curated look.

### Type safety summary

- **Public prop = string-literal union** (`ShaderId`) — autocomplete,
  compile-time checks, the only thing 95% of users touch; mirrors the native
  `Enumerable` enum (doc `08`).
- **Uniforms = typed *per shader*** via `ShaderUniformMap[K]`; the `uniforms`
  override is `Partial<ShaderUniformMap[K]>`, so a uniform that doesn't belong to
  the chosen shader is a compile error.
- **`time` / `resolution` are absent from every public uniform type and from the
  resolved record** — they're native-injected and cannot be set from JS.
- The native superset `Record` (`FxShaderUniforms`) is **internal** — it drives
  the bridge struct + `MTLBuffer` write, not the public surface.

## Decisions
1. **Resolve in JS, before native.** The `shader` id + optional `uniforms`
   override are resolved in the JS wrapper into one shader id + **one flat
   resolved uniform record**; that is the only config that crosses the bridge.
   Native runs **no preset-name branching** — it stashes a flat record.
2. **A preset = a curated `ShaderId` + a typed per-shader uniform set.** The
   public `shader` prop selects the build-time `.metal` function by id (via the
   native `Enumerable` `ShaderId` enum, doc `08`); `uniforms` is typed against
   that id via `ShaderUniformMap[K]`.
3. **`time` and `resolution` are auto-injected natively** from the render loop
   (doc `08`); they are **not** in the public type, the resolved record, or the
   bridge payload. The dev passes only semantic uniforms.
4. **Native receives a flat record → the shader's `MTLBuffer`.** Numbers/vectors/
   hex-colors map positionally into the MSL `FxUniforms` struct
   (`setFragmentBytes`/`setFragmentBuffer`, index 0). Swift `struct` ↔ MSL
   `struct` field order **and alignment** must match — owned by doc `08` §4.
5. **Cross the bridge as an Expo `Record`** (`@Field` struct; string-backed
   `Enumerable` for any discrete-mode uniform; colors as hex strings → `float4`).
   One `uniforms` prop; `@Field` defaults give free defensive defaulting.
6. **Two-phase, single object.** `Prop("shader")` + `Prop("uniforms")` **stash**;
   `OnViewDidUpdateProps` **applies** once — select the MSL fn and write the
   `MTLBuffer` (doc `01` rule). JS pre-merges, so no native ordering problem.
7. **Override = shallow-merge in JS** (`{ ...defaults, ...override }`), override
   wins. Uniform sets are flat by design so shallow merge is exact.
8. **Defaults + validation in JS.** One `SHADER_DEFAULTS` table = the single
   source of truth; validation is compile-time (`ShaderId` union + per-shader
   `Partial`), then dev-time clamp/hex-check, then native `@Field` default —
   invalid input degrades to the curated default, never throws in production.
9. **Public API is layered** (doc `09`): `shader` (string-literal union, default
   `aurora`) + advanced `uniforms` (`Partial<ShaderUniformMap[K]>`), with
   **separate** `interactionMode` (doc `05`) and `composition` (doc `09`) props;
   the raw `ShaderView` primitive is the Tier-2 escape hatch.
10. **Generic convention:** "JS resolves → shader id + one flat uniform Record →
    native stashes then applies into the `MTLBuffer`, defensively defaulted,
    time/resolution injected natively." Reused for future tunable uniforms with no
    model change; do **not** build the animated-prop / `setUniform` path in v1.
11. **Versioning:** additive shaders/uniforms are non-breaking; renames go through
    an alias map + deprecation; unknown id → default; native defaults all uniforms.

## Open questions
- **Hybrid for hot individual uniforms?** We send bulk uniforms as one Record but
  may expose a couple (`intensity`) as separate native props for ergonomics.
  Confirm phase-2 merge precedence (does an individual `intensity` prop override
  `uniforms.intensity`?). Lean: individual props win, applied last in
  `applyShaderAndUniforms`. Longer term this is the seam where an imperative
  `setUniform` (doc `09`) plugs in.
- **Color coercion contract:** confirm the hex-string → `float4` (sRGB vs linear,
  alpha handling) coercion is centralized natively so every color uniform behaves
  identically. Tie to the `MTLBuffer` layout in doc `08`.
- **Uniform-buffer layout / alignment:** the native `FxShaderUniforms` Record →
  MSL `FxUniforms` struct mapping must respect MSL alignment/packing rules. The
  exact `struct` layout is pinned against **doc `08` §4** (uniform buffers /
  distribution) so JS field order doesn't matter but the buffer offsets are
  correct.
- **Record coercion of absent uniforms:** confirm on the pinned SDK (56 / RN
  0.85) that omitting an `@Field` (partial override, or a shader that doesn't use
  a given uniform) reliably falls back to the `@Field` default rather than
  erroring.
- **Memoization key for `uniforms`:** object-identity `useMemo` deps risk
  re-resolving every render if callers pass an inline object literal. Document
  stable-reference guidance (or shallow-compare the uniform set).

## Sources
- Expo Modules API — `Prop` setters, `View {}` DSL, **`Record` + `@Field`** and
  `Enumerable` enums as prop/argument value types:
  https://docs.expo.dev/modules/module-api
- `01-expo-modules-view.md` — the two-phase prop rule (stash in `Prop`, apply in
  `OnViewDidUpdateProps`) and the `requireNativeView` typed-wrapper pattern this
  resolution flow builds on.
- `08-shader-accents-and-distribution.md` — curated build-time `.metal`
  distribution, the `ShaderId: String, Enumerable` enum → MSL fn → cached
  pipeline, the native render loop that injects `time`/`resolution`, and the
  `MTLBuffer` / `FxUniforms` struct (§4) this doc's resolved record feeds.
- `09-api-layering.md` — the layered public surface (curated `shader` front door
  vs. Tier-2 primitive), the `composition`/`interactionMode` props, and where an
  imperative `setUniform` path would live.
- `05-gestures-and-interaction.md` — `interactionMode` values and the native
  interactive unit.
- React Native `StyleSheet` (`flatten` / array-style left-to-right merge) — prior
  art for shallow-merge override precedence familiar to RN devs:
  https://reactnative.dev/docs/stylesheet
- Prior art on curated-preset + override-escape-hatch component APIs
  (variants / `defaultVariants` / explicit-prop precedence): CVA, MUI
  default-props, and the general "escape hatch" pattern —
  https://github.com/mui/material-ui/issues/34812 ,
  https://fveracoechea.com/blog/cva-and-tailwind/
