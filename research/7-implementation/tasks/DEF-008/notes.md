# DEF-008 — notes

## Unverified claims (need the device gate)

- The runtime-compiled `app-pulse` shader actually **renders** on an iOS physical GPU and an
  Android GPU. Headless proves it compiles/links and the app builds; the pixels are device-only.
- The malformed `app-broken` source fires `onFxError` with no crash on a real GPU (the AGSL
  parse-throw is caught; the MSL `makeLibrary(source:)` throw returns nil → error). Device-only.
- The iOS runtime-pipeline cache hit on re-mount and the Android no-recompile-on-intensity claim
  are mechanism-level; visual confirmation is device-only.
- `app-ios-only` renders on iOS and is silently blank (no error) on Android. Device-only.

## Spike result (step 1)

- **NO.** SwiftUI `.colorEffect` cannot consume a runtime-built `MTLLibrary`. The `Shader` surface
  admits a function only via `ShaderLibrary`, whose only public initializers are `.default`,
  `init(url:)`, and `init(data:)` (a *compiled* `.metallib` URL/blob); there is no public init over
  an `MTLLibrary`, `MTLFunction`, or MSL source string (iOS 26.5 SDK), and `makeLibrary(source:)`
  yields an `MTLLibrary` with no public path back to metallib `Data`. Resolved by SDK-surface
  inspection (definitive, headless) — a device probe cannot make a nonexistent API exist; the
  on-device render of the chosen expo-view lowering is device-scenario point 5.
- Consequence: runtime BYO lowers through the **expo-view Metal raster path** on both platforms,
  consumed at the `FxSurfaceView` `shader` prop. Recorded in `structure.ios.md` § shader.

## Changed

- `research/5-realization/structure.ios.md` § shader — runtime-compilation section rewritten to the
  resolved spike (expo-view-only), the `fx_fragment` ABI + preamble, the by-source cache, and the
  clean-replacement re-registration rule.
- `research/5-realization/structure.android.md` § shader — runtime-compilation section: registry
  source resolution, per-view `RuntimeShader` reality (id guard, next-mount picks up re-registration),
  guarded uniform writes, clean replacement.
- `packages/src/effects/registry.ts` (new) — JS registry: `registerShader`, `isRegisteredShader`,
  `registeredShaderIds`, `ShaderSource`/`RegisterShaderSpec` types. Collision→curated wins (warn),
  both-absent reject (warn), idempotent no-op on identical source, clean replacement on new source,
  pair-rule null-push to native for the source-less platform. Native push lazily resolves the module
  and no-ops on web/test.
- `packages/src/index.ts` — export `registerShader` + friends + types.
- `packages/src/runtime/FxSurfaceView.tsx` — `shader` prop widened to `ShaderId | (string & {})`
  (admits registered BYO ids; keeps curated autocomplete).
- `packages/src/__tests__/shader-registry.test.ts` (new) — 8 Tier-1 tests (collision, pair rule,
  platform source pick, idempotency, replacement, listing).
- `packages/ios/FxShaderRegistry.swift` (new) — process-wide, locked id→source? registry; nil entry
  = registered-but-source-less (distinct from unknown).
- `packages/ios/FxModule.swift` — `Function("registerShader")` pushes source into the registry.
- `packages/ios/FxSurfaceView.swift` — `runtimePipelineCache` (keyed by source string), `runtimePreamble`,
  `runtimePipeline(forSource:)` via `makeLibrary(source:)` linking the bundled `fx_fullscreen_vertex`
  with the runtime `fx_fragment`; `resolvedPipeline(for:)` = curated ?? runtime, threaded through
  `draw`/`hasActiveEffect`/`dispatchShaderLoadState` (registry-aware error vs silent degradation).
- `packages/android/.../FxShaderRegistry.kt` (new) — synchronized id→source? object.
- `packages/android/.../FxModule.kt` — `Function("registerShader")`.
- `packages/android/.../FxShaderView.kt` — `CURATED_SHADER_IDS` set added next to `agslAssetPathFor`.
- `packages/android/.../FxSurfaceShaderView.kt` — `resolveShaderSource` (curated asset vs registry),
  guarded `RuntimeShader` construction (malformed→null→GONE), generalized uniform scan
  (time/resolution/intensity/pressDepth/touch), guarded `onDraw` writes.
- `packages/android/.../FxSurfaceView.kt` — registry-aware `dispatchShaderLoadState` (unknown→error,
  registered-source-less→silent, compile fail→error).
- `example/screens/runtime-shader.tsx` (new) + `example/data/tasks.ts` (DEF-008 entry +
  `runtime-shader` DemoScreen) + `example/app/(tasks)/[taskId].tsx` (route) — app-supplied shader demo.
- `research/7-implementation/tasks/DEF-008/evidence/device.md` (new) — the 6-row device runbook.

## Design decisions made (spec left open)

- **iOS runtime fragment ABI:** author supplies `fragment half4 fx_fragment(VSOut in [[stage_in]],
  constant FxUniforms &u [[buffer(0)]])`; fx prepends a fixed preamble (FxUniforms + VSOut) and links
  the bundled full-screen vertex. Documented in `structure.ios.md` and the demo.
- **Cache key:** iOS keys the runtime pipeline by the full source string (strictly stronger than a
  hash, collision-free). Android keeps `RuntimeShader` per view (mutable uniform state can't be shared);
  the id guard prevents recompile on uniform changes; re-registration is picked up on next mount.
- **Re-registration:** clean dev-time replacement (registry overwrite + re-push); identical source is
  an idempotent no-op. No new id/version required.
- **Consumption surface:** the existing `FxSurfaceView` `shader` prop on both platforms (the general
  `<Fx>` component is not built yet; not in scope). No `<Fx source>` prop.

## 2026-06-14 — device run (agent-device): result **PASS** (all six rows, both platforms)

iOS iPhone 17 Pro **simulator** iOS 26.5 (no signing team for a device build; sim carries real
signal — `makeLibrary(source:)` compiles + renders there, and curated stitchable shaders render per
DEF-014); Android **POCO F1 physical**, Android 15 / API 35; commit `a46b864` + DEF-008 working
tree. Built iOS via `expo run:ios`, Android via `:app:assembleDebug` + `adb install`.

Findings: every row passed. Row 1 — `app-pulse` compiles and renders an animated pulse on both GPUs,
intensity dims brightness live. Row 2 — `app-broken` fires `onFxError` (iOS `runtime shader failed
to compile`; Android surfaces the AGSL `unknown identifier` message), surface blank, app stable.
Row 3 (temporary compile-site logging, reverted) — iOS compiles `app-pulse` once then per-frame
cache-hits and never recompiles it on re-mount/intensity (the malformed source re-attempts because a
nil pipeline is uncached — error path); Android constructs the `RuntimeShader` once per view, never
on intensity change (id guard), per-view reconstruct on id change is the documented divergence.
Row 4 — `app-ios-only` renders on iOS, silently blank (`idle`, no error) on Android. Row 5 — runtime
shader lowers through `<FxSurfaceView>` (expo-view), matching the spike. Row 6 — curated catalog
(fractal-clouds, aurora) unregressed on both. Evidence (stills/clips + compile logs) in `evidence/`.

⚠️ **Regression caused by the runner, after all evidence was captured:** reverting the Row-3
compile logging via `git checkout` reverted `packages/ios/FxSurfaceView.swift` and
`packages/android/.../FxSurfaceShaderView.kt` to HEAD, discarding the **uncommitted** DEF-008 source
in those two files (iOS `runtimePipelineCache`/`runtimePreamble`/`runtimePipeline(forSource:)`/
`resolvedPipeline`; Android `resolveShaderSource`/guarded `RuntimeShader`/generalized uniform scan/
guarded `onDraw`). All recovery paths (git stash/reflog/dangling/branches/worktrees, Zed & VS Code
history, Trash, Time Machine, APFS snapshots, Spotlight) were empty. Per maintainer instruction the
files were left reverted, not reconstructed. **Both files must be re-implemented from the "Changed"
section above before the tree builds clean again.** All other DEF-008 files are intact.

Next: maintainer ratification (and re-implementation of the two reverted native files).

## Next: hand `evidence/device.md` to the device gate (iOS physical + Android GPU); on PASS, the planner closes FX-007 in `22` + the ledger and writes `reviews/DEF-008.md`.

## 2026-06-14 — device gate PASS + recovery + review refinement (planner)

- Device gate: PASS all 6 rows, both platforms (iPhone 17 Pro sim / iOS 26.5 + POCO F1 / API 35). evidence/device.md filled.
- Recovery: the device-gate agent `git checkout`-reverted the uncommitted DEF-008 work in
  `FxSurfaceView.swift` + `FxSurfaceShaderView.kt` while undoing instrumentation; unrecoverable
  from git (never staged). Restored verbatim from the planner's review diffs (diffstat re-matched
  79/61). Re-gated green incl. iOS xcodebuild + Android compileDebugKotlin.
- Review refinement (maintainer-flagged): renamed `pipeline→curatedPipeline`,
  `resolvedPipeline→pipeline` (name was hiding a runtime-compile side effect); added a native
  curated-id stop (iOS `curatedShaderIds` mirror) so "curated ids win" is native-enforced, not
  JS-dependent. Behavior-preserving (curated id + registered source is JS-impossible), so the
  device evidence stands. iOS xcodebuild BUILD SUCCEEDED after.
- Next: docs-closed (FX-007 in `22` + ledger; the iOS/Android cache-divergence note), then merge.
