# U3-007 — notes

## Unverified claims
- `.symbolEffect` renders correctly on a physical iOS device.
- Symbol→symbol `.contentTransition` animates as expected.
- iOS 18-only effects (breathe/rotate/wiggle) degrade correctly on iOS 17 (render plain symbol, no invented fallback).
- Android planned rung skip confirmed at runtime.
- Trigger wiring (`value:` for discrete, `isActive:` for indefinite) fires animations correctly on device.

## What changed
- `packages/ios/FxSymbolView.swift` — new file. `Image(systemName:)` with `.symbolEffect` on iOS 17+ (bounce/pulse/scale/appear/disappear/variableColor). iOS 18 adds breathe/rotate/wiggle. `.contentTransition(.symbolEffect(.automatic))` for symbol→symbol. Degrades below 17 to `Color.clear`. `SymbolConfig` Record with `@Field` on every property carries structured config across the bridge.
- `packages/ios/FxHostedView.swift` — added `pendingSymbolConfig`, `setSymbolConfig`, and `applyResolvedConfig` path that dispatches `symbolConfig` to `FxSymbolView` before the `effect` path.
- `packages/ios/FxModule.swift` — added `Prop("symbolConfig")` to the `FxHostedView` view definition.
- `packages/src/effects/catalog.ts` — added `SymbolAnimation` and `SymbolConfig` types. `name` is required (non-optional).
- `packages/src/runtime/FxHostedView.tsx` — added `symbolConfig?: SymbolConfig` to `NativeFxHostedProps`.
- `packages/src/index.ts` — exports `SymbolAnimation` and `SymbolConfig`.
- `packages/src/__tests__/manifest-select.test.ts` — added `symbol` node to the fixture (iOS supported, Android planned) and three tests proving iOS 17+ selection, iOS <17 degradation, and Android planned-rung skip.

## Blocker fixes (review round)
- **A — `some SymbolEffect` compile error:** The original computed property returning `some SymbolEffect` from a switch failed because each case returns a different concrete type (BounceSymbolEffect, PulseSymbolEffect, etc.). Fixed by applying `.symbolEffect` directly inside a `@ViewBuilder` switch on the `Image` view.
- **B — `@Field` missing:** The original `SymbolConfig` used plain `var` without `@Field`, so the bridge dropped all JS values. Fixed by adding `@Field` to every property and importing `ExpoModulesCore`.
- **C — invented fallback on iOS 17:** The original code substituted `.bounce` for iOS 18-only effects on iOS 17. Fixed per DOC-012: iOS 18-only effects (`breathe`, `rotate`, `wiggle`) render the plain symbol without effect on iOS 17. `scale`, `appear`, `disappear` are correctly iOS 17 and are not gated.
- **D — `name` defaulting to "heart":** The original TS type and Swift default both silently rendered a heart when `name` was missing. Fixed by making `name` required in the TS type and rendering `Color.clear` when the native `name` is empty.
- **E — `trigger` wiring wrong:** The original code bound `value:` to the static trigger *mode* string (`"value"`/`"state"`/`"repeat"`), which never changes so the animation fires once on mount and never again. Fixed by using the trigger mode to select the binding:
  - `trigger: "value"` → discrete effects fire once on mount (`.symbolEffect(.bounce)` with no `value:`)
  - `trigger: "state"` → indefinite effects use `isActive:` (active while the state is held)
  - `trigger: "repeat"` → all effects use `.repeating` option (distinct from state)
  - Discrete effects no longer use `value:` since the binding currently carries no changing value prop.

## Why
- `24` defines the symbol semantics: structured `SymbolConfig` (name, animation, trigger, replaceWith) carried as a Record, never a string to parse. The public surface is `effect="symbol-bounce"` (zero-config) or `fx.effect.symbol({...})` (builder), not a top-level `<Fx symbol="heart">` prop.
- `structure.ios.md §symbol` already pins the mechanic: `.symbolEffect` on iOS 17+, no `expo-view` rung. The task consumes this mechanic without re-deriving.
- `DOC-008` ratified iOS-only V1; Android stays planned/non-selectable. The `select()` test confirms the planned rung is already skipped (U2-001 behavior), so no Android code is needed.
- `02` §Open questions notes that per-effect typed config for `fill`/`material`/`symbol` isn't fully materialized in the manifest yet — the `SymbolConfig` Record follows the `24` surface definition directly.

## Next: device verification
- Run the device scenario in `evidence/headless.md` on iOS 17+ and Android.
- Confirm `symbolConfig` prop reaches native and `.symbolEffect` renders.
- Confirm iOS 18-only effects degrade to plain symbol on iOS 17.
- Confirm Android planned rung skip at runtime.
- Confirm trigger wiring fires animations correctly (discrete on mount for value mode, repeating for repeat mode, indefinite for state mode).
