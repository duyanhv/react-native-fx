# U3-001 — Device Verification

## Date

2026-06-08

## Result

**pass** — RT-009 (hosted authoring path) proven on both platforms. Fill renders on iOS + Android. Material renders on iOS 26+ with `.glassEffect()`.

## Findings

### iOS (26+)

- **RT-009 · hosted mount:** FxHostedView mounts UIHostingController without crash.
  Effect props dispatch correctly — `effect="fill"` renders `FxFillView`,
  `effect="material"` renders `FxMaterialView`, no-effect mounts nothing.
- **fill:** Blue-to-purple gradient at 80% intensity — MeshGradient on iOS 18+.
  Second box at 30% intensity correctly fainter. Gradient fills the 200×150 box.
- **material:** `.glassEffect()` renders frosted glass over colored blocks and
  "Hello from behind glass" text. Visible blur effect confirms the hosted glass
  path works. Intensity has no effect on the `.glassEffect()` path (expected —
  glass-weight-by-intensity is FX-002 / U3-002 territory).
- **empty:** No-effect view shows only background color — no host mounted.
- **Fast refresh:** Clean, no "duplicate view registration" errors.

### Android

- **RT-009 · hosted mount:** FxHostedView mounts `FxFillView : View` without crash.
  Effect props dispatch — `effect="fill"` renders the gradient View.
- **fill:** Blue-to-purple gradient drawn via `android.graphics.LinearGradient`
  in `View.onDraw()` at both 80% and 30% intensities. Correctly sized.
- **material:** Absent — renders blank (Android material out of scope for U3-001).
- **empty:** No-effect view mounts nothing.
- **Fast refresh:** Clean, no errors.

## Platform

- iOS: yes, SDK 56, iOS 26+ simulator
- Android: yes, SDK 56, physical device
