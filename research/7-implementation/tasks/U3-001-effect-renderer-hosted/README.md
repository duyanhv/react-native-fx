# U3-001 — hosted effect renderer

Unit 3 · type: `implement` · state: `todo` · device: yes
Consumes: FX-004 · Closes: RT-009
Blocked by: U1-002 (done), U2-001 (done)

> Builds the V1 hosted rendering path — SwiftUI on iOS, Jetpack Compose on Android.
> Mounts the platform-native host inside `FxHostedView` and renders fill, material,
> shader, and symbol effects as decorative layers. No interaction in V1.

## Start here (cold-start)

1. **This file** — the work order + authority links.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle, task types
3. **Per-gate guides:**
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`

## Authority links

```
Subtask: hosted effect renderer (blueprint Unit 3)
- Contract anchors:  01 (two substrates, hosted world), 20 (fill semantics),
                      21 (materials/glass), 22 (shaders), 24 (symbols),
                      51 (expo-modules-view — hosted-view authoring),
                      structure.ios.md / structure.android.md (platform mechanics)
- Decision:          mimic — declarative rendering tree natively using SwiftUI
                      view/modifier composition on iOS, Compose on Android.
                      Native primitives first; shader rung (metal/agsl) only
                      when native is too rigid.
- Reference (HOW):   references/expo/... — Expo's Host/RNHostView mechanism
                      for mounting SwiftUI views inside RN
- Guides:            Code Style Guide, Code Comments Guide, Testing Guide
- Rules gate:        #1 (native owns frames), #2 (agnostic names), #3 (hosted substrate
                      for decorative), #4 (don't host RN content to sample it),
                      #7 (Expo Modules + Fabric)
- Device-verify:     yes — effects don't run headless. Each effect type must render
                      on screen on both platforms.
- Done when:         FxHostedView mounts and renders fill, material, shader, and
                      symbol effects on iOS + Android. RT-009 close condition
                      (hosted authoring path proven) satisfied.
```

## Lifecycle

- [ ] spec'd
- [ ] rules-gated
- [ ] implemented
- [ ] commented
- [ ] headless-done
- [ ] device-verified
- [ ] docs-closed
- [ ] reviewed
- [ ] merged

## Proof

- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run test` from
  `packages/`. The renderer logic itself cannot be unit-tested — it is device-gated.
- device: four effect types render on screen on iOS + Android:
  1. `fill` — gradient/mesh fill visible as a background layer
  2. `material` — glass/material effect visible (UIGlassEffect on iOS 26, RenderEffect blur on Android 31)
  3. `shader` — curated Metal shader renders through the hosted path (hosted decorative, not expo-view interactive)
  4. `symbol` — SF Symbol / Lottie renders on iOS (Android deferred per V1 scope)
- docs: `51` RT-009 open question closed (hosted authoring path); `01` updated with working hosted implementation;
  `structure.ios.md` / `structure.android.md` updated with hosted render mechanics

## Scope

### V1 (this task)

- **iOS:** Mount a SwiftUI host inside `FxHostedView`. Implement `FxEffectRenderer` that renders
  fill (gradient/mesh via SwiftUI), material (glass via `.glassEffect` or material), shader
  (hosted Metal shader via `.colorEffect`), and symbol (SF Symbol / Image).
  The existing `FxSurfaceView` + Metal infrastructure serves as the reference implementation
  for the shader rendering; the hosted path reuses the same Metal shaders via a different
  attachment mechanism (`.colorEffect` modifier vs MTKView).

- **Android:** Mount a Compose host inside the Android `FxHostedView`. Implement the equivalent
  renderers: fill (Brush gradients), material (RenderEffect blur), shader (AGSL via `RenderEffect`
  on API 33+), symbol (Lottie/AVD — or deferred per V1 Android scope in `24`).

- **Effect dispatch:** A single `FxEffectRenderer` that reads the node id from the manifest
  (via `select()`) and dispatches to the correct native rendering path.

### Out of scope

- Interactive effect surfaces (V2, expo-view — Unit 3 V2 face)
- Content-filter (rule #4, iOS — out-of-scope permanently)
- BYO shader registration (U3-004)
- Android symbol (pending DOC-008 scope decision)
- Performance optimization / many-hosted-boundaries bench (SPINE-012, U3-002)

## Done when

- FxHostedView mounts a SwiftUI/Compose host and renders at least one effect per type
  (fill, material, shader, symbol) on device.
- RT-009 closed: the hosted authoring path is proven on both platforms.
- Device evidence recorded in `evidence/device.md`.
