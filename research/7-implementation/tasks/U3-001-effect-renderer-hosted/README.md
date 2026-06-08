# U3-001 — hosted effect renderer

Unit 3 · type: `implement` · state: `in-progress` · device: yes
Consumes: FX-004 · Closes: RT-009
Blocked by: U1-002 (done), U2-001 (done), DOC-007 (FX-004 — shader catalog), DOC-008 (FX-009 — Android symbol)

> Builds the V1 hosted rendering path — SwiftUI on iOS, Jetpack Compose on Android.
> Mounts the platform-native host inside `FxHostedView` and renders fill on both
> platforms plus material on iOS. Shader and symbol are gated behind separate
> decisions. No interaction in V1.

## Start here (cold-start)

1. **This file** — the work order + authority links.
2. **`research/7-implementation/subtask-protocol.md`** — lifecycle, task types
3. **Per-gate guides:**
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
   - all gates → `agents/session-protocol.md`

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
- Guides:            Code Style Guide, Code Comments Guide, Testing Guide,
                      Device Verification Guide, Writing Style Guide,
                      Contributing Guide, session-protocol
- Rules gate:        #1 (native owns frames), #2 (agnostic names), #3 (hosted substrate
                      for decorative), #4 (don't host RN content to sample it),
                      #7 (Expo Modules + Fabric)
- Device-verify:     yes — effects don't run headless. Each effect type must render
                      on screen on each platform where its decision is unblocked.
- Done when:         RT-009 is satisfied: hosted mount + prop/config path proven on
                      both platforms. Effect coverage is incremental — fill (iOS + Android)
                      and iOS material first (unblocked); Android material out of scope
                      (U3-003 / FX-003); shader after DOC-007/FX-004; symbol iOS-only after
                      DOC-008/FX-009 closes (Android symbol deferred).
```

## Lifecycle

- [x] spec'd
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
- device:
  - **RT-009:** hosted mount + prop/config path working on iOS + Android — FxHostedView
    embeds a SwiftUI/Compose host and passes effect node id + uniforms as props.
  - **fill:** gradient/mesh fill renders as a hosted decorative layer on iOS + Android.
  - **material (iOS only):** glass/material effect renders on iOS 26+ (UIGlassEffect)
    and iOS 15+ (.ultraThinMaterial fallback). Android material out of scope —
    owned by U3-003 / FX-003.
  - **shader (blocked by DOC-007 / FX-004):** curated Metal shader through hosted
    `.colorEffect` path, AGSL through hosted `RenderEffect`. Wait until shader catalog
    (FX-004) is ratified.
  - **symbol (iOS blocked by DOC-008 / FX-009):** SF Symbol / Image render through
    hosted path. Android deferred per V1 scope (DOC-008).
- docs: `51` RT-009 open question closed (hosted authoring path proven);
  `structure.ios.md` / `structure.android.md` updated with hosted render mechanics

## Scope

### V1 (this task)

- **Hosted mount + prop plumbing (RT-009):** FxHostedView mounts a SwiftUI host (iOS) /
  Compose host (Android). Props (effect node id, uniforms) cross the Expo boundary and
  drive native rendering. This is the gate RT-009 closes — the authoring path, proven on
  both platforms.

- **fill (unblocked):** native gradient/mesh via SwiftUI `LinearGradient`/`MeshGradient` (iOS)
  and Compose `Brush` (Android). Uses existing native primitives — no pending decisions.

- **material (iOS only):** `.glassEffect` (iOS 26+) / `.ultraThinMaterial` (iOS 15+) as
  fallback. Glass self-gestures (`interaction: 'self'`). Android material is out of scope
  for this task — owned by U3-003 / FX-003.

- **shader (blocked by DOC-007 / FX-004):** the existing 5 curated Metal shaders
  (`FxShaders.metal`) rendered through the hosted `.colorEffect` path on iOS;
  AGSL shaders through hosted `RenderEffect` on Android. **Wait until the V1 shader
  catalog and uniform contract (FX-004) is ratified.**

- **symbol (blocked by DOC-008 / FX-009):** SF Symbol / Image on iOS. **Android
  deferred — scope still open in `24` (DOC-008). Symbol proof is iOS-only for this
  task; Android is a separate V1 or V2 item.**

### Out of scope

- Interactive effect surfaces (V2, expo-view — Unit 3 V2 face)
- Content-filter (rule #4, iOS — out-of-scope permanently)
- BYO shader registration (U3-004)
- Android symbol rendering (pending DOC-008 scope decision)
- Performance optimization / many-hosted-boundaries bench (SPINE-012, U3-002)

## Done when

- **RT-009:** FxHostedView mounts a SwiftUI host (iOS) and Compose host (Android).
  Effect node id + uniforms pass through props. Hosted authoring path proven on both
  platforms.
- **fill** renders on iOS + Android; **material** renders on iOS only (Android material
  deferred to U3-003 / FX-003).
- **shader** renders on device after DOC-007 / FX-004 closes (separate evidence).
- **symbol** renders on iOS after DOC-008 / FX-009 closes (separate evidence).
- Device evidence recorded in `evidence/device.md`.
