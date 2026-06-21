# U15-001 — notes

## Unverified claims (device gate)

- iOS 26: `tint` string parsed by `uiColorFrom` produces a visible color cast on `UIGlassEffect.tintColor` — confirmed by code inspection against `references/expo/packages/expo-glass-effect/ios/GlassView.swift`; unverified on device.
- iOS 26: `colorScheme` applied via `effectView.overrideUserInterfaceStyle` forces the expected appearance — unverified on device.
- iOS <26: `colorScheme` applied via `.environment(\.colorScheme, ...)` on the SwiftUI material — unverified on device.
- iOS <26: `tint` degrades silently (no tint API on SwiftUI adaptive materials) — code-reasoned, not device-checked.
- Android: `tint` via `Color.parseColor` drives the frost scrim color — unverified on device.
- Android: `colorScheme: 'dark'` switches scrim base to `#1C1C1E`-class dark gray — unverified on device.

## What changed

- `packages/src/manifest/types.ts` — `UniformSpec.default` made optional (absent = no platform default)
- `packages/src/manifest/manifest.ts` — added `tint: { type: 'color' }` and `colorScheme: { type: 'enum', default: 'system', options: [...] }` to `material.uniforms`
- `packages/src/effects/catalog.ts` — replaced `// TODO` comment with `tint?: string` and `colorScheme?: 'system' | 'light' | 'dark'`
- `packages/ios/FxGlassSurfaceView.swift` — added `tint`/`colorScheme` stored props; extended `setMaterialConfig` diff guard; extended `applyEffect` to apply `tintColor` + `overrideUserInterfaceStyle`; added `uiColorFrom` hex parser + `userInterfaceStyleFrom` helpers; extended `MaterialConfig` struct with `@Field var tint: String?` + `@Field var colorScheme: String?`
- `packages/ios/FxMaterialView.swift` — added `colorScheme: ColorScheme?` parameter; applies `.environment(\.colorScheme, scheme)` on the below-26 SwiftUI path; tint degrades
- `packages/ios/FxHostedRootView.swift` — passes `colorSchemeFrom(props.materialConfig?.colorScheme)` to `FxMaterialView`; added `colorSchemeFrom` helper
- `packages/android/.../FxMaterialView.kt` — added `DARK_SCRIM_BASE` constant; `scrimBaseColor` field; `scrimBaseColorFor` helper; extended `setMaterialConfig` to detect color changes; extended `MaterialConfig` Record with `tint`/`colorScheme` fields; `onDraw` sets `scrimPaint.color` before alpha
- `research/5-realization/structure.ios.md` — `§material`: added tint + colorScheme mechanic (iOS-26 rung) + below-26 colorScheme note + tint degradation note
- `research/5-realization/structure.android.md` — `§material`: added tint + colorScheme mechanic (scrim color logic, dark base constant)
- `research/2-effects/21-materials-and-glass.md` — `tintColor` → `tint`; struck `weight`; clarified `intensity` is the `<Fx>` presence prop, not a MaterialConfig field
- `packages/src/__tests__/manifest-conformance.test.ts` — added `manifest material node — tint + colorScheme uniforms` describe block
- `packages/src/__tests__/effect-builder.test.ts` — added glass tint + colorScheme forwarding assertion
- `example/screens/fill-material.tsx` — added interactive tint (3 colors + none) and colorScheme (system/light/dark) controls with live glass preview
- `research/7-implementation/tasks/U15-001/evidence/headless.md` — device runbook

## Headless gate results

- `packages tsc --noEmit` — ✅ (lockstep compiles; MaterialConfigConformsToManifest passes)
- `packages bun run build` — ✅
- `packages bun run lint` — ✅ (Biome: no fixes applied)
- `packages bun run test` — ✅ (145 tests pass)
- `example tsc --noEmit` — ✅
- `pod install` — ✅ (100 pods)
- iOS xcodebuild — ✅ BUILD SUCCEEDED
- Android `:react-native-fx:compileDebugKotlin --rerun-tasks` — ✅ BUILD SUCCESSFUL
- Android `:app:assembleDebug` — ✅ BUILD SUCCESSFUL

## `UniformSpec.default` change

`default` was `unknown` (required). Made `default?: unknown` (optional) so `tint: { type: 'color' }` — which intentionally has no platform default — is representable without lying about a JS default value. The lockstep `ConfigFromSpecs` type already makes all config keys optional via `?`; the `default` absence means "no platform default", not "required field". This is the minimal schema change the task requires.

Next: device-verify on iOS 26 + Android hardware per evidence/headless.md. Device gate is a human handoff.
