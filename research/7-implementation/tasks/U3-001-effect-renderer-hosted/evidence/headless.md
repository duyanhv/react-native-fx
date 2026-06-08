# U3-001 — Device scenario

## Goal

Verify the hosted effect renderer mounts and renders fill (iOS + Android) and
material (iOS only) effects inside `FxHostedView`. Prove RT-009 — the hosted
authoring path works on both platforms.

## Steps

### RT-009 — hosted mount + prop plumbing

1. Run `cd example && bun run ios`.
2. Observe the U3-001 test screen with four FxHostedView instances.
3. Confirm all four views mount without crash — three with effect props, one empty.
4. Run `cd example && bun run android`.
5. Repeat steps 2–3 on Android.

### fill — gradient rendering

6. On iOS, the first box (`effect="fill" intensity={0.8}`) shows a blue-to-purple
   gradient at 80% opacity (MeshGradient on iOS 18+ via `FxFillView`, LinearGradient
   fallback on earlier iOS).
7. The second box (`intensity={0.3}`) shows the same gradient at 30% opacity.
8. On Android, both fill boxes show a blue-to-purple gradient drawn via
   `android.graphics.LinearGradient` in a plain `View.onDraw()`. No Compose —
   V1 uses a `FxFillView : View` subclass.
9. The gradient is correctly sized to fill the 200×150 box.

### material — glass effect (iOS only)

10. On iOS, the third box shows colored blocks and "Hello from behind glass" text
    behind a glass overlay (`effect="material" intensity={0.6}`).
11. On iOS 26+: `.glassEffect()` renders; on iOS 15–25: `.ultraThinMaterial` /
    `.thinMaterial` / `.regularMaterial` selected by intensity level.
12. The frosted glass visibly blurs the content underneath.
13. On Android, the material box renders blank (Android material out of scope).

### empty — no effect

14. The fourth box (no `effect` prop) shows only the background color — no native
    renderer mounted.

### Fast refresh

15. Fast refresh the app. All views remount without crash.

## Expected result

- No crash on either platform.
- Fill gradient renders on iOS at correct intensity (SwiftUI MeshGradient/LinearGradient).
- Fill gradient renders on Android (plain View + onDraw + LinearGradient).
- Material glass/blur renders on iOS with visible frosted effect over content;
  blank on Android (out of scope).
- Empty FxHostedView renders without native renderer.
- Fast refresh works cleanly.

## Failure signs

- Crash on mount — UIHostingController initialization fails on iOS.
- Black/blank box where a gradient should appear — effect view not rendered.
- Gradient extends beyond the view bounds — layout sizing issue.
- `.glassEffect()` compile error — iOS 26 API mismatch (verify Xcode 26+ SDK).
- Material shows no visible blur — content underneath not diverse enough,
  or intensity range doesn't produce visible material.

## Platform

- iOS: yes, SDK 56, iOS 15+ simulator or device (iOS 26+ needed for `.glassEffect()`).
- Android: yes, SDK 56, API 24+ emulator or device.
