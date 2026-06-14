# DEF-008 — registry-sourced runtime shader compilation (FX-007)

Type: `implement` · State: `merged` · Device: `yes` · Consumes: — · Closes: FX-007 ·
Blocked by: — (V2)

## Why this task exists

V1 BYO is build-time `.metal`/`.agsl` pairs placed in the **package's** resource paths
(`22` Decision 6) — and with no config plugin in V1 (`DEF-013`), an app cannot inject its own
shader assets at build time. DEF-008 lifts that: a developer registers a shader with **inline
source** and fx compiles it **at runtime**, so app-side BYO needs no build-path placement and no
config plugin. This is the BYO story getting materially stronger, and it compounds with the
existing `22` registration contract rather than adding a second surface.

Framed precisely: this is **registry-sourced runtime compilation**, *not* a runtime `source`
prop. `source` lives only inside `registerShader`; `<Fx effect="id" />` stays the only
consumption surface.

## Spike first — the iOS hosted path is an open mechanic (do this before the full build)

**Step 1 is a spike, not the feature.** Do not assume `ShaderLibrary(source:)` — there is **no
public `ShaderLibrary(source:)` initializer** (verified, iOS 26.5 SDK); `ShaderLibrary` is
dynamic-member lookup over a library-backed function set. `MTLDevice.makeLibrary(source:)` is the
first-party runtime compile path and clearly serves the **expo-view raster** rung. The open
question is the **hosted `.colorEffect`** rung:

> Can SwiftUI `.colorEffect` consume a **runtime-built** `MTLLibrary` (via `ShaderFunction` /
> `ShaderLibrary` over a library the app compiled with `makeLibrary(source:)`)?

- **If yes** → the decorative hosted rung uses it; runtime shaders get both rungs like curated.
- **If no** → runtime-source shaders lower through the **expo-view Metal path even for
  decorative use**. That is the honest fallback, and the spike's negative result is a perfectly
  acceptable outcome — record it and scope the path accordingly.

Prove this early (a minimal device probe) before committing the full implementation. The result
finalizes `structure.ios.md` § `shader` (Runtime compilation) — which currently states the
question, not an answer.

## Authority links

```
Subtask: registry-sourced runtime shader compilation (FX-007).
- Contract anchors:  22-shaders.md (the BYO registration contract — Decision 6; Decision 4
                     "no runtime source prop in V1" is the thing DEF-008 lifts, via the
                     registry not a prop; the pair rule D5; onLoad/onError §Events),
                     02-capability-ir-and-lowering.md (the shader node + select()),
                     50-api-and-presets.md (registerShader / the effect call site; BYO),
                     decision-ledger.md FX-007. Mechanics: structure.ios.md § shader
                     (Runtime compilation — spike-gated), structure.android.md § shader
                     (Runtime compilation — accept AGSL from JS).
- Decision:          blueprint — **use** first-party runtime compile APIs
                     (`MTLDevice.makeLibrary(source:)` on iOS; `RuntimeShader(agsl)` on
                     Android, already used). Additive over the `22` registry. fx-original
                     surface = the `source` field on registerShader.
- Reference (HOW):   Apple Metal docs (`makeLibrary(source:)`, `MTLCompileOptions`), the
                     SwiftUI ShaderLibrary/ShaderFunction surface (spike); Android
                     `RuntimeShader` (already in the shipped FxSurfaceShaderView path —
                     diff fx's OWN Android shader load). NOT a references/ repo concern
                     (no cloned lib runtime-compiles shaders). No references-preflight
                     (first-party APIs; the shader-mount mechanic is device-proven).
- Rules gate:        #1 source crosses the bridge ONCE at registration (discrete config,
                     never per-frame); compiled artifacts + the frame loop stay native.
                     #2 agnostic surface. #5 BYO reuses the shader node, no new mechanism.
                     #7 Expo Modules + Fabric, no JSI/C++. Keep curated FxShaders pixels.
- Surface contract (pin exactly):
                     - `source` lives ONLY inside `registerShader({ id, uniforms,
                       source: { ios, android } })`; never a prop on `<Fx>`. `<Fx
                       effect="id" />` is the only consumption surface.
                     - Runtime BYO still needs DUAL source (MSL + AGSL). Single-source
                       authoring stays DEF-001 (the cross-compiler), out of scope.
                     - Curated ids win on collision (a dev warning; `22` D6).
                     - A missing platform source degrades THAT platform to {via:'none'}
                       (the pair rule, `22` D5/D6).
                     - Compile/load failure → existing `onFxError` / public `onError`.
                     - Native caches compiled artifacts by `(platform, sourceHash,
                       functionName or id, relevant compile options)` — NOT id alone.
                     - Re-registering the same id with DIFFERENT source: a dev-time
                       replacement path ONLY if the registry supports invalidation
                       cleanly; otherwise **warn and require a new id/version**. Do not
                       leave this implicit — decide and document it.
- Scope:             (a) SPIKE the iOS hosted `.colorEffect`-over-runtime-MTLLibrary
                     question; record the result in structure.ios.md. (b) JS: extend
                     `registerShader` with the optional `source: { ios, android }` field +
                     the registry invalidation/collision rules above; types. (c) iOS: the
                     expo-view raster runtime path via `makeLibrary(source:)` (+ the hosted
                     path IF the spike says yes); pipeline cache keyed by source. (d)
                     Android: accept the AGSL string from JS into the existing
                     `RuntimeShader` compile; cache by source. (e) example/device demo —
                     an APP-supplied runtime shader proving the no-config-plugin path end
                     to end. (f) onLoad/onError on runtime compile.
- Scope boundaries:  NOT a `<Fx source>` prop (Decision 4 / the surface contract). NOT
                     single-source authoring / the cross-compiler (DEF-001). NOT the
                     Android interactive-render gap (pre-existing deferral; runtime
                     decorative draws through the existing path). NOT runtime compilation
                     of CURATED ids (they stay build-time). No config plugin (DEF-013).
- Device-verify:     (iOS physical for visuals + Android hardware) (1) an app-supplied
                     runtime MSL+AGSL pair registered via registerShader compiles and
                     RENDERS on both platforms; (2) compile FAILURE (malformed source)
                     fires onFxError, no crash, JS can fall back; (3) the cache works —
                     re-registering/re-mounting the same source does not recompile (and the
                     by-source key means two ids with different source don't collide); (4)
                     a missing-platform-source registration degrades that platform to
                     {via:'none'} (no error, no draw); (5) the iOS hosted-vs-expo-view
                     lowering matches the spike result; (6) curated shaders unregressed.
                     Write evidence/device.md.
- Closure:           on the maintainer's PASS, the planner closes FX-007 in `22` (the owning
                     doc — Decision 4/6 reconciled: runtime source via the registry ships;
                     the pair rule + cache + invalidation pinned) + the ledger, confirms
                     structure.{ios,android} § shader against the shipped mechanic (incl. the
                     spike outcome), writes reviews/DEF-008.md, ticks through merged.
- Done when:         registerShader accepts inline dual source and runtime-compiles on both
                     platforms (iOS lowering per the spike result); the surface contract
                     above holds; cache-by-source + the re-registration rule implemented;
                     onError on compile failure; the app-supplied demo renders on device;
                     headless gates + xcodebuild + compileDebugKotlin green; no comment
                     provenance.
```

## Lifecycle

- [x] spec'd (planner, 2026-06-14)
- [x] spike — iOS hosted `.colorEffect`-over-runtime-`MTLLibrary`: **NO** (no public `ShaderLibrary`
  initializer over an `MTLLibrary`/`MTLFunction`/MSL source; recorded in `structure.ios.md` §
  shader). Runtime shaders lower through the expo-view Metal path even for decorative use.
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done (agent, 2026-06-14)
- [x] device-verified (maintainer-ratified, 2026-06-14 — gate PASS all 6 rows: iPhone 17 Pro sim / iOS 26.5 + POCO F1 / API 35; `evidence/device.md`)
- [x] reviewed (planner, 2026-06-14 — `../../reviews/DEF-008.md`; spike accepted, surface contract verified, naming + native curated-stop refinement applied, recovery resolved)
- [x] docs-closed (planner, 2026-06-14 — `22` Decisions 6/7 + FX-007 open question; `structure.{ios,android}` § shader; ledger FX-007 resolved)
- [x] merged (maintainer-authorized, 2026-06-14 — on integration/0.1.x, this commit)

## Proof

- **headless:** packages gates (`tsc`/build/lint/`swift:lint`/test) + iOS `pod install` +
  example `xcodebuild` + Android `compileDebugKotlin`; registry/collision/invalidation logic
  unit-tested (Tier-1); the compile-and-render itself is device-proven.
- **device:** `evidence/device.md` — the six-point scenario above, app-supplied runtime shader.
- **docs:** FX-007 resolved in `22` (the owning doc) + the ledger; `structure.{ios,android}` §
  shader confirmed (incl. the spike outcome).
