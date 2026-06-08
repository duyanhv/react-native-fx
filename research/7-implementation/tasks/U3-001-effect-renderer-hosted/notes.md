# U3-001 notes

## Unverified claims

All claims — this is a device-verify task. Effects do not run headless.

## What changed and why

- **Spec'd** — created `tasks/U3-001-effect-renderer-hosted/README.md` from the subtask
  template. Task is now unblocked (U1-002 done, U2-001 ready-to-merge). Consumes FX-004
  (shader catalog), closes RT-009 (hosted authoring path).
- Scope pinned to V1 hosted rendering: fill, material, shader, symbol on iOS + Android.
  No interaction, no content-filter, no BYO, no performance bench.
- Existing infrastructure: `FxHostedView` (hosted substrate shell), `FxSurfaceView`
  (Metal/MTKView reference), 5 curated Metal shaders in `FxShaders.metal`, `ShaderId`
  catalog in `packages/src/effects/catalog.ts`.
- Android AGSL assets directory exists (`packages/android/src/main/assets/shaders/`).

## Next: begin implementation — iOS hosted SwiftUI host first, then renderers per effect type.
