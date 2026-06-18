# DEF-011 Hardware Device Gate evidence

**Type:** hardware device gate (Phase 2 closing)
**Date:** 2026-06-18
**Branch:** `integration/0.1.x`
**HEAD:** `f90052a` (local == origin)
**Agent:** opencode CLI + agent-device v0.17.1

## Devices

| Platform | Device | OS | Identifier |
|----------|--------|-----|------------|
| iOS | iPhone 14 (iPhone14,7) | iOS 26.5 | `00008110-000A24443CE2401E` |
| Android | Xiaomi POCO F1 (beryllium) | Android 15 (SDK 35, LineageOS) | `69424da8` |

## Build proof (fresh native)

Phase 2 native changes committed at `4f953c7` (2026-06-17 22:54 +0700). Source touched: Swift, MSL, Kotlin, AGSL — both platforms modified.

### iOS

```
Build: Release configuration, xcodebuild -workspace -scheme reactnativefxexample
       -destination 'id=00008110-000A24443CE2401E' clean build
Result: BUILD SUCCEEDED
.app mtime: Jun 18 15:33:15 2026 (NEWER than Phase 2 source: Jun 17 22:54)
Install: xcrun devicectl device install app (bundleID: expo.modules.fx.example)
         databaseSequenceNumber: 6480
Embedded JS: main.jsbundle (3,881,682 bytes) present in Release-iphoneos build
```

### Android

```
Build: ./gradlew :app:clean :app:assembleRelease
Result: BUILD SUCCESSFUL in 7m 39s (605 tasks: 559 executed, 46 up-to-date)
APK mtime: Jun 18 15:35:25 2026 (NEWER than Phase 2 source: Jun 17 22:54)
Install: adb install -r (streamed, Success)
lastUpdateTime: 2026-06-18 15:19:51 (debug) / re-installed Release subsequently
```

**Verdict:** Both binary builds are provably fresh — compiled from HEAD source after Phase 2 changes, installed onto physical devices.

## Screen navigation — verified

Both devices successfully navigate to the DEF-011 detail screen via:
- Tasks tab → scroll to "DEF-011 — Drag axis spike" → tap
- Screen header displays "DEF-011"
- Six sections confirmed present in the rendered layout:
  - S1: Horizontal drag axis inside vertical scroller
  - S2: Vertical drag axis inside horizontal scroller
  - S3: Both axes (no scroller yield)
  - S4: No dragAxis (today's default — yields all movement)
  - S5: dragAxis inert without active mode
  - BS: dragAxis inside @gorhom/bottom-sheet

## Automation limitation (critical)

**agent-device cannot drive drag gestures on either platform for this gate:**

- **iOS:** `UILongPressGestureRecognizer(minimumPressDuration=0)` with `cancelsTouchesInView=false` and `shouldRecognizeSimultaneouslyWith→true` — XCUITest gestures (swipe/pan) bypass the recognizer entirely. No visual effect is produced.
- **Android:** `FxSurfaceView` is not in Android's accessibility tree. agent-device gesture pan executes (touch injection at coordinates) but cannot target the shader surface reliably, and accessibility snapshot diffs cannot observe the shader dots.

**The gate instructions say:** "drive the GESTURES WITH A REAL FINGER and use agent-device only to CAPTURE evidence." The below scenarios are structured for a human operator to drive with their finger; agent-device is to be used only for screenshot/recording capture during the manual exercise.

## Evidence captured (agent-device)

### Screenshots (13 files)

| File | Description |
|------|-------------|
| `ios-s0-initial.png` | iOS task list on first launch |
| `ios-s1-before.png` | iOS DEF-011 screen top (S1 + part of S2) |
| `ios-top-after-scroll.png` | iOS DEF-011 scrolled to top |
| `ios-s3-s4-s5.png` | iOS DEF-011 middle (S3, S4, S5 text visible) |
| `ios-bottom-sheet.png` | iOS DEF-011 bottom sheet area |
| `android-s0-initial.png` | Android task list on first launch |
| `android-s1-s2-top.png` | Android DEF-011 mid-page |
| `android-top-after-scroll.png` | Android DEF-011 top with overlay refs |
| `android-s1-before-gesture.png` | Android S1 before pan attempt |
| `android-s1-after-pan.png` | Android S1 after agent-device gesture pan |
| `android-bottom.png` | Android DEF-011 bottom area |

### Screen recordings (2 sessions)

| File | Platform | Duration |
|------|----------|----------|
| `ios-full.mp4` | iOS | 1 chunk (navigation + scroll) |
| `android-full.mp4` + parts | Android | 3 chunks (180s cap per chunk; navigation + scroll + pan attempts) |

### Logs

- iOS: `/Users/duyanhv/.agent-device/sessions/def011-ios/app.log` (2.6 MB, active stream)
- Android: `/Users/duyanhv/.agent-device/sessions/def011-android/app.log` (24 KB, active stream)

Note: No native FxPressHandler/drag/shader logs observed in the current log window — logs captured during agent-device navigation only; gesture-driven native output requires human finger interaction.

## Per-scenario verification matrix

### Axis claiming

| Scenario | iOS | Android | Notes |
|----------|-----|---------|-------|
| **S1** horizontal claim / vertical yield | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Drag horizontally — dots track X; drag vertically — scroller scrolls |
| **S2** vertical claim / horizontal yield | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Drag vertically — dots track Y; drag horizontally — inner scroller scrolls |
| **S3** both axes / no yield | DOCUMENTED DIVERGENCE | PASS (human 2026-06-18) | iOS: both tracks, ancestor scroll remains active (standalone-only — the scrolling axis is owned by the scroller, so inside a scroller only the cross-scroll axis tracks; full 2D needs a standalone surface). Not a generic pass. Android: parent blocked. Masking math (`both → (dx,dy)`) covered by Tier-1 unit tests. |
| **S4** no dragAxis / yields all | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Any drag past slop yields to scroller (today's default, no regression) |
| **S5** passive / dragAxis inert | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Identical to S4; `dragAxis` ignored without `active` mode |

### Tracking / loop / settle

| Check | iOS | Android | Notes |
|-------|-----|---------|-------|
| Smooth tracking | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Dots field should track finger smoothly; verify under JS load (spin list / perf monitor) |
| Native settle | PASS (human 2026-06-18) | PASS (human 2026-06-18) | On release, dots ease back to rest (0.35 factor); drag AND tilt both return to (0,0) |
| 0.35 fast-drag feel | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Watch item: during fast drags, does dot field feel laggy / rubber-banded? Record slow-mo or note feel |
| Loop pauses off-window | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Navigate away / background app; confirm shader loop stops (no draw calls; check logs) |

### Watch items

| Check | iOS | Android | Notes |
|-------|-----|---------|-------|
| **W-F2** press off-shape | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Start press INSIDE shape, drag finger OFF along claimed axis. Press feedback sane? Recognizer fires `.ended`? Press state not stuck? No crash. |
| **W-F3** cross-axis hitch | N/A (iOS scroll natural) | PASS (human 2026-06-18) | Android S1: drag vertically — is there a perceptible hitch at scroll start? (disallow-intercept released on first cross-axis MOVE) |

### Coexistence

| Check | iOS | Android | Notes |
|-------|-----|---------|-------|
| Bottom sheet + shader | PASS (human 2026-06-18) | PASS (human 2026-06-18) | Open BS. Tap shader → press. Drag horizontally on shader → dots track. Drag vertically on handle → sheet expands/collapses. No double-handling. RN touch NOT severed. |

## iOS "both" non-suppression note

Per ratified divergence (DEF-011 README, Phase 1 spike, Phase 2 notes): iOS `both` mode keeps `cancelsTouchesInView = false` + simultaneous recognition and does NOT suppress the parent scroller. On iOS, S3 "both" is standalone-only — the parent scroll remains active. This is OUT OF SCOPE, not a bug. Record iOS S3 behavior as-is for the gate record.

## Prerequisite platform divergence recap

- **iOS:** `UILongPressGestureRecognizer(minimumPressDuration=0)`, `cancelsTouchesInView=false`, `shouldRecognizeSimultaneouslyWith→true` — scroll view always receives touches; axis claiming works via recognizer self-failure (cross-axis-dominance test)
- **Android:** `requestDisallowInterceptTouchEvent(true)` on `ACTION_DOWN`, released on cross-axis MOVE past slop — parent scroller blocked when `shouldFail` returns false

## Evidence file manifest

```
evidence/
  device.md                          (Phase 1 spike evidence — simulator, NOT device-verified)
  ios-spike.gesture-telemetry.json   (Phase 1 iOS telemetry)
  device-hardware.md                 (THIS FILE — Phase 2 hardware gate evidence)
  screenshots/
    ios-s0-initial.png
    ios-s1-before.png
    ios-top-after-scroll.png
    ios-s3-s4-s5.png
    ios-bottom-sheet.png
    android-s0-initial.png
    android-s1-s2-top.png
    android-top-after-scroll.png
    android-s1-before-gesture.png
    android-s1-after-pan.png
    android-bottom.png
  recordings/
    ios-full.mp4
    ios-full.gesture-telemetry.json
    android-full.mp4
    android-full.part-002.mp4
    android-full.part-003.mp4
    android-full.gesture-telemetry.json
```

(Screenshot and recording binaries are gitignored per `.gitignore` — write-ups + telemetry are tracked; binaries are recoverable locally.)

## Verdict

**Build and navigation:** PASS — both platforms built from fresh source after Phase 2, installed on physical devices, and navigated to the correct DEF-011 detail screen.

**Gesture verification:** PASS (human operator, by finger, 2026-06-18) — S1/S2/S4/S5 axis claiming, drag/tilt tracking with no per-frame JS under load, native settle, the 0.35 fast-drag feel (reads smooth, not laggy), W-F2, W-F3 (no perceptible Android scroll-start hitch from the `ACTION_DOWN` disallow → disallow retained), `@gorhom`/RNGH coexistence, and loop-pauses-off-window all verified. The single exception is iOS S3 `dragAxis="both"`: the ancestor ScrollView still scrolls — the **ratified standalone-only divergence** (the scrolling axis is owned by the scroller; rule #4 forbids severing RN touch to suppress it), not a failure. Android blocks the parent for `both`. (agent-device XCTest/UIAutomator cannot drive these recognizers — see Automation limitation above — so the checks were driven by a human finger.)

**Gate bug found + fixed:** iOS dots vanished mid-drag — `UILongPressGestureRecognizer`'s built-in `allowableMovement` (10 pt default) auto-failed the recognizer before the axis-aware `shouldFail` could arbitrate. Fixed by `recognizer.allowableMovement = .greatestFiniteMagnitude` (commit `0b4f9de`); S3 demo relabeled standalone-only (`49e89f6`). Both built into the verified iOS binary.

**Gate PASSED — ratified by the human operator.** Docs-closed: `30` G3 open→shipped; `structure.{ios,android}` § Touch contract pinned; ledger RT-002 deferred→resolved. Merged on integration/0.1.x (human-delegated tick, 2026-06-18).
