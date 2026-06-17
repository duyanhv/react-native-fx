# DEF-011 Phase 1 device spike — evidence

**Type:** spike (simulator) — NOT device-verified  
**Date:** 2026-06-17  
**Commit:** `257905c` — `feat(interaction): axis-aware drag claiming on FxPressHandler (DEF-011 Phase 1)`  
**Tester:** agent-device (v0.17.1) via XCTest (iOS) / UIAutomator (Android)  

## Build identifiers

| Platform | Binary build time | Commit | Fresh native build |
|---|---|---|---|
| iOS (iPhone 17 sim) | 2026-06-17 21:20 ICT | 257905c | Yes (xcodebuild, scheme reactnativefxexample) |
| Android (Pixel_8 API 33 emu) | 2026-06-17 21:44 ICT | 257905c | Yes (gradlew assembleDebug) |

- iOS simulator: iPhone 17, iOS 26.0 (23A8464)
- Android emulator: sdk_gphone64_arm64, API 33 (Android 13)

## Platform architecture note (critical for reading results)

**iOS:** The FxPressHandler uses `UILongPressGestureRecognizer` with `shouldRecognizeSimultaneouslyWith → true` and `cancelsTouchesInView = false`. This means the **scroll view always receives touches and can always scroll**, regardless of whether the shader's recognizer self-fails. The axis-aware claiming affects only the shader's internal tracking (press event delivery, uniform updates), never scroll prevention. The simulator test tool (`swipe`/`gesture pan` via XCTest) has limited ability to observe recognizer-level state; scroll behavior is identical for all dragAxis values on iOS.

**Android:** The FxPressHandler uses `requestDisallowInterceptTouchEvent(true)` on `ACTION_DOWN`. When `shouldFail` returns false (axis claimed), `requestDisallowInterceptTouchEvent` remains `true` and the parent scroller is **blocked**. When `shouldFail` returns true (cross-axis dominates), disallow is released and the scroller scrolls. This makes **scroll prevention vs. allowance the primary observable** for axis-aware claiming on Android.

Because of this architectural difference, the scroll-based scenarios (S1–S5) are meaningful only on Android. iOS results are noted as "scroll-always-possible per simultaneous-recognition design."

## Scenario results

### S1 — Horizontal claim inside vertical scroller (dragAxis="horizontal")

| Platform | Test A: Horizontal drag → claimed, no scroll | Test B: Vertical drag → scroller scrolls |
|---|---|---|
| iOS | Confirmed no scroll change (but horizontal drag on vertical scroller is naturally inert) | Confirmed page scrolled (swipe: section heading scrolled off-screen) |
| Android | — (horizontal drag on vertical scroller always inert) | **PASS:** `gesture pan 540 800 0 -200 1000` → scroll content moved; "content above scroll-area hidden" appeared |

### S2 — Vertical claim inside horizontal scroller (dragAxis="vertical")

| Platform | Test A: Vertical drag → claimed, horizontal strip does NOT scroll | Test B: Horizontal drag → horizontal strip scrolls |
|---|---|---|
| iOS | Not reliably observable (scroll on text area bypasses shader recognizer via XCTest swipe) | Not reliably observable |
| Android | Not reliably observable (horizontal scroll position not reported via accessibility) | Not reliably observable |

**Note on S2:** The inner `HorizontalScrollView` scroll position cannot be queried through the accessibility tree. The FxSurfaceView inside it is not an individually hittable accessibility element. This test requires visual inspection on a real device or a logged instrument to confirm.

### S3 — Both axes (dragAxis="both", no yield)

| Platform | Any-direction drag → NEITHER scroller scrolls |
|---|---|
| iOS | Not observable (scroll always possible) |
| Android | **PASS:** `gesture pan 540 1850 0 -200 1000` on S3 surface → "Both axes" heading remained at y=1474 (no scroll). Contrast: the same gesture at the S1 surface (y=800) scrolled the page. |

**This is the decisive Android result.** The dragAxis="both" surface blocked the parent ScrollView from scrolling, while the dragAxis="horizontal" surface yielded the vertical cross-axis. See screenshots `android-s3-before-v2.png` and `android-s3-after-v2.png`.

### S4 — No regression (unset dragAxis)

| Platform | Any drag past slop yields to scroller |
|---|---|
| iOS | Not observable (scroll always possible) |
| Android | S4 surface position was partially off-screen behind tab bar; could not test cleanly with gesture pan. **Inconclusive for this spike.** (Earlier `gesture pan 540 800 0 200 1000` at a different scroll offset did scroll when S4 was visible — consistent with default yield.) |

### S5 — Inert without active mode (interactionMode="passive", dragAxis="horizontal")

| Platform | Identical to S4 — dragAxis is ignored |
|---|---|
| iOS | Not observable (scroll always possible) |
| Android | S5 surface position was off-screen behind tab bar; could not test cleanly with gesture pan. **Inconclusive for this spike.** |

## Watch-items

### W-F2 — Press semantics when dragging off the shape along the claimed axis

**iOS:** Tapped on S1 surface (dragAxis="horizontal") at (220, 329) — tap registered normally (`press 220 329` succeeded, no crash). Screenshot `ios-s1-tap.png` captured. Could not verify press continuation beyond shape via tooling (visual feedback of the dots shader requires real-device inspection).

**Android:** Not tested (requires visual inspection of shader press-depth feedback).

**Assessment:** The axis-aware path deliberately drops `containsInteractiveShape` in `shouldFail`. For the dots shader, this means a press that starts inside and drifts along the claimed axis continues delivering press events. The press state should not get stuck (the recognizer still fires `.ended` on touch-up). **No crash observed on either platform.** Final press-semantics judgment deferred to real-hardware Phase 2 verification.

### W-F3 — Android scroll-start catch on DOWN

**Observation:** On Android, `requestDisallowInterceptTouchEvent(true)` is called on `ACTION_DOWN` and released only on cross-axis-dominated `ACTION_MOVE`. Moving the finger vertically on the dragAxis="horizontal" surface at the top of the page caused the page to scroll — no perceptible hitch was observable through the tool (gesture pan at 1000ms duration produced smooth scroll). However, **emulator frame timing is NOT faithful for feel/jank judgment.** Treat any jank severity as PROVISIONAL.

## Limitations of this spike

1. **iOS XCTest swipe/gesture commands bypass gesture recognizers.** The `swipe` command scrolls the `XCUIElement` (scroll view) directly. The `gesture pan` command on iOS uses two-finger synthesis which may not trigger single-finger gesture recognizers. Neither is suitable for observing FxPressHandler recognizer-level behavior on iOS.

2. **Android FxSurfaceView coordinates must be estimated.** The custom native views do not appear in the accessibility tree. Surface positions are calculated from surrounding text label positions, which introduces coordinate uncertainty. Some scenarios (S2, S4, S5) could not be tested cleanly because surface y-positions landed off-screen or behind the tab bar.

3. **Emulator, not device.** The task's closing `device-verified` gate (Phase 2: drag/tilt uniforms + settle + coexistence) requires real hardware per the Device Verification Guide.

## SPIKE VERDICT

**The axis-aware claiming works on Android** — the decisive S3 test proves `dragAxis="both"` blocks parent-scroller scrolling while `dragAxis="horizontal"` yields the cross-axis. **Recommending: proceed to Phase 2.**

**iOS cannot be meaningfully evaluated** through automated simulator tooling due to the simultaneous-recognition architecture (`shouldRecognizeSimultaneouslyWith → true`, `cancelsTouchesInView = false`). The iOS implementation's correctness should be verified by:
1. Visual inspection of press/gesture continuity on a real device (W-F2)
2. The Phase 2 drag/tilt uniform write smoke test (drag offset updates natively)

**Caveats requiring human ratification:**
- S2, S4, S5 are untested on Android (coordinate uncertainty)
- W-F2 and W-F3 are deferred to real-hardware Phase 2
- The iOS code change (axis-aware `shouldFail` in `FxPressHandler.swift`) compiled and ran without crash on simulator, but its behavioral effect cannot be observed through XCTest tooling

## Evidence files

```
research/7-implementation/tasks/DEF-011/evidence/
├── device.md                          ← this file
├── ios-spike.mp4                      ← iOS session recording
├── ios-s1-top.png                     ← S1 initial state
├── ios-s1-tap.png                     ← S1 after tap
├── ios-s1a-before.png / after.png     ← S1A horizontal drag
├── ios-s1b-scrolled.png               ← S1B vertical → scrolled
├── ios-s2-before.png                  ← S2 initial
├── ios-s2a-vertical.png               ← S2A vertical swipe
├── ios-s2b-horizontal.png             ← S2B horizontal swipe
├── ios-s3-before.png                  ← S3 initial
├── android-s1-before.png              ← S1 initial
├── android-s1b-before.png / after.png ← S1B vertical gesture pan
├── android-s1b-scrolled.png           ← S1B after scroll
├── android-s3-before-v2.png           ← S3 decisive test before
├── android-s3-after-v2.png            ← S3 decisive test after (NO scroll!)
├── android-s3-before.png / -no-scroll.png  ← earlier S3 swipe test
├── android-s4-before.png              ← S4 initial
└── android-spike.mp4                  ← Android session recording
```
