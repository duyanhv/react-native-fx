# U3-002 — local xcodebuild evidence (rework)

The TS/format gates do not compile Swift; the native compile is the headless proof that
the reworked `FxMaterialView` and `FxHostedView` build against the Xcode 26 SDK.

- Command:
  `xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build`
  (from `example/ios`)
- Toolchain: Xcode 26.5 (17F42) on macOS 26.5.1
- Date: 2026-06-10
- Result: `** BUILD SUCCEEDED **` (exit code 0)

This compiles the full example app including the `ReactNativeFx` pod with the U3-002
rework changes:
- `FxMaterialView.swift` — `Rectangle().fill(.clear)` + `.glassEffect(..., in: RoundedRectangle(cornerRadius:))`
- `FxHostedView.swift` — `layoutSubviews()` reads `self.layer.cornerRadius`, logs it, and rebuilds the host on change

Previous build record (original prep): `2026-06-10` also BUILD SUCCEEDED. This is the
rework verification.

---

## Round 2 — A2-4 contentShape fix (2026-06-10)

- Command: same as above
- Toolchain: Xcode 26.5 (17F42) on macOS 26.5.1
- Date: 2026-06-10
- Result: `** BUILD SUCCEEDED **` (exit code 0)

This compiles the round-2 A2-4 fix:
- `FxMaterialView.swift` — `.contentShape(RoundedRectangle(cornerRadius: cornerRadius))` added to restore the hit region for the `interactive` glass press response after `.fill(.clear)` removed the opaque hit surface.
