# DEF-027 — device gate runbook (maintainer)

Step 1, the geometric spine. The executor reached headless-done; this is the device proof the
executor cannot close. Square/unclipped corners are accepted (no radius morph/clip in step 1).

Screen: example app → tasks list → **DEF-027 · FxReveal** (`example/screens/reveal.tsx`).
Run Android first for the rework rows below, then iOS smoke. The executor reached rework
headless-done (round 2 — reveal-host); the touch claims still need device proof.

## Round-3 fix headless update (2026-06-29 — host-sized expanded slot)

Headless gates passed after fixing the JS expanded-slot sizing (host `onLayout`) and updating row 9:

- `cd packages && bun run lint`
- `cd packages && bun run build`
- `cd packages && bun run test` (Jest): 187/187
- `cd example && bun x tsc --noEmit`
- `cd example/android && ./gradlew :react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL
- `cd example/android && ./gradlew :app:assembleDebug` BUILD SUCCESSFUL
- `cd example/ios && xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -destination "platform=iOS Simulator,name=iPhone 17 Pro" build` BUILD SUCCEEDED

## Round-2 rework headless update (2026-06-29 — reveal-host rework)

Headless gates passed after the reveal-host rework (app-placed host; fill-host + collapsed-slot-frame
model, both platforms):

- `cd packages && bun run lint`
- `cd packages && bun run build`
- `cd packages && bun run test` (Jest): 187/187
- `cd example && bun x tsc --noEmit`
- `cd example/android && ./gradlew :react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL
- `cd example/android && ./gradlew :app:assembleDebug` BUILD SUCCESSFUL
- `cd example/ios && pod install`
- `cd example/ios && xcodebuild -workspace reactnativefxexample.xcworkspace -scheme reactnativefxexample -configuration Debug -destination "platform=iOS Simulator,name=iPhone 17 Pro" build` BUILD SUCCEEDED

Re-gate rows (supersede round-1 rows R1–R6 above; R6 no-placement-prop carries forward):

| # | scenario | expected | pass? |
|---|----------|----------|-------|
| W1 | **Android collapsed-card tap opens (host model).** With the panel closed, tap *Ask anything…*. | The card's Pressable fires and the reveal opens. `FxRevealView` is `BOX_NONE`; `collapsedContainer` is `BOX_NONE`; `TouchTargetHelper` descends into the collapsed card. | |
| W2 | **Android Shutter tap increments (host model).** With the panel open, tap *Shutter*. | The counter increments. The expanded layer is `VISIBLE` and `BOX_NONE`; `TouchTargetHelper` finds the Shutter at its native host-local position within `expandedContainer`. | |
| W3 | **Android Shutter sits above the tab bar.** Open the panel and check the Shutter position. | Shutter is visible and tappable above the tab bar — the expanded panel is within the host which spans the full screen, not clipped by a smaller ancestor. | |
| W4 | **Non-content taps fall through.** With the panel open, tap the controls area at the top of the screen (Open/Close button). | The button press fires — the `BOX_NONE` overlay lets non-content taps fall through to the app behind it. | |
| W5 | **Android previously passing rows unregressed.** Re-run rows 1, 2, 3, 4b, 5, 6, 7 on Android. | Geometry, no-reflow, cross-fade, closed-state-not-touchable, interruption ordering, background pause, reduce-motion still pass. | |
| W6 | **iOS regression smoke.** On iOS, tap *Ask anything…*, then tap *Shutter*. | Card tap opens + Shutter increments. iOS changes: `collapsedFrameInShell()` reads slot frame; `layoutSubviews` collapsed-children loop removed; `resolvedPlacementRect` is host-local; `hitTest` filters containers. Verify geometry/sharpness/cross-fade unregressed. | |
| W7 | **Non-content taps fall through — both platforms.** With the panel open, tap an area of the screen that has no collapsed card or expanded panel content (e.g. the top 40% of the screen). | The tap reaches the controls/buttons behind the overlay; nothing in the reveal intercepts it. iOS: the `hitTest` container filter passes through. Android: the `BOX_NONE` shell passes through. | |

### Device gate results — W1–W7 PASS, both platforms (planner-driven, agent-device, 2026-06-29)

Re-gated on iPhone 17 Pro / iOS 26.5 + POCO F1 / Android API 35 (dev builds via Metro):

- **W1 PASS (Android):** collapsed-card tap opens the camera.
- **W2 PASS (Android):** Shutter tap increments the counter **0→2** through the reveal — the headline fix; expanded content is now in the AX tree (was absent).
- **W3 PASS (Android):** Shutter sits **above** the tab bar (size-authority fixed) — `evidence/device-run-android/reveal-host-shutter-works.png`.
- **W4/W7 PASS:** non-content taps fall through the `BOX_NONE` overlay to the controls behind.
- **W5 PASS (Android):** geometry, no-reflow, cross-fade, closed-state-not-touchable, interruption ordering, background, reduce-motion unregressed.
- **W6 PASS (iOS):** card-tap opens + Shutter increments **0→2** after the iOS fill-host change — regression clean. `evidence/device-run-ios/reveal-host-collapsed.png`.

Bounded re-gate still owed for the pre-merge tightening (initial-visibility / `open=true` seating):

| # | scenario | expected | pass? |
|---|----------|----------|-------|
| W8 | **Initial `open=true` in a non-full-window host — no wrong-size flash.** Mount the reveal already `open=true` inside a *non-full-window* host (a host smaller than the screen). | No first-frame flash of the expanded subtree at the wrong (window) size: the expanded wrapper is `0×0`/non-visible until `onLayout` supplies host size, then it sizes to `{ host.width, host.height/2 }` and the revealed content is correctly sized **and touchable**. | **PASS both** |

**W8 PASS — both platforms (planner-driven, agent-device, 2026-06-29).** Activated the example's "W8: ON" toggle (swaps the full-window host for a `height:420` non-full-window host with `FxReveal` mounted `open=true`). On both POCO F1 / Android API 35 and iPhone 17 Pro / iOS 26.5: the expanded panel renders **bounded within the host** (not window-sized — no full-screen wrong-size flash; `expand finished=true`), and the **Shutter is touchable** (Android counter 0→2, iOS 0→1) after layout. Evidence: `evidence/device-run-android/w8-non-full-host.png`, `evidence/device-run-ios/w8-non-full-host.png`. The JS window-size fallback is removed and both coordinators defer expanded visibility until host geometry resolves, so the artifact is gone by construction.

## Rework headless update (2026-06-29)

Headless gates passed after the Android touch rework + public API change:

- `cd packages && bun run lint`
- `cd packages && bun run build`
- `cd packages && bun run test` (Jest): 187/187
- `cd example && bun x tsc --noEmit`
- `cd example/android && ./gradlew :react-native-fx:compileDebugKotlin`
- `cd example/android && ./gradlew :app:assembleDebug`
- `cd example/ios && pod install`
- `cd example/ios && xcodebuild -workspace reactnativefxexample.xcworkspace -scheme
  reactnativefxexample -configuration Debug -destination "platform=iOS Simulator,name=iPhone 17
  Pro" build`

Rows added for the re-gate:

| # | scenario | expected | pass? |
|---|----------|----------|-------|
| R1 | **Android collapsed-card tap opens.** With the panel closed, tap *Ask anything…* inside the collapsed card. | The card press fires `setOpen(true)` and the camera stand-in reveals. This proves Android descends through `FxRevealView` into hosted Pressables for an in-bounds tap. | |
| R2 | **Android Shutter tap increments.** With the panel open, tap *Shutter*. | The counter increments through the revealed content. This proves the expanded slot's reachable hit region + host-local coordinates. | |
| R3 | **Android Shutter sits above the tab bar.** Open the panel and inspect the Shutter position. | The Shutter is visible and tappable above the tab bar, not hidden under it. | |
| R4 | **Android previously passing rows unregressed.** Re-run rows 1, 2, 3, 4b, 5, 6, and 7 on Android. | Geometry, no-reflow, cross-fade, closed-state-not-touchable, interruption ordering, background pause, and reduce-motion still pass. | |
| R5 | **iOS regression smoke.** On iOS, tap *Ask anything…*, then tap *Shutter*. | The card tap still opens the reveal and Shutter still increments. No iOS file changed for this rework. | |
| R6 | **No public `placement` prop.** In app code, inspect `FxRevealProps` or try `<FxReveal placement="bottom-half" />`. | TypeScript rejects the prop; `preset="anchoredMorph"` owns the bottom-half target. Native placement plumbing remains private/defaulted. | |

## Build + install

- iOS: `cd example/ios && pod install` (new Swift files), then run the example on a device /
  simulator. Test on **iOS 26** and, if available, an **iOS 16/<17** device for the degradation row.
- Android: `cd example/android && ./gradlew :app:assembleDebug && adb install -r <apk>` (per the
  Android build gotcha — `expo run:android` can leave a stale APK). Verify the APK timestamp.

## Rows

| # | scenario | expected | pass? |
|---|----------|----------|-------|
| 1 | **Geometry + sharpness.** Tap *Open*. | The card grows into the bottom-half panel along the inverse transform; the expanded content is **sharp at target size** (rasterized at the placement size, not upscaled/blurry). Corners may be square. | |
| 2 | **No sibling reflow.** Watch the "sibling row" text above the shell during open/close. | It never moves — the expanded panel is an fx-owned overlay, not a layout write. | |
| 3 | **Content cross-fade.** Open and close slowly. | The collapsed card fades out as the expanded panel fades in (and the reverse on close); no hard cut between the two layers. | |
| 4 | **Camera-stand-in touch survives.** With the panel open, tap *Shutter*. | The counter increments — touch reaches the revealed content through the reveal. On Android, confirm both the visual hit region and coordinates after the rework. | |
| 4b | **Hidden content not touchable (closed).** With the panel closed, tap where the expanded panel *would* be (the bottom half). | Nothing happens — the expanded layer is gated non-interactive (`isHidden`/`INVISIBLE`) while collapsed, so the invisible content does not intercept taps. The taps reach whatever is behind the reveal. | |
| 9 | **Safe-area / notch.** Open on a device with a home indicator / notch. | The placement + content size agree (no gap or overspill at the bottom edge). Native resolves placement from host bounds (host-local); JS sizes the expanded slot from `FxRevealView`'s own `onLayout` — both read the same host, so they agree even for non-full-window hosts. | |
| 10 | **Rotation / split-screen.** Open, rotate the device (and try split-screen on a tablet). | The panel re-seats to the new bottom-half (the layout pass re-resolves geometry). Note any size mismatch between content and container after the change. | |
| 5 | **Interruption.** Rapid-toggle *Open*/*Close* mid-flight. | The motion retargets cleanly (no jump-to-start). `onTransitionEnd` logs the cut-short phase with `interrupted=true` **before** the retargeted phase settles; exactly one settled completion per phase, correct phase name. | |
| 6 | **Off-window / background pause.** Open the panel mid-flight, background the app, foreground it. | No animation runs while backgrounded; on return the view shows the settled state (no frame loop off-window). | |
| 7 | **Reduce-motion → instant.** Enable Reduce Motion (iOS) / set animator scale 0 (Android), toggle *Open*/*Close*. | The placement is correct with no animation — an instant cut, both directions. | |
| 8 | **iOS < 17 degradation** (code-reasoned if no device). | No `SwiftUI.Spring` below iOS 17 → instant cut to the correct placement, no animation. Geometry still correct. | |

## What to capture

- A short screen recording of rows 1, 3, 5 (the morph, the cross-fade, the interruption).
- The `onTransitionEnd` log lines for row 5 (phase + finished + interrupted ordering).
- For row 4 on Android: a note on exactly where touch lands vs misses (the overflow-region limit).
- Any clipping of the expanded panel by an ancestor on Android (row 1).

## Size authority after the Android rework

Android now sizes the native expanded slot from the laid-out expanded child when that size is
available, then resolves the bottom-half target from native coordinates. iOS keeps the previously
device-passing behavior. Capture rows 9–10 so docs-closed can decide whether the same
single-authority shape should be ratified cross-platform now or deferred.

## If the open mechanic fails the gate

Android now keeps the expanded child in host-local placement coordinates while the host/layers opt
into the RN pointer-events contract. If the maintainer still sees clipping or lost overflow-region
touch, the next fix is a true higher root/overlay host, and `structure.android` records that form at
docs-closed. iOS is expected to pass as-is.
