# U3-008 — headless gates + device scenario

## Headless gates (2026-06-10)

All run against the persistent-host rework (new `FxHostedRootView.swift`; reworked
`FxHostedView.swift`; a11y defaults in `FxGlassSurfaceView.swift` + `FxHostedView.kt`).

| Gate | Where | Result |
|------|-------|--------|
| `bun run lint` | packages/ | pass — Checked 16 files, no fixes |
| `bun run swift:lint` | packages/ | pass — no findings |
| `bun run build` | packages/ | pass |
| `bun run test` | packages/ | pass — 26/26 (1 suite) |
| `bunx tsc --noEmit` | packages/ | pass |
| `bunx tsc --noEmit` | example/ | pass |
| `xcodebuild` Debug iphonesimulator | example/ios | `** BUILD SUCCEEDED **` |

xcodebuild detail: `pod install` first (the podspec glob resolves at install time and the
new `FxHostedRootView.swift` is not in the stale file list), then
`xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample
-configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator'
build` — Xcode 26.5 (17F42), exit code 0.

## Device scenario

### Goal

Prove the persistent `UIHostingController` keeps SwiftUI state alive across prop batches
(critique F1) and that decorative hosted effects are out of the accessibility tree while
the interactive glass stays reachable (critique F10).

### Steps

1. **F1, symbol** — on the symbol screen set an indefinite animation (`variableColor`,
   trigger `repeat`), then change an unrelated control (the replace-with selection):
   the animation must continue without a blank flash or restart-from-zero.
2. **F1, shader** — on a shader screen drag/step the intensity control: no blank flash,
   no clock reset (the shader pattern continues rather than restarting).
3. **Glass regression** — the glass tile still renders (regular + clear) and the
   `isInteractive` press machinery still installs (structural/AX check, not frame-diff).
4. **A11y** — accessibility tree over a decorative effect screen contains no effect
   element; over the interactive glass the surface is reachable.
5. **GPU resume** — background → foreground on a shader screen: clock resumes, no black
   frame.

### Expected result

Symbol animation continuity, no shader reset, glass renders with press machinery,
decorative effects a11y-hidden, interactive glass reachable, clean GPU resume.

### Failure signs

Blank flash on any prop change; symbol animation restarting from phase zero; shader
pattern restarting; glass tile missing or dark box; decorative effect announced to
VoiceOver; interactive glass unreachable; black frame on resume.

### Platform

- iOS: yes, iPhone 17 Pro simulator, iOS 26.x
- Android: a11y default only (TalkBack hidden) — ride the next Android device session
