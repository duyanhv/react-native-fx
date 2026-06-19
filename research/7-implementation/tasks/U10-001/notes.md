# U10-001 notes

## Unverified claims

- Hosted shader (`aurora`) renders on iOS + Android device.
- Interactive shader fires `onPress*`/`onLoad` on the expo-view path (iOS 17+ / Android 33+).
- `glass` + `mesh-gradient` mount `FxHostedView` correctly on device.
- `EdgeGlow` renders via the hosted or expo-view path depending on `interactionMode`.
- An unsupported effect degrades cleanly to `onError({reason:'unsupported'})` with no crash.
- `composition='background'|'overlay'` positions the layer correctly relative to siblings.
- `ref.setUniform` / `ref.setHighlight` are reachable on `interactionMode='controlled'`.

## Changes

- `packages/src/effects/effects.ts` (new): `EffectId`, `EffectResolution`, `PublicNodeId`, `HOSTED_NATIVE_EFFECT_STRINGS`, `compositionStyle`, `resolveEffect`.
- `packages/src/surface/Fx.tsx` (new): callable `<Fx>` (forwardRef, absorbs Scroll), `EdgeGlow`.
- `packages/src/surface/FxScroll.tsx`: removed provisional `Fx = { Scroll }` export.
- `packages/src/surface/index.ts`: added `Fx`, `EdgeGlow`, `FxProps` from `./Fx`; kept `FxScroll`/`FxScrollProps`/`FxScrollTile`.
- `packages/src/index.ts`: added `EdgeGlow`, `FxProps`, `EffectId` public exports.
- `packages/src/__tests__/effects-resolver.test.ts` (new): 21 tests — resolver conformance, substrate selection, wantInteractive, composition style, adapter degradation.

## Gates run

- packages tsc: clean
- packages build: clean
- packages lint (Biome): clean
- tests: 114/114 pass (21 new)
- example tsc: clean

Next: device gate — human runs the both-platform matrix from the task README Proof section.
