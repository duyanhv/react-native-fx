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

## 2026-06-10 — A1-1 fix landed with device evidence

What changed:
- `packages/ios/FxSymbolView.swift` — the displayed glyph resolves to `replaceWith ?? name`, so `replaceWith` drives the rendered symbol instead of only arming the content transition.
- `research/5-realization/structure.ios.md` §symbol — the resolved-display mechanic (`replaceWith ?? name`; `replaceWith` takes precedence while set) is pinned.

Headless gates: lint, swift:lint, build, test (21 passed), and `tsc --noEmit` in `packages/` and `example/` all green; xcodebuild `BUILD SUCCEEDED` recorded in `evidence/xcodebuild.md`.

Device run (iPhone 17 Pro simulator, iOS 26.0, Debug build; evidence in `evidence/device-run-2026-06-10/`):

| Item | Result | Evidence |
| --- | --- | --- |
| Before: `replaceWith` unset displays `name` (heart, AX identifier `heart`) | PASS | `A1-1-before-replaceWith-unset.png` |
| After: `replaceWith: "star"` changes the displayed glyph (AX identifier `star`, caption `heart · bounce · value → star`) | PASS | `A1-1-after-replaceWith-star.png` |
| Transition: symbol-effect morph while toggling `replaceWith` heart→star→heart→star | PASS | recording reviewed in-session, not retained (repo policy: no video files); the before/after stills + AX identifiers are the durable evidence |
| Regression: bounce still plays (`trigger: "repeat"`; the still catches the glyph mid-bounce) | PASS | `A1-1-regression-bounce-repeat.png` (recording reviewed in-session, not retained) |
| Regression: clearing `replaceWith` returns the display to `name` (AX identifier back to `heart`) | PASS | `A1-1-regression-cleared-back-to-name.png` |

The A1-2 coverage gap (iOS 17 / sub-17 degradation) remains open — the installed 18.5 runtime is ≥18 and cannot exercise it.

Next: maintainer ratification of A1-1 evidence.

## 2026-06-10 — A1-1 ratified; device gate held for older hardware

- The maintainer ratified the A1-1 evidence: `replaceWith` drives the displayed glyph, the
  fix round is accepted. Reviewer approved the diff (one-expression fix honoring the `24`
  contract; mechanic pinned in `structure.ios.md` §symbol before code, per the operating
  rule).
- Maintainer decision on A1-2: do NOT waive — the OS-degradation rows (iOS 17 loses
  `breathe`/`rotate`/`wiggle` gracefully; sub-17 renders `Color.clear`) wait for a real
  iOS 17 / sub-17 device. U3-007 therefore stays short of `device-verified`; the state
  moves to `device-pending`, blocked on hardware availability only.
- Repo policy applied: the two device-run recordings and their gesture-telemetry sidecars
  were deleted before commit — video files are not committed as evidence; the stills and
  AX-identifier captures are the durable record.

Next: acquire/borrow an iOS 17 or sub-17 device for the A1-2 rows; everything else on
U3-007 is done.
