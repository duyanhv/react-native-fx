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
   gradient at 80% opacity (MeshGradient on iOS 18+, LinearGradient on earlier).
7. The second box (`intensity={0.3}`) shows the same gradient at 30% opacity.
8. On Android, both fill boxes show a blue-to-purple LinearGradient via Compose Canvas.
9. The gradient is correctly sized to fill the 200×150 box.
10. The background color (`#1a1a2e`) is visible through the gradient (not opaque black).

### material — glass effect (iOS only)

11. On iOS, the third box (`effect="material" intensity={0.6}`) shows a material
    blur/glass effect at 60% intensity.
12. On iOS 26+: `.glassEffect` style; on iOS 15-25: `.ultraThinMaterial` fallback.
13. On Android, the material box renders as blank/empty (Android material out of scope).

### empty — no effect

14. The fourth box (no `effect` prop) shows only the background color — no SwiftUI/
    Compose host mounted.

### Fast refresh

15. Fast refresh the app. All views remount without crash. No "duplicate view
    registration" errors.

## Expected result

- No crash on either platform.
- Fill gradient renders on iOS at the correct intensity.
- Fill gradient renders on Android (Compose Canvas).
- Material renders on iOS (glass/material); blank on Android (out of scope).
- Empty FxHostedView (no effect prop) renders without host — only background.
- Fast refresh works cleanly.

## Failure signs

- Crash on mount — UIHostingController/ComposeView initialization fails.
- Black/blank box where a gradient should appear — SwiftUI view not rendered.
- Gradient extends beyond the view bounds — layout constraint issue.
- "No such module 'SwiftUI'" — podspec needs SwiftUI framework dependency.
- Compose dependencies missing on Android — build.gradle needs compose BOM.

## Platform

- iOS: yes, SDK 56, iOS 15+ simulator or device (16+ preferred for SwiftUI hosting).
- Android: yes, SDK 56, API 24+ emulator or device.
