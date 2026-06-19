# U10-001 — `<Fx effect="id">` the effect-surface front door + `EdgeGlow`

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the ratified surface; no new ledger row) · Unblocks: U11-001, U12-001 · Blocked by: — (Units 1/2/3/8 + U3-009 all merged)

Origin: blueprint Phase S **Unit 10**; rule #5 (the front door is `preset`/`feedback`/`effect` props on your content, never exported `Toast`/`Card`). `56` makes `<Fx effect="…">` the **canonical API**; the ten curated shaders are reachable from JS only once this lands (`50 §V1 shader catalog`). Design pre-aligned with the maintainer (2026-06-19).

## The goal

Ship the canonical front door — a string-form `<Fx effect="aurora">` component that resolves a public effect id, runs `select()` over the manifest, mounts the right substrate view, and wires the public prop/event/ref surface. Plus `EdgeGlow` as thin sugar, and the `Fx` callable upgrade (absorbing today's provisional `Fx.Scroll` namespace).

This is **string-form only**. The `fx.effect.*` builder + `EffectStack` composition is **Unit 11**, not here.

## The design (pre-aligned)

### 1. The effect-id resolver — a new artifact under `src/effects/`

The single public id → realization map, so `<Fx>` is never a hand-coded switch that drifts from the manifest. Shape (verify exact field names against the bindings):

```ts
// src/effects/effects.ts  (new)
type EffectResolution = {
  node: NodeId;            // the manifest node select() walks
  hostedEffect: string;    // the native `effect` string FxHostedView dispatches on
  // + any fixed config the id implies (e.g. glass → material node)
};
// 'aurora' … 'edge-glow' (the 10 CURATED_SHADER_IDS) → { node:'shader',   hostedEffect:<id> }
// 'mesh-gradient'                                     → { node:'fill',     hostedEffect:'fill' }
// 'glass'                                             → { node:'material', hostedEffect:'material' }
// 'symbol'                                            → { node:'symbol',   hostedEffect:'symbol' }  // see §note
export type EffectId = …;            // the union of all public ids
export function resolveEffect(id: EffectId): EffectResolution;
```

The native dispatch contract (do not invent strings — confirmed in code): `FxHostedView` dispatches on `"fill"` / `"material"` / the ten shader ids (`packages/ios/FxHostedView.swift`, `packages/android/…/FxHostedView.kt:90`). So the resolver maps the *public* id (`mesh-gradient`, `glass`) onto those native strings.

**Conformance test** (mirrors `manifest-conformance.test.ts`): every `CURATED_SHADER_ID` resolves to `node:'shader'`; `mesh-gradient`/`glass`/`symbol` resolve to their nodes; every resolved `node` exists in `manifest.nodes`; every resolved `hostedEffect` is one the native dispatch accepts. This is what keeps `<Fx>` honest against the manifest.

### 2. Resolution + mount (the `<Fx>` component)

```
effect id → resolveEffect() → node
wantInteractive = interactionMode ∈ {passive, active, controlled} AND node supports fx interaction
rung = select(manifest.nodes[node], Platform.OS, { deviceOS, wantInteractive })
  rung.requires.substrate === 'expo-view' → mount <FxSurfaceView shader=… interactionMode=… ref=… …/>
  rung.requires.substrate === 'hosted'    → mount <FxHostedView effect=hostedEffect intensity=… materialConfig=… symbolConfig=… …/>
  { via:'none' }                          → render nothing; fire onError as ADAPTER DEGRADATION (§3)
```

Prop mapping per path:
- **Hosted (`FxHostedView`):** `effect`=`hostedEffect`, `intensity`, `materialConfig` (glass), `symbolConfig` (symbol), `style` (composition-resolved, §4). No native events exist on this binding.
- **Interactive (`FxSurfaceView`):** `shader`=the shader id, `intensity`, `interactionMode`, the forwarded `ref` (§5), press + load/error events (§3), `style`.

### 3. Events — split explicitly (maintainer-refined)

Native events exist **only** on `FxSurfaceView`:
- `onPress` / `onPressIn` / `onPressOut` / `onLongPress` ← `onShaderPress*`.
- `onLoad` / `onError` ← `onFxLoad` / `onFxError` (the native shader **compile** load/error).

The **hosted path emits no native lifecycle events** — `NativeFxHostedProps` has none. **Do NOT synthesize `onLoad` for hosted.**

`select() → {via:'none'}` calls `onError` on either path, but it is named in code + docs as **adapter degradation** (the capability is unavailable on this device/substrate), explicitly distinct from a native shader-load failure. One discriminable reason field, e.g. `{ reason: 'unsupported' }` vs the native `onFxError` reason.

### 4. `composition` → JS style (not a native prop)

`composition` ∈ `background | overlay | surface`, default **`surface`** (`50 §prop language`: "effect-layer position only"). Conservative U10 mapping:
- `surface` — normal flow (the wrapper lays out inline).
- `background` / `overlay` — `StyleSheet.absoluteFill` wrapper, z-ordered behind / above siblings.

Document that it positions **the effect layer**, not arbitrary RN content (`<Fx effect>` draws the visual whole — `56`; it wraps no content).

### 5. Ref forwarding (`controlled`)

`controlled` is in public scope, so forward a ref to `FxSurfaceView`'s `FxSurfaceViewRef` (`setUniform` / `setHighlight`). The ref methods are **only meaningful on the expo-view path** (`interactionMode` `active`/`controlled`); on the hosted path they are absent/inert. Omitting the ref would leave `controlled` half-present.

### 6. `EdgeGlow` + the `Fx` callable

- `EdgeGlow` — thin sugar: `(props) => <Fx effect="edge-glow" {...props} />` (DOC-004; the one named effect component).
- `Fx` becomes a **callable component** with statics: `function Fx(props)` + `Fx.Scroll = FxScroll` reattached (today's `Fx = { Scroll }` namespace says it holds "until `<Fx>` lands and absorbs it" — `FxScroll.tsx:53`). Preserve the `FxScroll`/`FxScrollProps`/`FxScrollTile` exports.
- `src/index.ts`: add `EdgeGlow`; `Fx` is already exported.

### Public prop surface (the contract)

```ts
type FxProps = {
  effect: EffectId;                                  // required — the only required prop
  intensity?: number;
  composition?: 'background' | 'overlay' | 'surface'; // default 'surface'
  interactionMode?: InteractionMode;                  // default 'none'
  materialConfig?: MaterialConfig;                    // glass
  symbolConfig?: SymbolConfig;                        // symbol
  onLoad?: (e) => void;  onError?: (e) => void;       // FxSurfaceView path + adapter degradation
  onPress?, onPressIn?, onPressOut?, onLongPress?;    // FxSurfaceView path only
  style?: StyleProp<ViewStyle>;
};
// ref: FxSurfaceViewRef (controlled)
```
`fill` (`mesh-gradient`) carries **no config beyond `intensity`** (U3-009). `filter` is not a public effect id (no renderer).

## Scope guard — explicitly NOT this task

- **No `fx.effect.*` builder, no `EffectStack`/stack composition** → Unit 11.
- **No fill config beyond `intensity`** (U3-009 narrowed it).
- **No hosted native lifecycle events** (synthesize nothing; §3).
- **No `FxView` / `FxPressable` / `FxGroup` / `FxItem`** → Units 12/13/14.
- **Symbol, first cut:** support the id with **iOS render / Android no-op** — Android's hosted dispatch has no symbol case (`else → return`), and/or `select('symbol', android, …)` degrades to `{via:'none'}`; that is the natural degradation, not a defect. Verify the public symbol id/config shape against `24-symbols` + `FxSymbolView` / `setSymbolConfig` before finalizing the resolver's `symbol` entry (the one corner the bindings underspecify); recommend `<Fx effect="symbol" symbolConfig={{…}}>`.

## Proof

```
Proof:
- headless: packages tsc + build + lint green; NEW resolver-conformance test (every public id →
            a real manifest node + an accepted native effect string) + <Fx> resolution unit tests
            (effect → substrate/binding; interactionMode → wantInteractive; composition → style;
            select→none → adapter-degradation onError, never throws). example tsc green.
- device:   YES — on iOS + Android, via the example harness: (a) a decorative hosted shader
            (`aurora`) renders; (b) an interactive shader (`interactionMode="active"`) renders and
            fires onPress*/onLoad; (c) `glass` + `mesh-gradient` render hosted; (d) `EdgeGlow`
            renders; (e) a symbol renders on iOS / no-ops on Android; (f) an unsupported effect
            degrades to adapter-error with no crash. Curated shaders do not render on the iOS sim —
            use a physical iPhone (or accept the Android-device + iOS-UIKit-paths split per the
            Device Verification Guide).
- docs:     56 / 50 surface status (the canonical `<Fx effect>` API now exists, not "planned");
            src/index.ts exports (+ EdgeGlow); 52 §Public exports tick if it tracks per-symbol status.
```

## Authority links

```
Subtask: <Fx effect> the effect surface + EdgeGlow (blueprint Phase S, Unit 10)
- Contract anchors:  56 (the canonical `<Fx effect>` API + named-component policy, DOC-004),
                     50 (the prop language: effect/composition/interactionMode; adapter dispatch),
                     55 (effect semantics; the string form — the stack builder is Unit 11),
                     02 (the manifest + select() the adapter consumes), 40 (native↔public event
                     names: onShader*→onPress*, onFx*→onLoad/onError).
- Decision:          fx-original — the JS surface over the shipped substrate views. select() over
                     the manifest picks the substrate; no flip expected (the views already render
                     every effect). REJECT exposing FxSurfaceView/FxHostedView as the public API
                     (52), a bare `effect` export (55 Decision 7), and any per-frame JS.
- Reference (HOW):   the shipped surface components — FxPresence.tsx (a stateful surface comp over
                     FxSurfaceView; ref + event remap pattern) and FxScroll.tsx (the `Fx` namespace
                     to absorb). select() = src/manifest/select.ts. REJECT re-deriving the manifest.
- Guides:            Code Style + Code Comments (the component + resolver); Testing (resolver
                     conformance + resolution units); Device Verification (the on-device matrix);
                     Writing Style (56/50 status); Contributing (merge bar).
- Rules gate:        #1 (native owns frames — JS only configures + hears semantic events),
                     #2 (the law — agnostic effect ids, platform-native realization; only
                     native-backed config crosses, U3-009), #3 (two substrates — select() picks),
                     #4 (never host RN content to distort — `<Fx>` draws the whole, wraps nothing),
                     #5 (the front door is `effect` props, not exported widgets),
                     #7 (Expo Modules only — no JSI), #9 (reads layout, never writes).
- Device-verify:     the hosted/interactive/glass/fill/symbol/EdgeGlow render + the press + the
                     adapter-degradation path, both platforms (the matrix in Proof).
- Done when:         <Fx effect="id"> renders every public id through the right substrate, wires
                     intensity/composition/interactionMode/uniform-ref + onPress*/onLoad/onError,
                     EdgeGlow is sugar over it, Fx stays callable-with-.Scroll, the resolver
                     conformance + resolution tests are green, and it is device-verified.
```

## Lifecycle

```
[ ] spec'd        this file
[ ] rules-gated   #1/#2/#3/#4/#5/#7/#9 — JS surface only; no per-frame JS, no content hosting
[ ] implemented   src/effects/effects.ts (resolver) + src/surface/Fx.tsx (callable, absorbs Scroll)
                  + EdgeGlow + src/index.ts exports
[ ] commented     iceberg comments only — no internal ids (Code Comments Guide)
[ ] headless-done tsc/build/lint + resolver-conformance + <Fx> resolution units + example tsc green
[ ] device-verified  the both-platform render/press/degradation matrix (Device Verification Guide)
[ ] reviewed
[ ] docs-closed   56/50 status flipped; index.ts exports; the resolver is the single id→node source
[ ] merged
```

## Start here

1. **This file** — the resolver, the resolution/mount flow, the event split, the scope guard.
2. **`56`** (canonical `<Fx effect>` API + EdgeGlow/DOC-004) and **`50 §prop language`** (effect / composition / interactionMode semantics).
3. **The shipped substrate views** — `src/runtime/FxHostedView.tsx` (`NativeFxHostedProps`), `src/runtime/FxSurfaceView.types.ts` (`NativeFxSurfaceProps` + `FxSurfaceViewRef`), and the native dispatch (`packages/{ios,android}/…/FxHostedView.*`).
4. **The precedents** — `src/surface/FxPresence.tsx` (surface comp → FxSurfaceView, ref + event remap) and `src/surface/FxScroll.tsx` (the `Fx` namespace to absorb). `select()` = `src/manifest/select.ts`; ids = `src/effects/catalog.ts`.
5. **`agents/session-protocol.md`** + **`subtask-protocol.md`** — lifecycle, gates, the cardinal closure rule.
6. **Guides per gate:** `implemented`→Code Style; `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style; `reviewed`/`merged`→Contributing.
