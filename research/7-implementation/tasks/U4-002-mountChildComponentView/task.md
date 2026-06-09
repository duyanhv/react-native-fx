# U4-002 (RT-014) — mountChildComponentView override that routes RN children into the intermediate container

Type: implement + device-verify
State: merged
Unit: 4

Consumes: RT-014 (U4-001 decides the mechanic, this task implements it)
Closes: RT-014
Blocked by: U4-001 (mechanic decided — intermediate container, animator targets it)

## Goal

Implement the `mountChildComponentView` override on `FxSurfaceView` (iOS) and the `addView` override on `FxSurfaceView` (Android) that routes React Native children into the intermediate container, not directly onto the outer view. The container is the target of the content-motion animator, so Fabric cannot clobber its transform/opacity.

## Rules gate

- **#7** — Stay on Expo Modules (Fabric). Verified: `mountChildComponentView` is declared in the non-C++ `ExpoFabricViewObjC` interface for Swift override; Android `ExpoView` is a `ViewGroup` so `addView`/`removeView` override directly in Kotlin. No C++ / JSI / HybridObject needed.
- **#3** — This is `expo-view` substrate only (`FxSurfaceView`), never `FxHostedView`.
- **#9** — Children are routed/wrapped into the container, never seized from React's tree. React owns the mount/unmount lifecycle.
- **#1** — No per-frame JS; native owns the frame loop.

## Contract anchors

- `33-shadow-nodes-and-layout.md` §The clobber constraint → the intermediate container
- `34-animation-driver.md` §Findings — the driver animates an fx-owned, Fabric-invisible intermediate container
- `blueprint.md` Unit 4 — The Intermediate Fabric-Invisible Layer
- `structure.ios.md` / `structure.android.md` — pinned per-platform mechanics

## Decision

**fx-original** — derived from the `33` finding. The override is the mechanic that makes the wrapper wrap anything; no prior art demonstrates this exact pattern, but the Expo `GlassContainer`/`GlassView` precedent shows the child-routing override shape (route into an intermediate `contentView`).

## Reference (HOW)

- `references/expo/packages/expo-glass-effect/ios/GlassContainer.swift:49-55` — Swift `mountChildComponentView`/`unmountChildComponentView` override routing into `containerEffectView.contentView`
- `references/expo/packages/expo-glass-effect/ios/GlassView.swift:274-280` — same pattern
- `references/expo/packages/expo-blur/android/ExpoBlurTargetView.kt` — Kotlin `addView`/`removeView` override routing into `blurTargetView`

## Checklist

- [x] spec'd
- [x] rules-gated
  - [x] implemented
  - [x] commented
  - [x] TS+format-green
  - [x] native-compile-verified (iOS local xcodebuild BUILD SUCCESSFUL; Android local gradle BUILD SUCCESSFUL)
  - [x] Android reimplemented — full ExpoBlurTargetView.kt family (onMeasure, updateViewLayout, removeAllViews, etc.) + no-`super.onLayout` traversal-crash fix + onMeasure/onLayout 0×0 sizing fix
  - [x] iOS reimplemented — symmetric mount/unmount + superview guard; spurious default shader + free-running MTKView loop fixed; diagnostics removed
  - [x] device-verified (maintainer, iOS + Android, 2026-06-09 — mount/unmount confirmed; taps land; Android crash gone)
  - [x] docs-closed (RT-014 mechanic + corrected templates pinned in `structure.{ios,android}`)
  - [x] reviewed (diffed against `ExpoBlurTargetView`/`expo-glass` templates)
  - [x] merged

## Proof

- **headless**: `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, `bun run test` from `packages/` all pass. `git diff --check` clean.
- **native compile**:
  - **iOS:** `xcodebuild -workspace FxBareExample.xcworkspace -scheme FxBareExample -configuration Debug -sdk iphonesimulator` on Xcode 26.5 → BUILD SUCCESSFUL. The `mountChildComponentView(_:index:)` override signature matches the Expo/Fabric superclass; no mismatch, no compiler error.
  - **Android:** `./gradlew :react-native-fx:compileDebugKotlin` → BUILD SUCCESSFUL. One fix required: `intermediateContainer` must be a `ViewGroup` (`FrameLayout`), not a plain `View`, because `addView`/`removeViewAt`/`getChildAt` are `ViewGroup` APIs. The compiler caught this immediately.
- **device**: mount an RN child inside `<FxSurfaceView>` (no `shader` prop — `metalView` hidden), confirm it lands in the intermediate container, renders correctly (layout + draw), and hit-testing survives. Android proxy methods (`getChildCount`/`getChildAt`/`indexOfChild` → `intermediateContainer`) are a specific traversal risk; the scenario must exercise layout, draw, and touch correctness. Mid-flight caveat per `34` (iOS model layer vs Android visual position).
- **docs**: `structure.ios.md` / `structure.android.md` — intermediate container mechanic + effect surface visibility rule; `34` — open item about effect↔content composition when both are active.

## Notes

- The `metalView` visibility rule: the effect surface is hidden when no effect is active, so it never obscures the content-motion container. This is correct lifecycle, not a test hack.
- The open item: how do `metalView` (effect surface) and `intermediateContainer` (content-motion) compose when both are active? Z-order, hit-testing, the combined shader-and-motion case — this is the intersection of SPINE-004 (composition as API-layer prop) and the U3 V2 interactive surface. Not decided in V1.
- **Runnable example screen:** `example/screens/content-motion.tsx` is registered in `example/data/tasks.ts` and routed in `example/app/(tasks)/[taskId].tsx`. The human opens the U4-002 screen in the example app to run the device gate.
