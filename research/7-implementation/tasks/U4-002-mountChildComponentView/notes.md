## 2026-06-09 — U4-002 implement complete (TS+format-green; native compile pending)

### What changed and why

- **iOS `FxSurfaceView.swift`** — added `intermediateContainer: UIView` as a Fabric-invisible child container. Override `mountChildComponentView(_:index:)` and `unmountChildComponentView(_:index:)` route RN children into the container, not directly onto `FxSurfaceView`. The container is inserted behind the `metalView` in z-order so the GPU surface remains on top. The `metalView` is hidden when no effect is active (`pendingShader` empty or invalid), so it never obscures the content-motion container.
- **Android `FxSurfaceView.kt`** — added `intermediateContainer: View` with `MATCH_PARENT` layout params. Override `addView` (all overloads) and `removeView`/`removeViewAt`/`getChildCount`/`getChildAt`/`indexOfChild` route RN children into the container. The container is added in `init`. The effect surface visibility rule is mirrored (placeholder for when the Android shader renderer is implemented).
- **Rule-#7 finding:** verified clean — Expo exposes `mountChildComponentView` in the Swift `ExpoFabricView` interface (non-C++), and Android `ExpoView` is a `ViewGroup` so `addView` override is direct Kotlin. No C++ / JSI / HybridObject needed. This is the sanctioned Expo Modules path.
- **Effect surface visibility** recorded as a mechanic in `structure.ios.md` and `structure.android.md` — the effect surface is hidden when no effect is active, so it never obscures the content-motion container.
- **Open item flagged** in `34-animation-driver.md` — the effect↔content composition question (when both the GPU surface and the intermediate container are active) is not decided in V1. This is the intersection of SPINE-004 (composition as API-layer prop) and the U3 V2 interactive surface.

### Unverified claims

- **iOS native compile VERIFIED.** Local `xcodebuild` (Debug, iphonesimulator) on Xcode 26.5 — BUILD SUCCESSFUL. The `mountChildComponentView(_:index:)` override signature matches the Expo/Fabric superclass; no mismatch, no compiler error.
- **Android native compile VERIFIED.** Local `./gradlew :react-native-fx:compileDebugKotlin` — BUILD SUCCESSFUL. One fix required: `intermediateContainer` must be a `ViewGroup` (`FrameLayout`), not a plain `View`, because `addView`/`removeViewAt`/`getChildAt` are `ViewGroup` APIs. The compiler caught this immediately.
- **Android proxy traversal risk.** `getChildCount`/`getChildAt`/`indexOfChild` proxy to `intermediateContainer` — necessary for Fabric reconciliation, but can confuse the framework's measure/layout/draw/touch traversal. The device scenario must explicitly exercise layout, draw, and touch correctness.
- **The device scenario is written but not executed** — the device gate is the human's.

- **Runnable example screen shipped.** `example/screens/content-motion.tsx` implements the device scenario with a toggle button and a visibly confirmable tap counter inside `<FxSurfaceView>`. The screen is registered in `example/data/tasks.ts` (id: U4-002, screen: "content-motion") and routed in `example/app/(tasks)/[taskId].tsx`. `evidence/device.md` updated to point to the screen instead of a raw snippet.
- **Package type fix:** `NativeFxSurfaceProps` in `packages/src/runtime/FxSurfaceView.tsx` added `children?: ReactNode` so the example app can pass children into `<FxSurfaceView>` without a type error. This is a type-only change; no runtime or native code touched.

### Next: human device run — open the U4-002 / content-motion screen in the example app, confirm the child mounts into the container, renders correctly (layout + draw), and hit-testing survives.
