# U10-002 — `fx.effect.symbol(…)` — the symbol public surface (builder-only)

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the symbol surface; closes no new ledger row) · Unblocks: — · Blocked by: — (U10-001 + U11-001 merged)

Origin: blueprint Phase S **Unit 10**; spawned from the U10-001 review (2026-06-19) as the deferred symbol string-form surface. **Fork resolved by the maintainer (2026-06-28): builder-only.** A string effect id means "this draws with no required config"; a symbol violates that because `name` is its visual identity, not an optional tweak, and there is no truthful default glyph. So symbol gets the builder form only — never a bare `symbol-*` string id.

## Reframe — most of this unit already exists

The native symbol runtime and the type plumbing shipped in U3-007 / U3-008 / U2-003. **Do not rebuild any of it.** What exists today:

- **iOS native:** `FxSymbolView.swift` (`Image(systemName:)` + `.symbolEffect`, iOS 17/18-gated; `replaceWith` via `.contentTransition(.symbolEffect)`; empty `name` → `Color.clear`), the `symbolConfig` Prop + `setSymbolConfig` (`FxModule.swift:26`), and `FxHostedRootView` ("a symbol config wins over `effect` when both are set").
- **Manifest:** the complete `symbol` node (`manifest.ts:312`) — iOS rung `via:'native'` `.symbolEffect` `requires {os:17, substrate:'hosted'}`; Android rung `status:'planned'` (Lottie/AVD) → non-selectable. **`select()` already degrades correctly; the lowering ladder needs no change.** One reconciliation IS required (§6): the node declares `name.default = 'heart'` (`manifest.ts:319`, mirrored in `data-layer.md:243`) — that fallback glyph contradicts the builder-only / no-truthful-default decision and must be removed.
- **Types:** `SymbolConfig` (`name`+`animation` required) and `SymbolAnimation` in `catalog.ts`; `SymbolEffectConfig` + its conformance assert in `config.ts`; both `SymbolConfig`/`SymbolAnimation` already exported from `index.ts`.
- **JS binding:** `FxHostedView.tsx` already declares `symbolConfig?: SymbolConfig` (line 13).
- **Harness:** `example/screens/symbol.tsx` drives `FxHostedView` with `symbolConfig` directly (the U3-008 gate screen).

**The gap is only the public JS surface:** `EffectId` is `ShaderId | 'mesh-gradient' | 'glass'` (symbol deliberately excluded in `effects.ts`), and `fx.effect` is `{glow, glass, mesh}` only (U11 shipped no symbol terminal step on purpose — `55:77`). This unit wires the existing native door to JS through the builder.

## The goal

Add `fx.effect.symbol({ name, animation, trigger?, replaceWith? })` as the **sole** symbol surface, producing a one-step `EffectStack` consumed by `<Fx effect={stack}>`, which routes the step to `FxHostedView.symbolConfig` (not `effect`) and selects against the manifest `symbol` node so Android and iOS <17 degrade through the same `{via:'none'}` path. **`name` is required in TypeScript.** Symbol stays terminal — one render target, no multi-layer composition.

## The design (maintainer-aligned, 2026-06-28)

### 1. Discriminate `EffectStep` — `src/effects/stack.ts`

Today `EffectStep` is a flat interface with `id` + a loose `config?: MaterialConfig`. **Refactor it to a discriminated union on `id`** so glass config (`MaterialConfig`) and symbol config (`SymbolConfig`) never collapse into an untyped union (maintainer's stated preference — no "union soup"):

```ts
interface BaseStep {
  readonly transition?: Transition;
}
interface GlowStep   extends BaseStep { readonly id: 'edge-glow';     readonly intensity?: number; }
interface MeshStep   extends BaseStep { readonly id: 'mesh-gradient'; readonly intensity?: number; }
interface GlassStep  extends BaseStep { readonly id: 'glass';         readonly config?: MaterialConfig; readonly intensity?: number; }
interface SymbolStep extends BaseStep { readonly id: 'symbol';        readonly config: SymbolConfig; }   // name required; no intensity

type EffectStepId = GlowStep['id'] | MeshStep['id'] | GlassStep['id'] | SymbolStep['id'];
type EffectStep   = GlowStep | MeshStep | GlassStep | SymbolStep;
```

- `SymbolStep.config` is **required** (carries `SymbolConfig`, whose `name` is required) — a nameless symbol is unrepresentable at compile time.
- Symbol carries **no `intensity`** (it is not a shader/fill); omit it from `SymbolStep`.
- Keep value semantics intact — `freezeStep`/`freezeTransition` already deep-freeze nested `config`; symbol config rides the same path (verify it still freezes the symbol `config`).
- This is a behavior-preserving refactor for glow/glass/mesh — the existing builders/guard/tests must stay green.

### 2. The builder — `fx.effect.symbol(config: SymbolConfig)`

- Standalone `symbol(config: SymbolConfig): EffectBuilder` producing a one-step stack `[{ id: 'symbol', config }]` — mirrors `glow`/`glass`/`mesh`. The param is `SymbolConfig` (not a loosened partial) so `name`/`animation` are required.
- Add a `.symbol(config: SymbolConfig)` builder **method** too, for surface symmetry with the other render-targets, routed through the same `addRenderTarget` terminal guard (a second render-target after any first → dev warn + no-op, original step preserved). Symbol is terminal — it cannot meaningfully chain, and the existing guard already enforces single-render-target.
- `.animate`/`.defaults` stay recorded-not-wired (no effect-transition channel; same posture as U11). Symbol's own motion is the native `.symbolEffect` driven by `trigger` — not the stack `transition`.

### 3. `<Fx effect={stack}>` — route the symbol step to `symbolConfig`

In `Fx.tsx`, discriminate the symbol step and route it through the **existing hosted branch** (symbol's substrate is `hosted`):

- Select against the manifest **symbol** node: for a symbol step, `node = manifest.nodes.symbol`; run the same `select(node, platform, { deviceOS, wantInteractive: false })`. iOS ≥17 → the native rung; iOS <17 and Android (planned rung) → `{via:'none'}` → return `null` + fire `onError` `reason:'unsupported'` (the existing degradation effect — reuse it, do not fork a new path).
- Mount: `<FxHostedView symbolConfig={step.config} … />` with **no `effect`** for the symbol step (the native side ignores `effect` when `symbolConfig` is set, but pass it cleanly — `symbolConfig` only). Glass/glow/mesh steps keep today's `effect`/`materialConfig` wiring unchanged.
- **Keep `resolveEffect(id: EffectId)` string-only.** It means "public string id → manifest node + hosted `effect` string"; a symbol has no hosted `effect` string (it routes through `symbolConfig`), so do **not** widen `resolveEffect`'s parameter to accept the symbol step and do **not** add `'symbol'` to the `EffectId` string union. Instead, handle the symbol step in one of two ways (executor's choice, whichever reads cleaner): an **early discriminated branch** in `Fx.tsx` (`if (step?.id === 'symbol') { node = manifest.nodes.symbol; … mount symbolConfig }`) that returns before the string-id resolve path, **or** a separate `resolveEffectStep(step: EffectStep)` that maps each step id (including `'symbol'`) to its node + mount shape. `PublicNodeId` may gain `'symbol'` for that step-level mapping, but `resolveEffect`'s string contract stays untouched.

### 4. Exports — `src/index.ts`

`SymbolConfig`/`SymbolAnimation` are already exported. Export the symbol step type if the discriminated union surfaces a new public name (e.g. `SymbolStep`) and it is part of the documented `EffectStep` union. No bare `symbol` effect export; no `symbol-*` string id.

### 5. Manifest + data-layer reconciliation — remove the `name` default

The `symbol` node declares `name: { type: 'string', default: 'heart' }` (`manifest.ts:319`) with a mirror in `data-layer.md:243`. A default glyph contradicts builder-only (no truthful default; `name` is required). **Remove the default → `name: { type: 'string' }`** in both. This is type-safe: `ConfigFromSpecs` makes every derived field optional regardless of `default`, and `ConfigMatches` compares only keys + value types, so `SymbolEffectConfig` and the `SymbolConfigConformsToManifest` assert are unaffected (verify by re-running tsc). An absent default is the manifest's encoding of "no platform default — the field must be supplied" (`types.ts:66`). Leave the other symbol defaults (`animation: 'bounce'`, `trigger: 'value'`, `replaceWith: ''`) as-is. Do **not** touch the native `SymbolConfig` Record's Swift `name = ""` (the defensive `Color.clear` floor).

### 6. Doc correction — `24` + `55`

- **`24-symbols.md §Surface consumption` (lines 54–62):** rewrite the `<Fx effect="symbol-bounce" />` zero-config example as **aspirational/deferred** (or remove it), and record the rule: **the string form is for zero-config effects; the builder form is for required-config effects.** Symbol is the one render-target with no zero-config tier because `name` is its visual identity, not an optional tweak. Keep the `fx.effect.symbol({…})` example as the canonical door.
- **`55-composition-chain.md §V1/Unit-11 scope (line ~75–78):** flip the symbol line — the symbol terminal step now **ships** as the single-layer `fx.effect.symbol` builder step (no longer "stays the single-layer mount via `<Fx effect="symbol-…">`"; that string form does not exist). It remains terminal — not composed in multi-layer stacks (`24`).
- **`50-api-and-presets.md`** — if it references a symbol string id, align it to the builder-only rule.

## Scope guard — explicitly NOT this task

- **No `symbol-*` string id** — symbol is unreachable as a bare `<Fx effect="…">` string; not added to `EffectId`.
- **No default/placeholder glyph** — a nameless symbol is a compile error, not a fake default; the manifest declares no `name` default (§5). The native `Color.clear` for empty `name` stays only as the defensive runtime floor.
- **No native code changes** — `FxSymbolView`, `FxModule`, `setSymbolConfig`, and the `catalog.ts`/`config.ts` types already exist and are correct; do not touch the Swift/Kotlin or those types. The one data edit is removing the manifest + data-layer `name` default (§5) — not native code, not the lowering ladder.
- **No multi-layer composition** — symbol is terminal; the existing single-render-target guard covers it.
- **No effect-transition wiring** — `.animate`/`.defaults` stay recorded-not-applied (no channel; symbol motion is the native `trigger`-driven `.symbolEffect`).
- **No Android symbol runtime** — Android stays `{via:'none'}` (Lottie/AVD deferred — `24` Decision 2/4).

## Proof

```
Proof:
- headless: packages tsc + build + lint + swift:lint green; the existing glow/glass/mesh builder +
            guard + resolution tests stay green through the discriminated-union refactor; NEW tests —
            fx.effect.symbol({name,animation}) produces a one-step stack id 'symbol' carrying the
            SymbolConfig; `name` required at the type level (a // @ts-expect-error type test on a
            nameless call); the symbol step resolves the manifest `symbol` node (conformance-checked
            like the U10/U11 resolver); the terminal guard (symbol + a second render-target → dev
            warn + no-op, symbol step preserved); a symbol step on iOS<17 / Android selects {via:'none'}.
            example tsc green.
- device:   YES (iOS) — the proof is PARITY, not a new contract (no native change): the public
            <Fx effect={fx.effect.symbol({…})} /> path renders IDENTICALLY to the existing direct
            FxHostedView symbolConfig path (extend example/screens/symbol.tsx or a sibling so both
            paths sit side by side). Across the matrix: the named glyph renders; each animation class
            renders the same effect through the builder as through the direct path (discrete
            bounce/pulse/scale/appear/disappear; indefinite variableColor/breathe/rotate/wiggle);
            replaceWith content-transitions symbol→symbol; `trigger` is a passed-through mode string
            (value|state|repeat) — verify it crosses unchanged and the builder path matches the
            direct path, NOT a value-counter retrigger contract (native treats it as a mode, no
            change here). Android: fx.effect.symbol(…) → renders nothing (null) + onError
            'unsupported', no crash.
            CONDITIONAL row (possible residual): iOS-18-only effects (breathe/rotate/wiggle) degrade
            to a plain symbol on iOS 17 — run only if an iOS-17 device/sim is on hand; otherwise
            record as a code-reasoned residual (the `#available` branch), do NOT block the task on
            iOS-17 hardware.
- docs:     manifest.ts:319 + data-layer.md:243 (remove the `name: 'heart'` default); 24 §Surface
            consumption (string-vs-builder rule + the example corrected/deferred); 55 V1/Unit-11
            scope (symbol terminal builder step shipped); 50 if it names a symbol id; src/index.ts
            exports; src/fx.ts namespace.
```

## Authority links

```
Subtask: fx.effect.symbol(…) — the symbol public surface, builder-only (blueprint Phase S, Unit 10)
- Contract anchors:  24-symbols (the node + SymbolConfig + Decisions 1–4 + the surface-consumption
                     string-vs-builder split), 55 (EffectStep/EffectStack + the terminal-symbol note
                     + the V1/Unit-11 scope block), 50 (the prop language; builder = the escape
                     hatch for required config), 02/manifest (the symbol node select() degrades through).
- Decision:          fx-original — builder-only (maintainer, 2026-06-28). name is the visual identity,
                     not optional config, so it cannot live on <Fx>'s top-level props (24 leak rule)
                     and has no truthful default. REJECT a symbol-* string id, a default glyph, any
                     symbol top-level prop on <Fx>, and multi-layer symbol composition.
- Reference (HOW):   the shipped fx.effect.glow/glass/mesh builders + guard + value semantics
                     (src/effects/stack.ts), U10/U11's resolveEffect->select->mount (src/surface/Fx.tsx),
                     and the existing native symbol path (FxSymbolView.swift, FxModule symbolConfig
                     Prop, FxHostedView.tsx symbolConfig). REJECT re-deriving or rebuilding any native.
- Guides:            Code Style + Code Comments (the builder + discriminated step + Fx branch);
                     Testing (the builder/guard/resolution units + the name-required type test);
                     Device Verification (the iOS symbol matrix + Android no-op); Writing Style
                     (24/55/50 corrections); Contributing (merge bar).
- Rules gate:        #1 (native owns frames; symbolConfig crosses once as a discrete record, trigger
                     is discrete), #2 (the law — iOS-native .symbolEffect; Android degrades, not a
                     cross-platform default), #4 (self-contained generative element — not content
                     hosting), #5 (the front door is the prop/builder, not an exported Symbol
                     component), #6 (Android divergence localized to structure.android.md / the
                     manifest), #7 (Expo Modules only — Prop/Record, no JSI).
- Device-verify:     PARITY — the public fx.effect.symbol path renders == the direct symbolConfig
                     path on iOS (each animation class + replaceWith); trigger crosses as a mode
                     string (not a retrigger contract); Android/iOS<17 no-op via {via:'none'} (no
                     crash). iOS-17 degradation of breathe/rotate/wiggle is a CONDITIONAL row /
                     possible residual (run only if iOS-17 hardware is available).
- Done when:         fx.effect.symbol({name,animation,trigger?,replaceWith?}) produces an immutable
                     one-step symbol EffectStack; <Fx effect={stack}> routes it to
                     FxHostedView.symbolConfig and selects the manifest symbol node; name is
                     required in TS; resolveEffect stays string-only; symbol is unreachable as a
                     string id; symbol stays terminal; the manifest+data-layer name default is
                     removed; 24/55 corrected; iOS builder==direct parity + Android no-op proven.
```

## Lifecycle

```
[x] spec'd        this file
[x] rules-gated   #1/#2/#4/#5/#6/#7 — discrete symbolConfig record, iOS-native, Android degrades
[x] implemented   src/effects/stack.ts (discriminated EffectStep + symbol builder + .symbol method)
                  + src/fx.ts (effect.symbol) + symbol step resolution (early Fx.tsx branch OR
                  resolveEffectStep; resolveEffect stays string-only) + src/surface/Fx.tsx (symbol
                  step → FxHostedView.symbolConfig) + src/index.ts (step-type export if surfaced)
                  + manifest.ts/data-layer.md (remove the name default). NO native code changes.
[x] commented     iceberg only — why builder-only / name-required, the symbolConfig-not-effect route
[x] headless-done tsc/build/lint/swift:lint + refactor-safe existing tests + new symbol tests +
                  example tsc green
[x] device-verified  iOS builder==direct-symbolConfig parity PASS on iPhone 16 Pro sim / iOS 18.5
                  (maintainer-ran, planner-ratified 2026-06-28; JS Metro reload, no native rebuild) —
                  rows 1–4 + the iOS-18 breathe/rotate/wiggle parity, all 12 screenshots present in
                  evidence/. Android/iOS<17 no-op = code-reasoned residual (no hardware; mechanism-
                  redundant with the shared {via:'none'} path + the headless symbol-node select tests)
[x] reviewed      planner cross-checked the full diff + every gate re-run independently + the device
                  evidence (device.md + 12 screenshots, mtimes consistent); fix-round (4 maintainer
                  findings) applied + the name-required tsc proof verified to bite
[x] docs-closed   manifest.ts + data-layer.md name default removed; 24 (string-vs-builder rule +
                  example corrected), 55 (symbol terminal step shipped), 50 (if referenced);
                  exports + fx.effect.symbol namespace confirmed
[x] merged        on integration/0.1.x (maintainer-delegated tick, 2026-06-28) — the finishing commit
```

## Start here

1. **This file** — builder-only, name-required, discriminated `EffectStep`, route to `symbolConfig`, the scope guard.
2. **What already exists (do not rebuild):** `packages/ios/FxSymbolView.swift` + `FxModule.swift:26` + `FxHostedRootView.swift`; `manifest.ts:312` (the symbol node); `catalog.ts` (`SymbolConfig`/`SymbolAnimation`); `config.ts` (`SymbolEffectConfig`); `FxHostedView.tsx:13` (`symbolConfig` prop); `example/screens/symbol.tsx` (the direct harness to compare against).
3. **The path to extend** — `src/effects/stack.ts` (the builder + guard + value semantics), `src/surface/Fx.tsx` (`resolveEffect`→`select`→hosted mount), `src/effects/effects.ts` (`PublicNodeId`/`resolveEffect`).
4. **Contracts** — `24-symbols.md` (the node + the surface-consumption split), `55-composition-chain.md` (the `EffectStep` union + the V1/Unit-11 scope block).
5. **`agents/session-protocol.md`** + **`subtask-protocol.md`** — lifecycle, gates, closure.
6. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments; `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style; `reviewed`/`merged`→Contributing.
