# U3-002 — local xcodebuild evidence

The TS/format gates do not compile Swift; the native compile is the headless proof that
`MaterialConfig` and the `Glass` wiring build against the Xcode 26 SDK.

- Command:
  `xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build`
  (from `example/ios`)
- Toolchain: Xcode 26.5 (17F42) on macOS 26.5.1
- Date: 2026-06-10
- Result: `** BUILD SUCCEEDED **` (exit code 0)

This compiles the full example app including the `ReactNativeFx` pod with the U3-002
changes (`FxMaterialView.swift` `Glass` variant + `.interactive()`, the `MaterialConfig`
Record, the `materialConfig` prop on `FxModule`/`FxHostedView`).
