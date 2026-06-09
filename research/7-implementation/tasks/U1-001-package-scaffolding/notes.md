# U1-001 notes

## Unverified claims (need the device / CI gate)

- **Autolink resolves on a real app.** `expo-module.config.json` declares both
  platforms and names the module classes (`FxModule` / `expo.modules.reactnativefx.FxModule`),
  but pod-install (iOS) and gradle-sync (Android) resolution is Tier-3 build verification —
  it lands with U1-004 (bare RN + Fabric example green in CI), not headless here.
- **iOS Swift / Android Kotlin actually compile.** Verified structurally + by swift-format
  lint; true compilation needs Xcode/Gradle (device/CI gate). Metal pixels unchanged.

## What changed and why

- **package.json** — new identity per `52`: description from the CLAUDE.md thesis; dropped the
  `FxShader` keyword; added root-only `exports` map, positive `files` allowlist (ships `ios/`,
  `android/`, `build/`, `expo-module.config.json`), `publishConfig.access=public`,
  `repository`/`bugs`/`homepage`. `npm pack --dry-run` confirms `ios/Shaders/FxShaders.metal`
  + android assets ship and `src/`/`internal/`/eslint/prettier do not leak.
- **Biome migration** — added `packages/biome.json` (per the binding Code Style Guide; schema
  pinned to the installed CLI 2.4.16), removed `.prettierrc` + `eslint.config.cjs`, swapped the
  `lint` script to `biome check .`, swapped devDeps (removed eslint/prettier, added
  `@biomejs/biome`). The guide forbids eslint/prettier alongside Biome; `52` calls for replacing
  the template lint/format with the repo standard.
- **expo-module.config.json** — `platforms: [apple, android]`; module classes `FxModule` (iOS)
  and `expo.modules.reactnativefx.FxModule` (Android).
- **ios/** — `FxShader.podspec` → `ReactNativeFx.podspec` (name `ReactNativeFx`, `resource_bundles`
  `FxShaders`, `MTL_LIBRARY_OUTPUT_DIR` → `FxShaders.bundle`, iOS floor 15.1 per `53`).
  `FxShaderModule.swift` → `FxModule.swift` (`Name("ReactNativeFx")`). `FxShaderView.swift` →
  `FxSurfaceView.swift` — the working interactive Metal renderer, renamed, bundle lookup updated
  to `FxShaders.bundle`. Pixels untouched.
- **android/** — created the skeleton: `build.gradle` (expo-module-gradle-plugin, namespace
  `expo.modules.reactnativefx`, minSdk 24 per `53`), `AndroidManifest.xml`, `FxModule.kt`
  (`Name("ReactNativeFx")`), `src/main/assets/shaders/.gitkeep` for the future `.agsl`.
- **src/** — flat `FxShader*` → layered `manifest/ · surface/ · effects/ · motion/ · presets/ ·
  runtime/`. `effects/catalog.ts` holds `ShaderId`; `runtime/FxEffectView.tsx` (+ `.web`) is the
  internal `requireNativeView('ReactNativeFx')` binding (not public). `manifest/surface/motion/presets`
  are documented placeholders owned by later units. `index.ts` exports only `ShaderId` — no
  un-ratified API. Deleted the unused legacy module accessors (`FxShaderModule.ts`/`.web.ts`).
- **example/App.tsx** — parked the `ShaderView` demo (that export is gone); minimal placeholder
  screen so it doesn't import a deleted symbol. The full demo returns with `<Fx>` (U3) / U1-004.

## Scope decision (flag for review)

U1-001 = identity + layout + skeleton + keep the one working renderer (renamed). I deliberately
did **not** build the `FxNativeView` abstract base or register the full 3-view substrate trio
(FxHostedView default / FxSurfaceView / FxGroupView) — that is U1-002's named deliverable (RT-010).
So `FxModule` currently registers `FxSurfaceView` only, and the JS binding uses the default
`requireNativeView('ReactNativeFx')` rather than the D2 `(…, 'FxSurfaceView')` form (which needs
the multi-view registration U1-002 adds). If you'd rather U1-001 scaffold all three view classes
now, say so and I'll fold that in.

## Tests

No Tier-1 unit test for this task — scaffolding introduces no logic/data/FSM surface
(`index.ts` exports only the `ShaderId` type). Per the Testing Guide its proof is Tier-3
build verification (above). Added `jest.passWithNoTests` so CI's `bun run test` is green on
zero tests; the first real tests arrive with U2-001 (`select()` planned-rung tests).

## Headless proof (observed)

- `bunx tsc --noEmit` → exit 0
- `bun run build` → exit 0, emits `build/index.d.ts` (public surface = `export type { ShaderId }`)
- `biome check .` → exit 0
- `swift-format lint` → exit 0
- `npm pack --dry-run` → shader trees ship, no source/tooling leakage

## docs-closed (partial)

- **SHIP-001 → resolved** in the decision-ledger — `package.json` matches `52`; `npm pack` verified.
- **IMPL-001 → carried** (`implementation-pending`) — scaffolding pass done headless, but it closes
  only when RT-010 (substrate-view registration, U1-002) and REAL-002 (native build, device) land.
  Ledger row updated: dropped the stale "deferred this round" note, recorded progress + residual.
- Stripped all internal-doc/ledger/build-unit references from shipped code comments (iOS, Android,
  src, example); added the rule to the Code Comments Guide and bound it in CLAUDE.md.

## 2026-06-09 — docs-closed complete + merged

- IMPL-001's last consumed row, **REAL-002, resolved** (U3-005, build-verified). With RT-010
  (U1-003) and SHIP-001 (U1-001) already resolved, all three IMPL-001 consumed rows are closed →
  **IMPL-001 → resolved**. U1-001's `docs-closed` gate is now fully satisfied (both `Closes:` rows
  true in source), so it was wrongly left at `docs-pending`.
- **Merged on `integration/0.1.x`** alongside U3-005. U1-001 complete.

## Next: none — U1-001 complete. Build clears to the DOC ratify backlog.
