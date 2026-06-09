# U3-001 notes

## Unverified claims

All rendering claims — this is a device-verify task. Effects do not run headless.
The iOS native compile is proven locally (`FxHostedView` + `FxFillView` + `FxMaterialView`
Swift code compiles via xcodebuild). Android Compose code compiles locally —
Compose dependency availability depends on the expo-module-gradle-plugin.

## What changed and why

- **Spec'd** — created `tasks/U3-001-effect-renderer-hosted/README.md` from the subtask template.
  Consumes FX-004 (shader catalog), closes RT-009 (hosted authoring path).
  Blocker: U3-006 (shader catalog implementation). DOC-007 closed FX-004; DOC-008 closed
  FX-009 as iOS-only V1 symbol scope.
  Related follow-up: U3-003 owns Android material / FX-003 (not a blocker).

- **Staged scope** — implementation proceeds in unlock order:
  - **RT-009 (hosted mount + prop path):** FxHostedView embeds SwiftUI/Compose host, passes
    effect node id + uniforms. Unblocked — no design decisions pending.
  - **fill (iOS + Android):** native gradient/mesh primitives on both platforms. Unblocked.
  - **material (iOS only):** UIGlassEffect / ultraThinMaterial. Unblocked on iOS.
    Android RenderEffect blur, intensity 0–1, staleness gated behind U3-003 / FX-003.
  - **shader (both platforms):** DOC-007 ratified the shader catalog; U3-006 blocks full
    completion until it implements native MSL+AGSL and package exposure for the five
    additional ids.
  - **symbol (iOS only):** scope ratified by DOC-008 / FX-009. Android symbol deferred.

- Existing infrastructure: `FxHostedView` (hosted substrate shell), `FxSurfaceView`
  (Metal/MTKView reference), 5 curated Metal shaders in `FxShaders.metal`, `ShaderId`
  catalog in `packages/src/effects/catalog.ts`.
- Android AGSL assets directory exists (`packages/android/src/main/assets/shaders/`).

- **Implemented (2026-06-08) — headless-done:**
  - **iOS `FxHostedView.swift`:** UIHostingController-based SwiftUI host. Two-phase Expo
    prop pattern with `pendingEffect`/`pendingIntensity`. `applyResolvedConfig()` dispatches
    to `FxFillView` (LinearGradient / MeshGradient) or `FxMaterialView`
    (.glassEffect / .ultraThinMaterial). Host is sized to fill the container with AutoLayout.
    Deinit removes the host cleanly.
  - **iOS `FxMaterialView.swift`:** `.glassEffect()` on iOS 26+, intensity selects
    `.ultraThinMaterial`/`.thinMaterial`/`.regularMaterial` on earlier versions.
    No layer `.opacity()` — glass weight controlled by material style.
    `FxEmptyView` moved to `FxHostedView.swift`.
  - **iOS `FxModule.swift`:** `Prop("effect")` and `Prop("intensity")` registered for
    `FxHostedView`.
  - **Android `FxHostedView.kt`:** `FxFillView` — a plain `View` subclass drawing
    `android.graphics.LinearGradient` in `onDraw()`. No Compose — the library-level
    Compose compiler setup is deferred. `structure.android.md` records this V1 deviation.
  - **Android `FxModule.kt`:** `Prop("effect")` and `Prop("intensity")` registered for
    `FxHostedView`.
  - **TS `FxHostedView.tsx`:** `effect?: string` and `intensity?: number` added to
    `NativeFxHostedProps`.
  - **`example/App.tsx`:** U3-001 test screen — fill at two intensities, material (iOS),
    empty view.
  - **Device scenario:** written in `evidence/headless.md`.
  - **Headless checks all green:** `tsc` · `build` · `swift:lint` · `biome` · `jest` (18/18)
    · `git diff --check`.

## Committed partial slice

- The RT-009 hosted mount/fill/material slice is committed on `integration/0.1.x`.
- U3-001 remains blocked because shader coverage is still incomplete; iOS symbol proof
  remains U3-001 work.

## Next: Complete U3-006, then implement/prove the iOS symbol path and re-run device proof for the full hosted renderer.
