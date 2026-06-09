## 2026-06-09 — U4-002 implement complete (TS+format-green; native compile verified)

### What changed and why

- **iOS `FxSurfaceView.swift`** — added `intermediateContainer: UIView` as a Fabric-invisible child container. Override `mountChildComponentView(_:index:)` and `unmountChildComponentView(_:index:)` route RN children into the container, not directly onto `FxSurfaceView`. The container is inserted behind the `metalView` in z-order so the GPU surface remains on top. The `metalView` is hidden when no effect is active (`pendingShader` empty or invalid), so it never obscures the content-motion container.
- **Android `FxSurfaceView.kt`** — added `intermediateContainer: FrameLayout` as a Fabric-invisible child container. Override `addView` (all overloads) and `removeView`/`removeViewAt`/`getChildCount`/`getChildAt`/`indexOfChild` route RN children into the container. The container is added in `init`. The effect surface visibility rule is mirrored (placeholder for when the Android shader renderer is implemented).
- **Rule-#7 finding:** verified clean — Expo exposes `mountChildComponentView` in the Swift `ExpoFabricView` interface (non-C++), and Android `ExpoView` is a `ViewGroup` so `addView` override is direct Kotlin. No C++ / JSI / HybridObject needed. This is the sanctioned Expo Modules path.
- **Effect surface visibility** recorded as a mechanic in `structure.ios.md` and `structure.android.md` — the effect surface is hidden when no effect is active, so it never obscures the content-motion container.
- **Open item flagged** in `34-animation-driver.md` — the effect↔content composition question (when both the GPU surface and the intermediate container are active) is not decided in V1. This is the intersection of SPINE-004 (composition as API-layer prop) and the U3 V2 interactive surface.

### Android device bug: child renders at 0×0

**Root cause:** `FxSurfaceView` was missing `shouldUseAndroidLayout = true` and an `onLayout` override. `ExpoView` defaults `shouldUseAndroidLayout = false`, which swallows the intermediate container's `requestLayout()` when the RN child mounts after initial layout, so the container is never re-measured → 0×0 → nothing shows. This is the documented ExpoView child-layout gotcha (`structure.android.md` §48-53).

**Fix:** Added `override val shouldUseAndroidLayout: Boolean = true` and an `onLayout` override that measures the `intermediateContainer` with exact specs and then lays it to the host bounds. A `FrameLayout` holding the RN child tree won't size its children unless it itself is measured first, so `measure()` precedes `layout()`. The same mechanic as `FxHostedView` — one mechanic, one home.

**Parity check against FxHostedView for other documented Android gotchas:**
- `shouldUseAndroidLayout` — missing in FxSurfaceView, now added.
- `onLayout` override — missing in FxSurfaceView, now added.
- `pausePresentationLoop` / `resumePresentationLoop` — inherited from `FxNativeView` base; both views have it.
- `shouldBeRecycled` — iOS-only Expo concept (Android has no equivalent); not needed.
- `onAttachedToWindow` / `onDetachedFromWindow` — inherited from `FxNativeView` base; both views have it.

### Unverified claims

- **iOS native compile VERIFIED.** Local `xcodebuild` (Debug, iphonesimulator) on Xcode 26.5 — BUILD SUCCESSFUL. The `mountChildComponentView(_:index:)` override signature matches the Expo/Fabric superclass; no mismatch, no compiler error.
- **Android native compile VERIFIED.** Local `./gradlew :react-native-fx:compileDebugKotlin` — BUILD SUCCESSFUL. One fix required: `intermediateContainer` must be a `ViewGroup` (`FrameLayout`), not a plain `View`, because `addView`/`removeViewAt`/`getChildAt` are `ViewGroup` APIs. The compiler caught this immediately. Second fix (0×0 bug): `shouldUseAndroidLayout = true` + `onLayout` override with explicit measure+layout.
- **Android proxy traversal risk.** `getChildCount`/`getChildAt`/`indexOfChild` proxy to `intermediateContainer` — necessary for Fabric reconciliation, but can confuse the framework's measure/layout/draw/touch traversal. The device scenario must explicitly exercise layout, draw, and touch correctness.
- **The device scenario is written but not executed** — the device gate is the human's.

- **Runnable example screen shipped.** `example/screens/content-motion.tsx` implements the device scenario with a toggle button and a visibly confirmable tap counter inside `<FxSurfaceView>`. The screen is registered in `example/data/tasks.ts` (id: U4-002, screen: "content-motion") and routed in `example/app/(tasks)/[taskId].tsx`. `evidence/device.md` updated to point to the screen instead of a raw snippet.
- **Package type fix:** `NativeFxSurfaceProps` in `packages/src/runtime/FxSurfaceView.tsx` added `children?: ReactNode` so the example app can pass children into `<FxSurfaceView>` without a type error. This is a type-only change; no runtime or native code touched.

## 2026-06-09 — Reimplementation: complete template family on Android, diagnostic logging on iOS

### Android — completed the ExpoBlurTargetView.kt override family

The previous implementation was a partial override (addView overloads + removeView/removeViewAt + getChild*). The proven template (`expo-blur` `ExpoBlurTargetView.kt`) ships the **full** family — anything less breaks `SurfaceMountingManager`'s direct-`getChildAt` fallback or crashes during `updateViewLayout`.

**Changes made:**
- `init` now adds `intermediateContainer` via `super.addView` with explicit `MATCH_PARENT` params (matching the template's guarded identity-add pattern).
- Added `onMeasure` — `setMeasuredDimension` + explicit `intermediateContainer.measure` with exact specs. This is the missing half of the 0×0 fix: `onLayout` alone only runs after layout; `onMeasure` ensures the container is sized during the measure phase so the RN child subtree receives a real constraint.
- Added `updateViewLayout` — proxies to `intermediateContainer`, with `toHostLayoutParams` helper to normalize params to `LayoutParams`.
- Added `removeViews`, `removeViewsInLayout`, `removeAllViews`, `removeAllViewsInLayout` — all proxy to `intermediateContainer`.
- Kept existing `addView` family (all 5 overloads, identity-guarded), `removeView`, `removeViewAt`, `getChildCount`, `getChildAt`, `indexOfChild`, `onLayout`, `shouldUseAndroidLayout`.

**Invariant preserved:** `getChildCount`/`getChildAt`/`indexOfChild` report the **container's children** with the container itself excluded. This matches the template and satisfies `getChildAt(i).getParent() == this` (the container's parent is `FxSurfaceView` via `super.addView`).

**Template choice rationale:** Stayed on the View-subclass pattern instead of switching to the `GroupView` DSL. `expo-blur` is a shipping Expo view using this exact approach; completing it is proven and lower-churn than rewriting the module definition. The DSL is marginally cleaner but not worth the rewrite here.

### iOS — diagnostic logging instead of blind superview guard

The previous plan proposed adding a `child.superview == intermediateContainer` guard to `unmountChildComponentView`. The maintainer correctly pushed back: a guard can only ever remove *fewer* things, and the observed symptom is "child won't unmount / shows from start" — a guard cannot explain that. The actual cause is unknown until device observation.

**Changes made:**
- Added `print` diagnostic logging to both `mountChildComponentView` and `unmountChildComponentView`. The logs print: child identity, index, superview before/after, and the full subview lists of both `intermediateContainer` and `self`.
- These prints are wrapped in `let s = String(describing: ...)` to keep line length under swift-format limits.

**Diagnosis questions the device run must answer:**
1. Does `unmountChildComponentView` actually fire when `show` toggles to `false`? (If not → the override isn't effective despite compiling; investigate signature/dispatch.)
2. If it fires and `removeFromSuperview()` runs, does the child still stay? (→ retained/re-added elsewhere, or double-parented.)
3. Is the child possibly mounted as a direct subview of `FxSurfaceView` in addition to the container? Check `self.subviews` vs `intermediateContainer.subviews` at runtime from the logs.

The superview guard (`if child.superview == intermediateContainer`) may be added later as defensive hardening (matches RNGH), but only after the real cause is identified — it rides on top, not in place of it.

### Verification

- **Android:** `./gradlew :react-native-fx:compileDebugKotlin` → BUILD SUCCESSFUL
- **iOS:** `xcodebuild` (Debug, iphonesimulator) → BUILD SUCCESSFUL (exit code 0)
- **TS/format:** `tsc --noEmit`, `build`, `lint`, `swift:lint`, `test` all green
- **git diff --check:** clean

### Next: human device run

Open the U4-002 / content-motion screen in the example app, confirm the child mounts into the container, renders correctly (layout + draw, not 0×0), and hit-testing survives. **For iOS, capture the console logs** and answer the three diagnosis questions above before concluding the fix.
