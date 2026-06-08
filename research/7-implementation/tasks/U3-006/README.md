# U3-006 — curated shader implementation

Unit 3 · type: `implement` · state: `in-progress` · device: yes
Consumes: FX-004, REAL-004 · Closes: —
Blocked by: —

> Implements the V1 curated shader catalog on the committed hosted renderer
> slice. The package exposes the unified `ShaderId` only after every catalog id
> has a hand-maintained MSL+AGSL pair and renders on the supported native path.
> This task stays on curated build-time shaders. It does not add BYO shader
> registration, shader compiler codegen, or the interactive `expo-view` shader
> runtime.

## Start here (cold-start)

1. **This file** — the work order, authority links, scope, and proof.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle and closure rules.
3. **`research/7-implementation/tasks/U3-006/notes.md`** — current handoff.
4. **Per-gate guides:**
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

## Authority links

```
Subtask: curated shader implementation (blueprint Unit 3)
- Contract anchors:  02 (shader node lowering), 22 (curated ShaderId catalog and
                      shared uniform contract), 50/55/57 (standard effect surface),
                      51 (hosted view authoring path), structure.ios.md and
                      structure.android.md (shader mechanics)
- Decisions:         FX-004 — V1 catalog is 10 ids with public `intensity` only.
                      REAL-004 — V1 hand-maintains MSL+AGSL pairs; no compiler
                      prerequisite. U3-001 — hosted renderer slice is committed.
- Reference (HOW):   Existing package code: `packages/ios/Shaders/FxShaders.metal`,
                      `packages/ios/FxHostedView.swift`,
                      `packages/android/src/main/java/expo/modules/reactnativefx/FxHostedView.kt`,
                      `packages/src/effects/catalog.ts`.
                      Borrow the native-hosted dispatch shape; reject runtime
                      shader source props, per-frame JS, and platform-named public ids.
- Guides:            Code Style Guide, Code Comments Guide, Testing Guide,
                      Device Verification Guide, Writing Style Guide,
                      Contributing Guide, session-protocol
- Rules gate:        #1 (native owns frames), #2 (agnostic names), #3 (hosted for
                      decorative shaders), #4 (draws itself; never samples live RN
                      content), #5 (curated ids; JS developers do not author
                      shaders), #6 (iOS and Android are peers), #7 (Expo Modules),
                      #8 (discrete uniforms only), #9 (reads layout, never writes it)
- Device-verify:     yes — Metal and AGSL rendering are device-gated. iOS simulator
                      can prove Metal pixels; Android physical device is strongly
                      preferred for AGSL. Device verification batches with or follows
                      U3-005 because iOS pixels depend on REAL-002 metallib bundling,
                      and Android pixels depend on the REAL-003 AGSL runtime read path.
- Done when:         All ten curated ids have MSL+AGSL implementations, the public
                      `ShaderId` union exposes all ten ids, hosted shader rendering
                      selects the right native shader on iOS and Android, headless
                      checks pass, and device evidence proves pixels, time, uniform
                      update, switching, and lifecycle behavior.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified
- [x] docs-closed
- [ ] reviewed
- [ ] merged

## Proof

- headless:
  - from **packages/**: `bunx tsc --noEmit`
  - from **packages/**: `bun run build`
  - from **packages/**: `bun run lint`
  - from **packages/**: `bun run swift:lint`
  - from **packages/**: `bun run test`
  - from repo root: `git diff --check`
- device:
  - Device verification batches with or follows U3-005. U3-006 can reach
    `headless-done` alone, but rendered shader pixels depend on REAL-002 metallib
    bundling and REAL-003 AGSL runtime reads.
  - iOS 17+ renders each curated shader through the hosted shader rung, with no blank
    frame or crash.
  - Android API 33+ renders each curated shader through AGSL, with no blank frame or
    crash.
  - `intensity` updates as a discrete prop and changes output without JS driving
    frames.
  - `time` advances natively while the view is on-window and pauses/resumes across
    navigation or app backgrounding.
  - Switching across all ten ids does not crash or leave stale pixels.
  - Evidence starts in `evidence/headless.md`; human device results land in
    `evidence/device.md`.
- docs:
  - `22` remains true: the first five are no longer the only package-exposed ids,
    and all ten V1 ids have native MSL+AGSL implementations.
  - `structure.ios.md` and `structure.android.md` stay true for the shipped hosted
    shader mechanics.
  - `progress.md` moves U3-006 through the lifecycle and links the review.

## Scope

### V1 (this task)

- **Unified public catalog:** widen `ShaderId` to all ten ids: `fractal-clouds`,
  `ink-smoke`, `liquid-chrome`, `loop`, `dots`, `aurora`, `noise-field`,
  `plasma`, `caustics`, and `edge-glow`.
- **MSL coverage:** keep the existing five MSL shaders and add MSL implementations
  for `aurora`, `noise-field`, `plasma`, `caustics`, and `edge-glow`.
- **AGSL coverage:** add AGSL implementations for all ten curated ids. DOC-013
  requires every curated id to ship as a pair, so Android coverage includes the
  original five ids as well as the five newly ratified ids.
- **Hosted shader rendering:** wire `FxHostedView` to render decorative shaders on
  iOS and Android using the existing hosted substrate.
- **Native-owned uniforms:** inject `time` and `resolution` natively. Accept public
  `intensity` as a discrete prop. Keep `pressDepth` and `touch` native-owned; they
  may stay idle defaults for the hosted decorative path.
- **No-package-exposure-until-rendered:** do not widen TypeScript to all ten ids
  until the native implementation and dispatch table can accept all ten ids.

### Out of scope

- BYO shader registration or `.metal`/`.agsl` asset manifest.
- Runtime shader compilation or JS `source` props.
- Compiler, transpiler, or author-once shader codegen.
- Interactive `expo-view` shader runtime, recognizers, `pressDepth`, and touch-fed
  uniforms beyond idle defaults.
- Mesh-gradient fill implementation on Android. Mesh remains the `fill` capability.
- Asset-loading ledger closure for REAL-002 / REAL-003. U3-005 owns packaging and
  runtime asset-loading proof. U3-006's device gate still depends on that proof.
- `edge-glow` component sugar. DOC-004 owns the ship-effect-component question.

## Implementation plan

1. Inspect the committed U3-001 hosted renderer and choose the smallest native
   shader mount that keeps decorative rendering on `hosted`.
2. Add native shader registries with one agnostic id per shader and platform-local
   function/source names.
3. Add the five missing MSL shaders and AGSL files or source entries for all ten ids.
4. Wire iOS hosted shader rendering to the MSL functions and native clock.
5. Wire Android hosted shader rendering to AGSL `RuntimeShader` on API 33+, with a
   below-33 degradation that matches `structure.android.md` and the manifest selector:
   `{ via: 'none' }`, or a preset-declared static fill fallback only. Do not invent an
   ad hoc shader fallback.
6. Widen the TypeScript `ShaderId` union only after native dispatch accepts all ten ids.
7. Update the example harness with a shader selector and intensity control.
8. Run the headless checks and write the device handoff.
9. After device verification, reconcile any source-doc wording that still says only
   the first five package-exposed ids are implemented.

## Done when

- `ShaderId` includes all ten curated ids and package build output matches it.
- iOS has MSL functions and dispatch entries for all ten ids.
- Android has AGSL support and dispatch entries for all ten ids on API 33+.
- Hosted shader views render decoratively and do not intercept content touches.
- Public uniforms stay limited to `intensity`; native owns `time`, `resolution`,
  `pressDepth`, and `touch`.
- Headless checks pass and the device scenario is written.
- Device verification records iOS and Android shader pixels, time advancement,
  intensity update, shader switching, and lifecycle pause/resume.
