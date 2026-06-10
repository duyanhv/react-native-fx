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

A curated `ShaderId` union with a shared minimal public uniform contract; `time`,
`resolution`, `pressDepth`, and `touch` are native-owned and absent from every public type
(so they can't be set):

```ts
type ShaderId =
  | 'fractal-clouds'
  | 'ink-smoke'
  | 'liquid-chrome'
  | 'loop'
  | 'dots'
  | 'aurora'
  | 'noise-field'
  | 'plasma'
  | 'caustics'
  | 'edge-glow';
// (mesh is a `fill` capability — native MeshGradient/AGSL — not a generative shader.)

interface ShaderUniforms {
  intensity?: number;
}
```

All ten ids ship in the package today. Each has a native MSL (iOS) + AGSL (Android)
implementation on the hosted substrate, and the package types and runtime expose every id.
The full catalog is device-verified on iOS 17+ and Android API 33+ (U3-006).

Both substrates reach the consumer through the standard effect surface — `<Fx>` (`55`/`57`):

```tsx
<Fx effect="fractal-clouds" />                           // decorative (hosted)
<Fx effect="dots" interactionMode="active" onPress={…} />  // interactive surface (expo-view, 30)
```

Because `shader` is `interaction: 'fx'`, the interactive form is the **`<Fx interactionMode>`
effect surface** (the recognizer feeds shader uniforms `pressDepth`/`pointerX`/`pointerY`,
`30`) — *not* `FxPressable` (which animates *your* wrapped content). BYO reuses the same node
and the same `<Fx effect={...}>` surface, just with developer-supplied assets.

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
| `expo-view` (interactive) | `MTLRenderPipelineState` + `MTKView` (17) · display-link | AGSL `View.setRenderEffect` / RenderNode-backed surface (33) · frame-nanos |

Each curated shader is a `{ ios: '<msl fn>', android: '<agsl>' }` pair. Mechanics —
the MTKView render pipeline, the `.metallib` resource-bundle distribution, the AGSL
`RuntimeShader` path, the uniform `MTLBuffer` layout — live in
`structure.{ios,android}.md`. The MSL↔AGSL split is exactly what the compiler (`03`)
would later collapse to author-once.

## Surface consumption

Mounted by `<Fx>` (the effect primitive); may be attached to `FxView` as decoration (it
draws itself, samples nothing — safe over content). Feeds `effect=` ids
`fractal-clouds` / `ink-smoke` / `liquid-chrome` / `loop` / `dots` / `aurora` /
`noise-field` / `plasma` / `caustics` / `edge-glow`.

```tsx
<Fx effect="fractal-clouds" />                              // decorative, hosted
<Fx effect="dots" interactionMode="active" onPress={…} />     // interactive, expo-view (30)
<FxView effect={fx.effect.glow()}><MyCard /></FxView>       // decoration on your content
```

**Not allowed:** wrapping RN content to *sample/distort* it (severs iOS touch — that is
`content-distort`, out of scope on iOS, `01`).

## Composition & stacking

- **kind:** render-target. **composition:** `background` / `overlay` decoratively;
  `surface` when interactive (the touch-reactive layer is the content surface).
- Stacks as a render-target in an `EffectStack`: `fx.effect.shader('plasma').glow().blur()`
  — other render-targets and `filter` modifiers compose over it in declared order (`55`).

## Runtime behavior

- **native clock** — `time` is native-injected each frame (the generative animation).
- **interactive-native-input** — under `interactionMode:'active'`, the recognizer feeds
  `pressDepth`/`pointerX`/`pointerY` natively (`30`); JS never streams the pointer.
- **state-eased** — semantic uniforms (intensity, colors) change discretely, eased by
  `transition`; `time`/`resolution` are never JS-set.

## Degradation

- iOS <17 / Android <33 (no shader rung) → `{via:'none'}` (graceful no-op), or a static fill
  fallback if the preset declares one.
- BYO `.metal`/`.agsl` compile failure → `onError` → JS falls back (the load-bearing reason
  `onError` exists).

## Events

`onLoad`, `onError` (always); `onPressIn/Out/Press/LongPress` **only** when interactive
(`interactionMode`); `onTransitionEnd` when a uniform transition completes. **Semantic
events only — no per-frame pointer stream** (`04`/`35`).

## Decisions

1. **`shader` is the only `interaction: 'fx'` render node** — it carries both a
   hosted decorative rung and an expo-view interactive rung; intended use selects.
2. **Curated V1 `ShaderId` catalog** — `fractal-clouds`, `ink-smoke`, `liquid-chrome`,
   `loop`, `dots`, `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`.
   All ten ship with native MSL+AGSL implementations and are package-exposed,
   device-verified on iOS and Android.
3. **Shared minimal public uniforms in V1** — semantic overrides such as `intensity`
   resolve in JS (`50`); `time`, `resolution`, `pressDepth`, and `touch` stay native-owned
   and unsettable.
4. **BYO is a `shader` node with author-supplied `.metal`+`.agsl`** — build-time
   assets, not a runtime `source` prop. Curation is the front door.
5. **Each curated shader is an MSL+AGSL pair** maintained by the library — the 2×
   authoring cost is the price of cross-platform, and the compiler's future target.
6. **BYO registration contract (V1)** — a developer registers a `.metal`+`.agsl` pair as a
   `shader` node, consumed at the same call site as curated ids:
   - **Registration path:** `registerShader({ id, uniforms })` in JS. The `id` must not
     collide with curated `ShaderId` values; collisions are a dev warning and the curated
     id wins.
   - **Asset locations:** BYO `.metal` files live in the **fx package's** `Shaders/` directory
     (`ios/Shaders/<id>.metal`); BYO `.agsl` files live in the **fx package's** asset tree
     (`android/src/main/assets/shaders/<id>.agsl`). The app's own `ios/` or `android/`
     directories do not participate — the files must be present in the library's paths at
     build time so the existing bundling mechanic picks them up.
   - **Build wiring:** BYO uses the **same** build mechanism as curated shaders, with no
     special path. See the single-home mechanic: `structure.ios.md` §shader (hosted +
     expo-view rungs) and `52` Decision #2 (iOS `resource_bundles` + `MTL_LIBRARY_OUTPUT_DIR`)
     for the full wiring. Android reads from assets at runtime via
     `context.assets.open("shaders/<id>.agsl")` — no build-time compile step.
   - **V1 constraint:** there is no config plugin in V1 (`DEF-013`/`SHIP-004` deferred), so
     BYO assets cannot be injected into the library's bundle from the app side at build time.
     They must be present in the fx package's resource paths before the library build runs.
     V2 may add a config plugin or a build-time copy step for app-side BYO asset placement.
   - **Runtime compilation:** explicitly deferred to V2 (`DEF-008`). V1 BYO is build-time
     `.metal`/`.agsl` pairs only.
   - **Missing platform file:** degrades that platform to `{via:'none'}` (honest guard-out
     per the pair rule; rule #2).
   - **Events:** `onLoad`/`onError` fire for BYO compile/load failures, same as curated.
   - **Consumption surface:** `<Fx effect="id" />` where the `effect` prop accepts the
     registered id. The `shader` node is the IR node; the `effect` prop is the JSX call
     site (`55`).
   - **Typing idiom:** the `effect` prop boundary type is `ShaderId | (string & {})` —
     curated literals keep autocomplete; registered BYO ids are admitted. `ShaderId`
     itself stays exactly the curated union.
   - **Unregistered-id behavior:** referencing an id that is neither curated nor registered
     → native compile/load fails because the `.metal`/`.agsl` file is missing → `onError`
     fires with a descriptive error. No hard crash.
   - **Forward pointer:** the actual TypeScript change (applying `ShaderId | (string & {})`
     at the `effect` prop) is an `implement` task, not this one.

## Open questions

- **Uniform struct alignment (needs-device)** — Swift↔MSL field order/stride, and the
  AGSL uniform binding equivalent; carried from `_legacy/08`.
- ~~**BYO asset contract**~~ — **resolved (FX-006; U3-004, 2026-06-10).** The registration
  contract is recorded in Decision 6 above. Build wiring, consumption surface, typing idiom,
  and unregistered-id behavior are all pinned.

## Sources

- `_legacy/08-shader-accents-and-distribution.md` — the iOS Metal engine, render
  pipeline, `.metallib` bundling, `ShaderId` registry, runtime-compilation analysis.
- `_legacy/04-preset-system.md`, `_legacy/09-api-layering.md` — typed uniforms +
  JS resolution (now `50`).
- `02-capability-ir-and-lowering.md` — the `shader` rungs; `structure.{ios,android}.md` — mechanics.
