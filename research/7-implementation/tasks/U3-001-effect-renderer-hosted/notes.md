# U3-001 notes

## Unverified claims

All claims — this is a device-verify task. Effects do not run headless.

## What changed and why

- **Spec'd** — created `tasks/U3-001-effect-renderer-hosted/README.md` from the subtask template.
  Consumes FX-004 (shader catalog), closes RT-009 (hosted authoring path).
  Blockers: DOC-007 (FX-004 — shader catalog), DOC-008 (FX-009 — Android symbol),
  U3-003 (FX-003 — Android material).

- **Staged scope** — implementation proceeds in unlock order:
  - **RT-009 (hosted mount + prop path):** FxHostedView embeds SwiftUI/Compose host, passes
    effect node id + uniforms. Unblocked — no design decisions pending.
  - **fill (iOS + Android):** native gradient/mesh primitives on both platforms. Unblocked.
  - **material (iOS only):** UIGlassEffect / ultraThinMaterial. Unblocked on iOS.
    Android RenderEffect blur, intensity 0–1, staleness gated behind U3-003 / FX-003.
  - **shader (both platforms):** blocked by DOC-007 / FX-004 until shader catalog ratified.
  - **symbol (iOS only):** blocked by DOC-008 / FX-009. Android symbol deferred.

- Existing infrastructure: `FxHostedView` (hosted substrate shell), `FxSurfaceView`
  (Metal/MTKView reference), 5 curated Metal shaders in `FxShaders.metal`, `ShaderId`
  catalog in `packages/src/effects/catalog.ts`.
- Android AGSL assets directory exists (`packages/android/src/main/assets/shaders/`).

## Next: begin implementation — RT-009 hosted mount + prop plumbing first, then fill renderer, then iOS material renderer.
