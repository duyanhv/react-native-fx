# U3-007 — iOS symbol effect implementation

Unit 3 · type: `implement` · state: `todo` · device: `yes`
Consumes: `FX-009` · Closes: — (FX-009 already resolved by DOC-008) · Blocked by: `DOC-008`, `U3-001`

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: iOS symbol effect on hosted slice (blueprint Unit 3)
- Contract anchors:  24 (symbol semantics), 02 (symbol manifest node — render-target, interaction:self, v1),
                     50/55 (public surface — symbol is terminal step mounted as <Fx effect="symbol-…">),
                     DOC-008 (ratified scope: iOS-only V1, Android deferred/non-selectable)
- Decision:          mimic the existing hosted dispatch pattern (FxFillView / FxMaterialView / FxShaderView).
                     Add FxSymbolView as a sibling per-effect view. Flip-trigger: only if the .symbolEffect
                     API changes materially in a future iOS version.
- Reference (HOW):   Apple SF Symbols / .symbolEffect on iOS 17+ (bounce/pulse/scale/variableColor),
                     iOS 18+ (breathe/rotate/wiggle/appear/disappear). .contentTransition(.symbolEffect)
                     for symbol→symbol. REJECT adding a top-level symbol prop — structured config only.
- Guides:            Code Style + Code Comments (the code); Testing (the headless tests); Device Verification
                     (the device scenario); Contributing (merge bar).
- Rules gate:        #2 (agnostic names — public surface says symbol / effect="symbol-…"; never expose
                     .symbolEffect/SwiftUI* above the manifest), #4 + #3 (symbol is self-contained effect
                     on the hosted substrate), #1 (.symbolEffect animates natively — no per-frame JS),
                     #7 (Expo Modules + Fabric, no JSI/C++).
- Device-verify:     .symbolEffect renders on iOS 17+ device; symbol→symbol transition animates; below 17
                     degrades gracefully; Android skips the planned rung (already proven by select() tests).
- Done when:         iOS hosted symbol path dispatches via FxHostedView, structured SymbolConfig crosses
                     the bridge, native renders the symbol with the requested animation, tests prove Android
                     planned rung is skipped, headless green, device scenario written.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [ ] device-verified (human gate)
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

## Proof

- **headless:** `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test` from `packages/`. Manifest select tests prove iOS 17+ selects symbol, iOS <17 and Android degrade to `{via:'none'}`.
- **device:** iOS 17+ `.symbolEffect` renders the requested SF Symbol animation; symbol→symbol transition animates via `.contentTransition(.symbolEffect(.automatic))`; below 17 shows nothing (graceful degradation). Scenario in `evidence/headless.md`.
- **docs:** structure.ios.md §symbol already pinned — consume it, do not re-derive. 24-symbols.md already ratified. No new ledger row to close (FX-009 resolved by DOC-008).

## Scope

### iOS native
- **FxSymbolView.swift** — new file. `Image(systemName:)` with `.symbolEffect` on iOS 17+
  (bounce/pulse/scale/variableColor; breathe/rotate/wiggle/appear/disappear need 18).
  `.contentTransition(.symbolEffect(.automatic))` for symbol→symbol transitions.
  Degrades below 17 to `Color.clear`.
- **FxHostedView.swift** — add `pendingSymbolConfig`, `setSymbolConfig`, update `makeSwiftUIView`
  to accept `symbolConfig` and route `case "symbol"` to `FxSymbolView`.
- **FxModule.swift** — add `Prop("symbolConfig")` to the `FxHostedView` view definition.

### TypeScript
- **src/runtime/FxHostedView.tsx** — add `symbolConfig?: SymbolConfig` to `NativeFxHostedProps`.
- **src/effects/catalog.ts** — export `SymbolAnimation` and `SymbolConfig` types.
- **src/index.ts** — export the new symbol types.

### Android
- **Nothing.** `select()` already skips `planned` rungs (U2-001). Confirm with a test.

### Tests
- **manifest-select.test.ts** — add `symbol` node to the fixture (iOS: supported, Android: planned)
  and add tests proving iOS 17+ selection, iOS <17 degradation, Android degradation.

## Scope guard

- Does NOT add a top-level `<Fx symbol="heart">` prop — structured config only.
- Does NOT string-parse "symbol-bounce" in Swift — JS resolves preset ids to structured config.
- Does NOT implement Android AVD/Lottie rendering.
- Does NOT build the `fx.effect.*` builder or the public `<Fx>` component — those are surface-layer
  work (Unit 1, not yet built). The low-level binding and native renderer are the scope.

## Done when

- `FxSymbolView` renders `.symbolEffect` on iOS 17+.
- `FxHostedView` dispatches `case "symbol"` to `FxSymbolView` with structured config.
- `FxModule.swift` exposes the `symbolConfig` prop.
- `NativeFxHostedProps` carries `SymbolConfig`.
- `manifest-select.test.ts` proves the symbol node degrades correctly on iOS <17 and Android.
- Headless checks pass (tsc/build/lint/swift:lint/test).
- Device scenario is written in `evidence/headless.md`.
- Notes and progress are updated.

## Notes

- `02` §Open questions flags that per-effect typed config (fill/material/symbol) isn't yet fully
  materialized in the manifest — only shader/motion are worked through. The `SymbolConfig` Record
  follows the `24` surface definition directly.
- `trigger: 'value' | 'state' | 'repeat'` — never `'tap'`. `symbol` is `interaction:'self'` (self-animating,
  not fx-managed gestures).
- `breathe`/`rotate`/`wiggle` need `os:18` (structure.ios.md). The native view gates these at runtime.
