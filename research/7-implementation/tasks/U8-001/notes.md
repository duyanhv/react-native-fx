# U8-001 notes

## Unverified claims

- Passive mode tracks pointer uniforms continuously without claiming scroll.
- Active mode produces correct press, long-press, cancel, and scroll-yield behavior on device.
- Current SDF behavior uses the full-bounds fallback because the shipped shader manifest has no separate shape description.
- Rapid-touch hit-test and uniform writes do not introduce measurable jank.
- U6/U7 motion regressions still pass after the touch path change.

## Log

- Added `FxPressHandler.swift` as a plain handler over a stock `UILongPressGestureRecognizer`, with passive/active modes, slop self-failure via `isEnabled` toggle, UIKit-duration long-press timing, native UV uniform writes, and semantic `onShader*` event dispatch.
- Replaced the naive iOS `FxSurfaceView` recognizer path with the handler and added `onShaderLongPress` registration.
- Added `FxPressHandler.kt` and `FxSurfaceShaderView.kt` on Android, with platform slop/long-press tokens, native touch uniform writes, shader redraw on uniform write, and lifecycle pause/resume forwarding.
- Wired Android `FxSurfaceView` to mount the interactive AGSL surface above the content container, route touch through the handler, and dispatch `onShaderLongPress`.
- Added `pressDepth` and `touch` uniforms to Android `dots.agsl` so the interactive Android surface has a visible touch-responsive shader without changing the iOS Metal pixels.
- Updated the TypeScript native surface event type to include `{ x, y }` payloads and the `onShaderLongPress` prop.
- Wrote `evidence/headless.md` with the six-point device scenario plus the U6/U7 regression check.
- Addressed review blockers before the device gate: removed the iOS `unowned` lifetime trap, kept Android passive mode on the touch stream, mapped Android `touch.y` into AGSL's y-down fragment space, suppressed tap after long-press, smoothed `pressDepth` back to zero natively, added iOS composition pass-through hit-testing, cached Android interactive-uniform support per shader, and reconciled `structure.android.md` to the shipped `dispatchTouchEvent` mechanic.
- Verification: `bun install`; from `packages/`, `bunx tsc --noEmit`, `bun run build`, `bun run lint`, `bun run swift:lint`, and `bun run test` all pass; from `example/android/`, `./gradlew :react-native-fx:compileDebugKotlin` passes; from `example/ios/`, `pod install` and `xcodebuild -workspace ./reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build` pass.

Next: run the U8-001 device scenario in `evidence/headless.md`; if it passes, pin the tuned hit-test/cost result in `32` and flip the `40` long-press row during docs closure.
