# U10-002 session notes

## Device gate — PASS + ratified (planner, 2026-06-28)

Maintainer-ran on iPhone 16 Pro sim / iOS 18.5 (JS Metro reload, no native rebuild). Planner-ratified after cross-checking `device.md` + the 12 screenshots (real PNGs, mtimes 10:13–10:18 in row order):

- Builder column == direct `FxHostedView` column across bounce/pulse/scale/appear/disappear/variableColor + the iOS-18 breathe/rotate/wiggle, `star→star.fill` (`replaceWith` is a string), and trigger value/state/repeat. No crash anywhere.
- Android / iOS<17 no-op = code-reasoned residual (no hardware) — mechanism-redundant with the shared `{via:'none'}` degradation path (device-proven in prior units) + the headless symbol-node select tests.
- `device-verified` + `reviewed` ticked; state → `ready-to-merge`. Pending: maintainer merge-tick + finishing commit.

## Changes

- `packages/src/effects/stack.ts` — refactored `EffectStep` from a flat interface to a discriminated union (`GlowStep | MeshStep | GlassStep | SymbolStep`); updated `freezeStep` to discriminate per variant; added `symbol(config)` standalone function and `.symbol(config)` builder method; updated `makeBuilder` animate method to use `as EffectStep` cast for the spread + override pattern; exported `SymbolStep`.
- `packages/src/effects/effects.ts` — added `'symbol'` to `PublicNodeId` for the step-level manifest mapping (does NOT add it to `EffectId`; `resolveEffect` stays string-only).
- `packages/src/surface/Fx.tsx` — added early discriminated branch: if `step.id === 'symbol'`, selects `manifest.nodes.symbol`, degrades on Android/iOS<17 through the existing `{via:'none'}` path, mounts `<FxHostedView symbolConfig={step.config} />` with no effect string.
- `packages/src/fx.ts` — added `symbol` to `fx.effect` namespace.
- `packages/src/index.ts` — exported `SymbolStep`.
- `packages/src/manifest/manifest.ts:319` — removed `default: 'heart'` from the `name` uniform.
- `research/7-implementation/data-layer.md:243` — removed `default: 'heart'` from the `name` uniform.
- `research/2-effects/24-symbols.md §Surface consumption` — rewrote to record the string-vs-builder rule; removed `<Fx effect="symbol-bounce"/>` string example (aspirational/deferred + no string id exists); updated Composition & stacking to remove `effect="symbol-…"` reference.
- `research/1-surface/55-composition-chain.md §V1/Unit-11 scope` — flipped the symbol line: symbol terminal step now ships as `fx.effect.symbol` builder step.
- `packages/src/__tests__/effect-builder.test.ts` — added imports for `EffectId`, `GlassStep`, `GlowStep`, `MeshStep`; updated existing tests that access `.config`/`.intensity` to use typed casts; updated `resolveEffect(step.id)` calls to `resolveEffect(step.id as EffectId)`; added 8 new symbol tests across three describe blocks.

## Gates (2026-06-28)

```
packages/ bun run tsc    ✓
packages/ bun run build  ✓
packages/ bun run lint   ✓
packages/ bun run test   ✓ (157 tests, 37 in effect-builder including 8 new symbol tests)
packages/ bun run swift:lint ✓ (no errors; pre-existing spacing warnings in FxGlassSurfaceView.swift unrelated)
example/  bun run tsc    ✓
```

## Headless review — PASS (planner, 2026-06-28)

- All gates re-run independently: packages `tsc` / `build` / `lint` (46 files) / `test` (157 pass) + example `tsc` green. `swift:lint` warnings are PRE-EXISTING in `FxGlassSurfaceView.swift` (no Swift changed here) — flagged for separate housekeeping, not this task.
- Full diff read. `Fx.tsx` symbol routing correct: the symbol early-return lands after the `rung.via==='none'` null check (degradation works); `wantInteractive` is guarded with `!isSymbol`; symbolConfig-only mount, no `effect`. `resolveEffect`/`EffectId` confirmed string-only; `PublicNodeId` gains `'symbol'` for step-level mapping only. `name`-required confirmed (compile-enforced + manifest/data-layer default removed; the `@ts-expect-error` test passes under green tsc). Discriminated union — no `MaterialConfig`/`SymbolConfig` soup; `freezeStep` value semantics preserved per variant; terminal guard via the shared `addRenderTarget`.
- Internal-id leak scan over added `packages/src` lines: CLEAN. Doc edits (24/55/data-layer) accurate and on-style.
- Non-blocking nits (NOT a fix-round): the "carries the SymbolConfig" test narrows via `if (id==='symbol')` (could no-op, but a sibling test pins the id); `resolveEffect(effectId)` is computed twice in `Fx.tsx`. Both acceptable.
- No fix-round required. The `reviewed` box is held until device evidence is cross-checked post-gate.

## Fix-round (maintainer review, applied by planner, 2026-06-28)

Four findings from the maintainer's review, all confirmed against the files and fixed:

- **#1 (the type proof was dead):** `__tests__` is excluded from `tsc` (`tsconfig.json` exclude) and tests run only under Jest, so the test's `@ts-expect-error` was never evaluated — it proved nothing. Removed that test; added a REAL tsc-checked assertion `SymbolNameIsRequired` in `manifest/config.ts` (the existing `Expect<>` idiom). VERIFIED it bites: temporarily made `SymbolConfig.name` optional → `tsc` failed at `config.ts:92` (`'false' does not satisfy 'true'`); reverted → clean.
- **#2 (broken test imports):** the test imported the unexported `GlowStep`/`GlassStep`/`MeshStep` (hidden by the type-check gap). Removed the import; rewrote the glow/glass/mesh assertions to **narrow on `step.id`** (expect-then-narrow, no casts) and added an `asEffectId(EffectStepId): EffectId` helper for the resolution-conformance tests. Also fixed the two symbol tests that narrowed without a preceding `expect` on the id (the no-op-risk nit).
- **#3 (device-gate handoff had invalid SymbolConfig shapes):** the executor's report used `replaceWith: { name, animation }` (it is a `string`) and `trigger: 'manual'`/`onTrigger` (trigger is `'value'|'state'|'repeat'`, no callback). Corrected shapes carried into the device-gate prompt; no repo code affected.
- **#4 (`PublicNodeId` impossible shape):** the `'symbol'` member was unused (Fx.tsx uses the literal `manifest.nodes.symbol`; `resolveEffect` never returns it) and described an `EffectResolution` with no `hostedEffect`. Reverted `effects.ts` `PublicNodeId` to `'fill'|'material'|'shader'` (now byte-identical to its committed state — no diff).

Re-gated green after the fix-round: packages tsc / build / lint (46 files) / test (**156 pass**, was 157 — the dead `@ts-expect-error` test removed) + example tsc. Internal-id leak scan clean.

## Device-gate harness (subagent-built, planner-reviewed, 2026-06-28)

- `example/screens/symbol.tsx` only: one shared `config` now feeds two side-by-side labeled columns — "Direct (FxHostedView)" (`symbolConfig={config}`) vs "Builder (fx.effect.symbol)" (`<Fx effect={fx.effect.symbol(config)} />`). Correct shapes (`replaceWith` string, `trigger` from `value|state|repeat`). No `packages/`/native changes.
- Reviewed: diff read (clean, iceberg comment, in scope); independently re-ran `bunx tsc --noEmit -p tsconfig.json` in `example/` → EXIT 0.
- Reached via the existing Tasks card **"U3-007 · iOS symbol effect"** (`screen: "symbol"`). The card text is slightly stale (mentions only the hosted path) — optional later housekeeping in `example/data/tasks.ts`, not gate-blocking.

Next: maintainer commits the reviewed headless work + the harness (Conventional Commit, no AI co-author), then runs the iOS device gate (builder==direct-symbolConfig parity) + Android no-op via the prompt below; planner ratifies the evidence → ticks `reviewed` + `device-verified` → merge. JS-only change → Metro reload, no native rebuild.
