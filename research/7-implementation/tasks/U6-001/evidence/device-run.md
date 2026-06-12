# U6-001 device gate run

## Date

2026-06-12

## Result

PASS. The temporary example instrumentation drove the internal native driver on both required platforms, and the scenario completed without driver failure signs.

## Devices

- Android: POCO F1, Android 15, API 35. Device id: `69424da8`.
- iOS: iPhone 17 Pro simulator, iOS 26.5. UDID: `CBCEA03B-5526-4F36-867C-1327245D7671`.

## Build and install evidence

- Android APK built with `./gradlew :app:assembleDebug`: pass.
- Android APK timestamp verified before install: `example/android/app/build/outputs/apk/debug/app-debug.apk`, `Jun 12 08:26`.
- Android install command: `adb install -r example/android/app/build/outputs/apk/debug/app-debug.apk`: `Success`.
- iOS `bun ios --device 19E18F8C-4C94-462F-BC9F-B519CB753738` did not reach Xcode and stayed in the Pod retry loop; stopped it and built the workspace directly.
- iOS build command: `xcodebuild -workspace example/ios/reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -destination id=19E18F8C-4C94-462F-BC9F-B519CB753738 -derivedDataPath example/ios/build-u6 build`: `** BUILD SUCCEEDED **`.
- iOS app artifact timestamp: `example/ios/build-u6/Build/Products/Debug-iphonesimulator/reactnativefxexample.app`, `Jun 12 09:22`.
- iOS app installed with `xcrun simctl install CBCEA03B-5526-4F36-867C-1327245D7671 example/ios/build-u6/Build/Products/Debug-iphonesimulator/reactnativefxexample.app`.

## Local recordings

- Android: `/private/tmp/u6-001-android.mp4`.
- iOS primary run: `/private/tmp/u6-001-ios.mp4`.
- iOS corrected tap and reduce-motion proof: `/private/tmp/u6-001-ios-corrected.mp4`.
- iOS tap-count still: `/private/tmp/u6-ios-tap-count-1.png`.

## Android results

### 1. Fire-once envelope `rest -> offRight`

PASS. One completion logged for the fire-once block.

```text
[agent-device][mark][2026-06-12T02:16:41.390Z] android-fire-once-start
06-12 09:16:44.947 I/ReactNativeFx(29861): U6-001 completion settled=FxAnimationVector(opacity=0.4, scale=0.92, translationX=160.0, translationY=0.0, rotation=0.0)
```

### 2. Mid-flight retarget plus second display-link-path retarget

PASS. The first retarget batch and second retarget batch both target only `offLeft`; one completion lands at the final target. The screen recording showed no visible snap or jump to a prior target.

```text
[agent-device][mark][2026-06-12T02:17:18.343Z] android-retarget-start
06-12 09:17:21.755 I/ReactNativeFx(29861): U6-001 retarget property=alpha finalPosition=0.7
06-12 09:17:21.755 I/ReactNativeFx(29861): U6-001 retarget property=scaleX finalPosition=1.0
06-12 09:17:21.755 I/ReactNativeFx(29861): U6-001 retarget property=scaleY finalPosition=1.0
06-12 09:17:21.755 I/ReactNativeFx(29861): U6-001 retarget property=translationX finalPosition=-120.0
06-12 09:17:21.855 I/ReactNativeFx(29861): U6-001 retarget property=alpha finalPosition=0.7
06-12 09:17:21.855 I/ReactNativeFx(29861): U6-001 retarget property=scaleX finalPosition=1.0
06-12 09:17:21.855 I/ReactNativeFx(29861): U6-001 retarget property=scaleY finalPosition=1.0
06-12 09:17:21.855 I/ReactNativeFx(29861): U6-001 retarget property=translationX finalPosition=-120.0
06-12 09:17:22.087 I/ReactNativeFx(29861): U6-001 completion settled=FxAnimationVector(opacity=0.7, scale=1.0, translationX=-120.0, translationY=0.0, rotation=0.0)
```

### 3. Wrapped RN child tappable at rest

PASS. After the first envelope settled, tapping the wrapped RN child fired its normal RN handler and incremented the counter.

```text
06-12 09:16:56.843 I/ReactNativeJS(29861): U6-001 child tap count=1
```

### 4. Cancel mid-flight

PASS. Cancel stopped the active spring set and settled in place. No completion appeared between `android-cancel-start` and `android-reduce-motion-start`.

```text
[agent-device][mark][2026-06-12T02:17:38.648Z] android-cancel-start
06-12 09:17:42.290 I/ReactNativeFx(29861): U6-001 cancel reason=debug-command activeBefore=4 activeAfter=0 settled=FxAnimationVector(opacity=0.30488473, scale=0.907318, translationX=185.36407, translationY=0.0, rotation=0.0)
```

### 5. Animator scale 0

PASS. `agent-device settings animations off --platform android --session u6android` set animator scale to 0. The next start placed the target in one step and logged one completion; animations were restored afterward.

```text
[agent-device][mark][2026-06-12T02:18:02.759Z] android-reduce-motion-start
06-12 09:18:07.022 I/ReactNativeFx(29861): U6-001 completion settled=FxAnimationVector(opacity=0.4, scale=0.92, translationX=160.0, translationY=0.0, rotation=0.0)
```

## iOS results

### 1. Fire-once envelope `rest -> offRight`

PASS. One completion logged for the fire-once block.

```text
[agent-device][mark][2026-06-12T02:49:59.121Z] ios-fire-once-start
2026-06-12 09:50:05.380 Df reactnativefxexample[56211:d7209a] (Foundation) U6-001 completion settled=opacity=0.400 scale=0.920 translationX=160.000 translationY=0.000 rotation=0.000
```

### 2. Mid-flight retarget plus second display-link-path retarget

PASS. The first retarget logs the render-server to display-link handoff with the captured presentation value. The second retarget logs `source=display-link`, carries velocity from the display-link path, targets only `offLeft`, and produces exactly one completion at the final target. The screen recording showed no visible snap or jump to a prior target.

```text
[agent-device][mark][2026-06-12T02:50:45.233Z] ios-retarget-start
2026-06-12 09:50:51.048 Df reactnativefxexample[56211:d7209a] (Foundation) U6-001 retarget source=render-server target=opacity=0.700 scale=1.000 translationX=-120.000 translationY=0.000 rotation=0.000 presentation=opacity=0.787 scale=0.972 translationX=56.833 translationY=0.000 rotation=0.000 carriedVelocity=opacity=-2.557 scale=0.000 translationX=0.000 translationY=0.000 rotation=0.000
2026-06-12 09:50:51.147 Df reactnativefxexample[56211:d7209a] (Foundation) U6-001 retarget source=display-link target=opacity=0.700 scale=1.000 translationX=-120.000 translationY=0.000 rotation=0.000 presentation=opacity=0.688 scale=0.980 translationX=7.037 translationY=0.000 rotation=0.000 carriedVelocity=opacity=0.000 scale=0.131 translationX=-816.602 translationY=0.000 rotation=0.000
2026-06-12 09:50:52.263 Df reactnativefxexample[56211:d7209a] (Foundation) U6-001 completion settled=opacity=0.700 scale=1.000 translationX=-120.000 translationY=0.000 rotation=0.000
```

### 3. Wrapped RN child tappable at rest

PASS. After reset-to-rest, tapping the wrapped RN child fired its normal RN handler. The corrected proof recording and still show `tap count: 1`.

```text
2026-06-12 09:58:41.161 I  reactnativefxexample[62936:d76c84] [com.facebook.react.log:javascript] U6-001 child tap count=1
```

### 4. Cancel mid-flight

PASS. Cancel stopped the active render-server animation and settled in place. No completion appeared between `ios-cancel-start` and the next scenario marker.

```text
[agent-device][mark][2026-06-12T02:51:12.593Z] ios-cancel-start
2026-06-12 09:51:19.097 Df reactnativefxexample[56211:d7209a] (Foundation) U6-001 cancel reason=debug-command displayLinkWasActive=false renderServerWasActive=true settled=opacity=0.789 scale=0.972 translationX=56.343 translationY=0.000 rotation=0.000
```

### 5. Reduce motion

PASS. `agent-device settings animations` is unsupported for iOS in this CLI, so the simulator preference was set with `xcrun simctl spawn CBCEA03B-5526-4F36-867C-1327245D7671 defaults write com.apple.Accessibility ReduceMotionEnabled -bool YES`, then restored with `-bool NO`. The corrected proof run placed the target in one step and logged one completion.

```text
[agent-device][mark][2026-06-12T02:59:07.057Z] ios-reduce-motion-start-3
2026-06-12 09:59:14.928 Df reactnativefxexample[62936:d76bf1] (Foundation) U6-001 completion settled=opacity=0.400 scale=0.920 translationX=160.000 translationY=0.000 rotation=0.000
```

## Failure signs checked

- Android: one React startup soft exception appeared before the U6 markers (`Tried to access onWindowFocusChange while context is not ready`). It did not recur during the scenario and did not block app interaction or driver logs.
- iOS: a React Native warning affordance appeared after the reduce-motion relaunch and caused one missed tap against the debugger affordance. That block is not counted; the corrected `ios-reduce-motion-start-3` block is the evidence for reduce motion.
- No U6 driver crash, duplicate completion in a scenario block, stale-target completion, snap/jump on recording, or post-cancel completion was observed.

## Cleanup requirement

Temporary instrumentation was local-only and is reverted after this write-up. `progress.md` remains untouched at `headless-done`; RT-007 and the ledger remain open for maintainer review.
