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

---

## Glass-rung rework — UIKit `UIVisualEffectView` + `UIGlassEffect` (2026-06-10)

- Command: same as above (from `example/ios`, after a `pod install` so the Pods project
  picks up the new `FxGlassSurfaceView.swift` — the podspec glob resolves at install time)
- Toolchain: Xcode 26.5 (17F42) on macOS 26.5.1
- Date: 2026-06-10
- Result: `** BUILD SUCCEEDED **` (exit code 0, zero `error:` lines;
  `FxGlassSurfaceView.swift` confirmed in the `ReactNativeFx.SwiftFileList`)

This compiles the UIKit glass-rung rework:
- `FxGlassSurfaceView.swift` (new) — `UIVisualEffectView` + `UIGlassEffect` surface with the
  precedent lifecycle (effect created in `layoutSubviews`, stale-effect clear on
  `isInteractive` toggles, `setNeedsLayout` on window re-entry, `cornerConfiguration` shape);
  `MaterialConfig` moved here with its consumer.
- `FxHostedView.swift` — `material` on iOS 26 mounts the glass surface directly as a UIKit
  subview; radius updates push into `cornerConfiguration` without remounting; diagnostic
  `NSLog` removed.
- `FxMaterialView.swift` — shrunk to the below-26 intensity-keyed material fallback.
