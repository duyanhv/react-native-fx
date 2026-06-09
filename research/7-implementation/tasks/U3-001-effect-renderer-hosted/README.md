# U3-001 — hosted effect renderer

Unit 3 · type: `implement` · state: `merged` · device: yes
Consumes: — · Closes: RT-009
Scope: Option A — RT-009 + fill + iOS material (done). Follow-ons (not blockers): U3-006 (shader rung), U3-007 (iOS symbol rung).

> Builds the V1 hosted rendering path — SwiftUI on iOS, plain `View` on Android.
> Mounts the platform-native host inside `FxHostedView` and renders fill on both
> platforms plus material (glass) on iOS. The shader and symbol rungs are separate
> follow-on tasks (U3-006, U3-007). No interaction in V1.

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
- Done when:         RT-009 satisfied: hosted mount + prop/config path proven on both
                      platforms, with fill (iOS + Android) and iOS material rendering.
                      Android material → U3-003 / FX-003; shader rung → U3-006; iOS
                      symbol rung → U3-007 — separate tasks, not this one's scope.
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified
- [x] docs-closed
- [x] reviewed
- [x] merged

## Proof

- headless: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, and `bun run test` from
  `packages/`. The renderer logic itself cannot be unit-tested — it is device-gated.
- device:
  - **RT-009:** hosted mount + prop/config path working on iOS + Android — FxHostedView
    embeds a SwiftUI/Compose host and passes effect node id + uniforms as props.
  - **fill:** gradient/mesh fill renders as a hosted decorative layer on iOS + Android.
  - **material (iOS only):** `.glassEffect` on iOS 26+, `.ultraThinMaterial`/`.thinMaterial`/
    `.regularMaterial` fallback gated by intensity on earlier versions.
    Android material out of scope — owned by U3-003 / FX-003.
  - **shader:** separate task — U3-006 adds native MSL+AGSL for the five additional
    catalog ids and the unified `ShaderId`. Not part of this task's proof.
  - **symbol:** separate task — U3-007 adds the iOS `.symbolEffect` rung. Android deferred
    per DOC-008 / FX-009. Not part of this task's proof.
- docs: `51` RT-009 closed (hosted authoring path proven on device);
  `structure.android.md` records the V1 deviation (plain View fill, Compose deferred);
  `structure.ios.md` records the hosted material path with `.glassEffect` on iOS 26+.

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

- **shader (moved to U3-006):** DOC-007 ratified the 10-id catalog + shared minimal uniform
  contract; the native MSL+AGSL implementation and package exposure are U3-006, not this task.

- **symbol (moved to U3-007):** the iOS `.symbolEffect` rung is U3-007; Android is deferred
  per DOC-008 / FX-009. Not this task.

### Out of scope

- Interactive effect surfaces (V2, expo-view — Unit 3 V2 face)
- Content-filter (rule #4, iOS — out-of-scope permanently)
- BYO shader registration (U3-004)
- Android symbol rendering (deferred by DOC-008)
- Performance optimization / many-hosted-boundaries bench (SPINE-012, U3-002)

## Done when

- **RT-009:** FxHostedView mounts a SwiftUI host (iOS) and Compose host (Android).
  Effect node id + uniforms pass through props. Hosted authoring path proven on both
  platforms.
- **fill** renders on iOS + Android; **material** renders on iOS only (Android material
  deferred to U3-003 / FX-003).
- **shader** and **symbol** are out of this task — tracked by U3-006 and U3-007 respectively.
- Device evidence recorded in `evidence/device.md`.
