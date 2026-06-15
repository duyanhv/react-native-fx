# DEF-020 notes — agent session 2026-06-15

## What changed

- **TypeScript surface:** added `FxSurfaceViewRef` type with `setUniform(name, value | null)` and
  `setHighlight(x, y)`; exported from `src/index.ts`. `InteractionMode` already included
  `'controlled'`.
- **iOS native:** `FxModule.swift` registers `setUniform`/`setHighlight` `AsyncFunction`s on
  `FxSurfaceView`. `FxSurfaceView.swift` adds `imperativeOverrides` set, `setUniform`, `setHighlight`,
  and the clobber-rule guard in `applyResolvedConfig()` (skips `intensity` reapply when overridden).
  `FxPressHandler.swift` adds `.controlled` mode (detach recognizer, keep uniforms).
- **Android native:** `FxModule.kt` registers `setUniform`/`setHighlight` `AsyncFunction`s.
  `FxSurfaceView.kt` adds `imperativeOverrides`, `setUniform`, `setHighlight`, and gates
  `updateEffectSurfaceVisibility()` to skip `setIntensity()` when overridden.
  `FxPressHandler.kt` adds `CONTROLLED` mode (no recognizer, no touch consumption).
  `FxSurfaceShaderView.kt` adds `declaredUniforms`/`customUniforms`, `setUniform` (guarded by
  `declaredUniforms`), `setHighlight`, and applies custom uniforms in `onDraw`.
- **Docs:** `structure.ios.md` and `structure.android.md` updated with the controlled write-path
  mechanic (the clobber rule, the guarded-write rule, the `[0,1]` y-up UV space).

## Review fixes applied (2026-06-15)

- **Android scalar guard:** `setUniform` now only accepts the known scalar uniforms `intensity`
  and `pressDepth` (matching iOS). The previous `declaredUniforms` guard would accept `resolution`
  and `touch` (vec2) and call `setFloatUniform` with wrong arity.
- **iOS clear parity:** `setUniform(name, null)` now restores the prop-derived value immediately
  (`uniforms.intensity = pendingIntensity` clamped; `targetPressDepth = 0`), matching Android's
  `customUniforms.remove()` → `onDraw` fallback behavior.
- **Contract narrowed:** README updated — `setUniform` is no longer described as a "general
  escape hatch over any declared uniform"; both platforms only support `intensity` and
  `pressDepth` in this cut.
- **Tier-1 test:** Proof updated to reflect that `tsc` type-check is the test (the binding is a
  thin type-only layer); no new runtime test added.

## Unverified claims

- Device spike (the clobber rule): `setUniform`/`setHighlight` write observed by the live loop on
  the next frame and survives a host re-render (Fabric commit). This is the human's gate.

## Next: device spike

Run the example app on a device, verify the four device scenarios in the README, and record
findings in `evidence/device.md`.
