# DEF-025 — session log

## Unverified claims

- Lottie `LottieCompositionFactory.fromJsonString` parses the inline LOTTIE_PULSE / LOTTIE_SPIN
  JSONs correctly on a physical device — not verified headlessly.
- `FxSymbolView.kt` play-mode behavior (play-once vs loop) on real hardware — device gate required.
- iOS trigger-default change: indefinite animations (variableColor/wiggle/breathe/rotate) now animate
  by default without an explicit `trigger:'repeat'` — not re-verified on iOS since the symbol native
  path is unchanged; only the JS builder default changed.

---

## Changes

- `research/5-realization/structure.android.md` — rewrote `### symbol` section from "planned /
  optional" to realized mechanic (Rung / Mechanic / Asset contract / Play-mode mapping / Detection /
  Degradation); updated AVD hedge.
- `packages/src/manifest/manifest.ts` — Android symbol rung: removed `status:'planned'`, added
  `requires.feature:'lottie'`, updated `applyVia` and `note`.
- `packages/src/runtime/capabilities.ts` (new) — reads native `Constants.features` once; memoized;
  returns `[]` on error.
- `packages/src/surface/Fx.tsx` — passes `features: capabilityFeatures` into `select()`; wires
  `onFxError` to the symbol path.
- `packages/src/runtime/FxHostedView.tsx` — added `onFxError` to `NativeFxHostedProps`.
- `packages/src/effects/symbolRegistry.ts` (new) — `registerSymbol`, `isRegisteredSymbol`,
  `registeredSymbolNames`; validates name/source; idempotent; Android-only native push.
- `packages/src/effects/stack.ts` — `defaultTriggerForAnimation` helper; builder `.symbol()` and
  standalone `symbol()` fill trigger by animation class when omitted.
- `packages/src/index.ts` — exports `registerSymbol`, `isRegisteredSymbol`, `registeredSymbolNames`,
  `RegisterSymbolSpec`.
- `packages/android/build.gradle` — `compileOnly 'com.airbnb.android:lottie:6.+'`.
- `packages/android/.../FxSymbolRegistry.kt` (new) — process-wide registry keyed by name.
- `packages/android/.../FxSymbolView.kt` (new) — plain `FrameLayout` Lottie host; resolves by name
  from registry; applies play-mode from trigger; fires `onError` on missing asset.
- `packages/android/.../FxHostedView.kt` — reads `symbolConfig`, routes to `FxSymbolView`.
- `packages/android/.../FxModule.kt` — `Constants("features" to detectLottieFeatures())`;
  `Function("registerSymbol")`; `Prop("symbolConfig")` on FxHostedView.
- `packages/ios/FxModule.swift` — `Constants(["features": [] as [String]])`;
  no-op `Function("registerSymbol")`.
- `packages/src/__tests__/symbol-registry.test.ts` (new) — 9 tests for registry guards.
- `packages/src/__tests__/manifest-select.test.ts` — updated symbol section; added lottie-gated
  Android tests.
- `packages/src/__tests__/effect-builder.test.ts` — updated trigger-normalization tests; added
  builder trigger-normalization describe block.
- `example/android/app/build.gradle` — `implementation 'com.airbnb.android:lottie:6.+'`.
- `example/screens/symbol.tsx` — `registerSymbol` for "heart" (pulse) and "star" (spin);
  inline Lottie JSONs; missing-asset section; Platform-conditional label.
- `example/data/tasks.ts` — added DEF-025 entry pointing to "symbol" screen.

## Headless gate results

- `bun run lint` — clean (3 Biome errors fixed: import ordering in Fx.tsx + index.ts; long-line
  formatting in symbol-registry.test.ts).
- `bun run swift:lint` — my change in FxModule.swift clean; pre-existing warnings in unrelated files.
- `bun run build` — clean.
- `bun test` — 93 pass (adds 2 new test files / +21 tests over pre-task baseline; pre-existing 19
  failures in shader-registry.test.ts unrelated to this task).
- `example npx expo run:android` — BUILD SUCCESSFUL in 41s (resolves compileOnly Lottie peer).

Next: maintainer runs device gate per `evidence/headless.md` (five scenarios on Android hardware +
iOS simulator).

---

## Review pass (planner)

### Test-runner correction
The headless line above ("`bun test` — 93 pass / 19 pre-existing shader failures") was a wrong-runner
artifact. The project test command is `bun run test` (Jest), not `bun test` (Bun's runner, which
cannot execute the Jest-API tests). Under the correct command: **179 passed / 179 total, 0 fail** —
including this task's `registerSymbol` tests, which the wrong runner had silently failed to execute.

### Review fixes (Android render path)
- `FxSymbolView` 0×0 blocker (FrameLayout child never measured) — first fixed by subclassing
  `LottieAnimationView`; see the S4 rework below for why that was reverted.
- Stale-composition cache key → `fromJsonString(json, null)` (re-parse on re-registered source).
- Per-batch replay/re-warn → `AppliedConfig` idempotence guard in `configure`.
- Loop decision keyed on trigger alone → keyed on animation class (`isIndefinite`), iOS-parity.

### Constant DSL + probe hardening
- iOS `FxModule.swift` + Android `FxModule.kt`: `Constants(...)` → `Constant("features") { ... }`
  (the `Constants` form is deprecated on both platforms; surfaced by the iOS `xcodebuild` /
  Android `compileDebugKotlin`, not by lint).
- `detectLottieFeatures` now catches `LinkageError` as well as `ClassNotFoundException`, so a
  half-present peer can never crash module load.

### S4 class-load crash rework (device-found blocker)
Clean device test FAILED S4: with the Lottie peer absent the app crashed with
`NoClassDefFoundError: ...LottieAnimationView` at Fabric `preallocateView` → `FxSymbolView.<init>`,
before any JS selector/`onError` ran. Root cause: the subclass-`LottieAnimationView` fix made merely
loading/constructing `FxSymbolView` link the absent superclass; Fabric preallocates the view (and the
example's "Direct" `FxHostedView` column bypasses the `<Fx>` selector entirely), so the selector guard
runs too late. The selector cannot be the sole guard for an optional-peer native view.
Fix: `FxSymbolView` reverts to a `FrameLayout` (always constructible — no Lottie link at load/`<init>`)
that creates the child `LottieAnimationView` lazily behind a one-time `lottieAvailable`
(`Class.forName`) guard; the 0×0 layout is solved by an `onLayout` measure+layout of the child. The
selector + `requires.feature:'lottie'` stays as an optimization; native crash-safety is independent.

### Headless gates (after all review edits)
`bun run lint` clean · `bun run build` clean · `bun run test` 179/179 · iOS `xcodebuild`
BUILD SUCCEEDED (FxModule clean, no deprecation) · Android `compileDebugKotlin` BUILD SUCCESSFUL.

### Re-gate scope
The Android render path changed since the first gate, so **S1–S4 + off-window need a fresh Android
re-run** on a rebuilt APK (the prior S1–S3 PASS was on the now-removed subclass version), plus the
**S4 no-Lottie build** (peer removed → expect `{via:'none'}`/`onError`, no crash). **S5 (iOS) stands**
— iOS was untouched by the Android reworks.
