# U2-003 — notes

## Unverified / device-pending claims (the human's gate)

These compile and pass headless but assert runtime behavior that does not run headless:

1. **`shader` reset.** Set `shader` to a curated id, then back to `undefined` → the effect
   clears (the binding now coerces `undefined → ''`; native treats `""` as no effect). U4-003's
   device run found the stale-shader bug; this is the fix, unverified on device.
2. **`onFxLoad`/`onFxError` fire once per shader change, never per frame** (iOS + Android).
   - iOS: a usable curated id loads; an id with no raster fragment function (the 5-of-10 not on
     the interactive raster path) now fires `onFxError` instead of silently drawing
     `fractal-clouds`. **Behavior change** — confirm aurora/noise-field/plasma/caustics/edge-glow
     on the interactive `FxSurfaceView` error rather than wrong-render (the hosted path is
     unaffected, still 10).
   - Android: opens + compiles the curated `.agsl` to prove the load; below API 33 stays silent
     (graceful `{via:'none'}`).
   - Payload shape `{ shader, reason? }` is identical across platforms.

## What changed

### TypeScript (headless)
- `src/manifest/manifest.ts` (new) — the canonical executable `CapabilityManifest`, authored
  `as const satisfies CapabilityManifest`, all V1 nodes with `uniforms`/`properties` + per-platform
  ladders, reconciled to the shipped native (iOS material UIKit `UIGlassEffect`/`UIVisualEffectView`;
  Android `shader` hosted `Paint.onDraw`; Android material unblurred `draw` floor) + `cadence` on
  animated rungs.
- `src/manifest/config.ts` (new) — `ConfigFor<NodeId>` derives per-effect config from the manifest
  at the type level (no codegen); build-failing assertions hold the derived material/symbol config
  in lockstep with `catalog.ts`'s `MaterialConfig`/`SymbolConfig`.
- `src/manifest/types.ts` — added `Cadence` type + `Lowering.cadence?`; added `'string'` to
  `UniformSpec.type`; made `lower`/`range`/`options` `readonly` (so the manifest authors `as const`;
  mutable inputs stay assignable).
- `src/effects/catalog.ts` — `CURATED_SHADER_IDS` runtime array is now the single source; `ShaderId`
  derives from it.
- `src/manifest/index.ts` — export `manifest`, `Cadence`, `ConfigFor`, and the per-node config types.
- `src/__tests__/manifest-conformance.test.ts` (new) — ties `CURATED_SHADER_IDS` ↔ MSL stitchable
  fns ↔ iOS hosted switch ↔ Android AGSL switch ↔ on-disk `.agsl` assets; documents the iOS raster
  5-id subset; asserts the shader node's single public uniform (`intensity`).
- `src/__tests__/manifest-select.test.ts` — repointed from the inline fixture to the shipped
  `manifest` (removed one of the five unsynchronized renderings). All 26 select assertions hold.
- `src/runtime/FxSurfaceView.tsx` — the binding is now a thin wrapper coercing `shader ?? ''`
  (absent-vs-empty fix); added the `onFxLoad`/`onFxError` props + `FxSurfaceShaderEvent` type.

### Native (compile-verified; behavior device-pending)
- `ios/FxSurfaceView.swift` — `fragmentName(for:)` returns `String?` (nil → nil pipeline → error);
  `dispatchShaderLoadState()` fires `onFxLoad`/`onFxError` once per shader change from
  `applyResolvedConfig`, deduped by `lastDispatchedShader`.
- `android/.../FxSurfaceView.kt` — `onFxLoad`/`onFxError` retyped to an `FxShaderEvent` Record
  payload (expo-image idiom); `dispatchShaderLoadState()` opens + compiles the curated `.agsl`,
  deduped by `lastDispatchedShader`.

### Docs
- `02` — schema gains `Cadence` + `cadence?` + `'string'` + readonly note; the per-effect typed-config
  Open question resolved (decision 15); cadence recorded (decision 16).
- `data-layer §1` — canonical-manifest pointer to the shipped file; shared types mirror `02`; the
  stale rung values (material iOS/Android, shader Android) reconciled; symbol `name`/`replaceWith` → `'string'`.
- `structure.ios.md` `§shader` — load/error events, the raster subset + nil-fragmentName→error, and
  the absent⟺empty⟺no-effect reset contract.
- `structure.android.md` `§shader` — load/error events (asset open+compile proof; below-33 silent).

## Out of scope (left as-is)
- Android interactive shader render (U8); completing the iOS raster catalog to 10 (U8/effects);
  BYO `registerShader()` (DEF-008); extra material uniforms / `tune` (DOC-019); the `effect`-prop
  `ShaderId | (string & {})` widening (`22` decision 6 forward pointer, a separate task).

## Review round 1 (fixes applied)

- **Comments Guide** (no internal-planning artifacts in shipped code/tests): removed the
  research-doc path + `decision`/`§`/`rule #` refs from `manifest.ts` (material + shader
  comments, and the `(rule #4)` that shipped inside a `note:` data field), `FxSurfaceView.swift`,
  `FxSurfaceView.kt`, and the two `manifest-conformance.test.ts` `it(...)` names. Each is now
  stated in plain terms or cross-references a sibling source (`FxGlassSurfaceView.swift`). A grep
  for `rule #|§|decision N|data-layer|structure.*` over the shipped files is now clean.
- **Code Style** (explicit return): `FxSurfaceView` wrapper now declares `: ReactElement`.
- **Intensity contract (decision):** reconciled the manifest `shader.intensity` to the shipped
  native clamp — `{ default: 0.8, range: [0, 1] }` (was `default: 1, range: [0, 3]`, which no
  device honored). Propagated to `02` and `data-layer §1` worked examples.
- Kotlin broad-`Exception` catch on the load proof left as-is (reviewer-accepted: defensible for
  a prove-it-loads path; Kotlin has no multi-catch, so two blocks would duplicate the body).
- Gates re-run green (tsc/build/lint/swift:lint/34 tests). Native edits were comment-only.

## Headless proof
- From `packages/`: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`,
  `bun run test` (34 pass — 8 conformance + 26 select); `git diff --check` clean.
- Native: `pod install` in `example/ios`, then `xcodebuild` (Debug, iphonesimulator) → **BUILD
  SUCCEEDED**; `./gradlew :react-native-fx:compileDebugKotlin` → **BUILD SUCCESSFUL**.

Next: the human runs the two device scenarios (shader reset; load/error fire once, with the iOS
raster-subset error behavior), then review.
