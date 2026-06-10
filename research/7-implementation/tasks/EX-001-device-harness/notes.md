# EX-001 — notes

## Unverified claims
- Screens render correctly on iOS device (symbol, hosting-parity, shader-catalog).
- Screens render correctly on Android device (android-material, hosting-parity, shader-catalog).
- Symbol animations fire correctly (bounce/pulse/scale/appear/disappear/variableColor/breathe/rotate/wiggle).
- RenderEffect staleness is observable on Android (blur updates when content behind it animates).
- Many-boundaries screen scrolls smoothly without blank hosts.
- Uniform alignment is correct (loop shader output is not garbled).

## What changed

### Screens created
- `example/screens/symbol.tsx` — U3-007 symbol screen with `FxHostedView` + `symbolConfig`, native segmented controls for name/animation/trigger/replaceWith.
- `example/screens/android-material.tsx` — U3-003 material screen with animated block behind the blur + intensity slider.
- `example/screens/hosting-parity.tsx` — U3-002 hosting parity screen with many mixed fill/shader boundaries + multi-uniform shader (`loop`) + intensity slider.

### Wiring updated
- `example/data/tasks.ts` — `DemoScreen` union extended to `"symbol" | "android-material" | "hosting-parity"`; screen routes for U3-007, U3-003, U3-002 switched from `"blank"` to the new screens.
- `example/app/(tasks)/[taskId].tsx` — added imports and cases for the three new screens.
- `example/app/comps/[compId].tsx` — added imports and cases for the three new screens.

### Docs updated
- `research/7-implementation/device-sweep-v1.md` — readiness table updated; covered rows flipped to ✅; glass-styles/interactive-glass rows left ❌ with "blocked on library glassStyle prop (FX-002)" note.

## Next: run the device sweep on iOS and Android using the new screens (symbol, android-material, hosting-parity), and verify the glass-styles/interactive-glass rows are deferred until FX-002 lands.
