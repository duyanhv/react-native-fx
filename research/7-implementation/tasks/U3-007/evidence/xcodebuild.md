# U3-007 — local xcodebuild evidence

The TS/format gates do not compile Swift; the native compile is the headless proof that
the `FxSymbolView` change builds against the Xcode 26 SDK.

## A1-1 resolved-display fix (2026-06-10)

- Command:
  `xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build`
  (from `example/ios`)
- Toolchain: Xcode 26.5 (17F42) on macOS 26.5.1
- Date: 2026-06-10
- Result: `** BUILD SUCCEEDED **` (exit code 0, zero `error:` lines)

This compiles the full example app including the `ReactNativeFx` pod with the A1-1 fix:
- `FxSymbolView.swift` — the displayed glyph resolves to `replaceWith ?? name`, so setting
  `replaceWith` changes the rendered symbol and `.contentTransition(.symbolEffect(.automatic))`
  animates the swap.

Companion headless gates, same date, all green: `bun run lint`, `bun run swift:lint`,
`bun run build`, `bun run test` (21 passed), `bunx tsc --noEmit` in both `packages/`
and `example/`.
