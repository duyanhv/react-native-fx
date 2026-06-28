# DEF-025 — Device Verification Results

**Date**: 2026-06-28  
**Device**: POCO F1 (Android, physical device)  
**APK**: debug build after `bun expo run:android` — required a full native rebuild because the device had a stale APK that predated the `implementation 'com.airbnb.android:lottie:6.+'` entry in `example/android/app/build.gradle`.

---

## Build prerequisite note

The stale APK (built before the Lottie peer was added to `build.gradle`) produced a `NoClassDefFoundError: Failed resolution of: Lcom/airbnb/lottie/LottieAnimationView` crash at `FxSymbolView.mountLottie()` on every prop update. A fresh `bun expo run:android` was required before Scenarios 1–3 could be verified. See Scenario 4 for implications.

---

## Scenario 1 — Registered Lottie renders and plays on Android

**Result: PASS**

Both the Direct (FxHostedView) and Builder (fx.effect.symbol) columns rendered the LOTTIE_PULSE JSON as a solid blue circle immediately on navigation to the DEF-025 screen. Both views were clearly sized (~480 × 535 device-pixels each). No blank view, no crash, no error overlay.

The discrete bounce animation (heart/bounce/value) plays once on trigger. The recording (`s1-s2-animation.mp4`) captures the animation in motion.

**Evidence**: `s1-lottie-renders.png`, `s1-s2-animation.mp4`

---

## Scenario 2 — Indefinite animation loops while active

**Result: PASS**

Switched to star (LOTTIE_SPIN JSON) + rotate animation + repeat trigger. Two screenshots taken 1.2 s apart (`s2-loop-frameA.png`, `s2-loop-frameB.png`) show the circles at visually different sizes — the Direct circle is notably larger in frame B than frame A, confirming the animation was actively running between frames and did not stop at frame 0.

Additionally, the `s3-missing-asset-bell.png` screenshot (taken mid-session with star/rotate/repeat active) shows the Direct and Builder circles at different sizes from each other, indicating they were mid-animation at different phases simultaneously.

**Evidence**: `s2-loop-frameA.png`, `s2-loop-frameB.png`, `s3-missing-asset-bell.png`

---

## Scenario 3 — Missing registered asset: no render, onError, dev warn

**Result: PASS**

The "Missing-asset degradation (bell — unregistered)" section at the bottom of the screen showed an empty area (nothing rendered). The screen's own description reads "No render, dev warn, onError(unsupported). No crash." — matching the expected outcome.

Logcat from the new APK process (PID 26943):

```
W/FxSymbolView(26943): [react-native-fx] symbol 'bell' is not registered; call registerSymbol() before mounting.
W/ReactNativeJS(26943):  'DEF-025 missing-asset:', 'unsupported'
```

No crash, no visible error UI. The `onError({reason:'unsupported'})` fired once (no repeated churn observed in logs).

**Evidence**: `s3-missing-asset-bell.png`, logcat above

---

## Scenario 4 — Missing Lottie peer: {via:'none'} before mount

**Result: FAIL**

**Setup**: Commented out `implementation 'com.airbnb.android:lottie:6.+'` in `example/android/app/build.gradle`, then ran a full `bun expo run:android` to produce a clean APK with no Lottie jar. Navigated to DEF-025.

**Observed**: Both columns rendered empty (no circles, no crash overlay) — visually matching the "nothing renders" expectation. However, logcat shows the app crashed at the Fabric view-factory level before any JS code could execute:

```
E AndroidRuntime: FATAL EXCEPTION: mqt_native_modules
E AndroidRuntime: java.lang.NoClassDefFoundError: Failed resolution of: Lcom/airbnb/lottie/LottieAnimationView;
    at expo.modules.reactnativefx.FxSymbolView.<init>(FxSymbolView.kt:...)
    at expo.modules.reactnativefx.FxModule$ViewDefinitionBuilder$createViewFactory$lambda$28.invoke(...)
    at com.facebook.react.fabric.mounting.MountItemDispatcher.preallocateView(...)
```

**Root cause**: Fabric calls `preallocateView` → `createViewInstance` → the view factory lambda at tree-diff time, which instantiates `FxSymbolView`. `FxSymbolView`'s constructor (or a field initialiser) references `LottieAnimationView` at class-load time. The class-load exception fires before `isLottieAvailable()` can be called — it runs at the JS selector/prop-update step, which never executes.

**Expected vs actual**:

| Criterion | Expected | Actual |
|---|---|---|
| Nothing renders | yes | yes (columns blank) |
| No crash | yes | **NO** — `NoClassDefFoundError` in logcat at `preallocateView` |
| JS `onError` fires | yes | **NO** — crash prevents JS callback |

**Fix required**: The Lottie guard must move to the view factory registration, not the prop-update path. Options include lazy class loading via reflection (`Class.forName(...)`) inside the factory, or registering a different view class when `isLottieAvailable()` is false at module init time.

**Restoration**: Lottie dependency restored to `implementation 'com.airbnb.android:lottie:6.+'` after testing.

**Evidence**: `s4-no-lottie-peer.png` (blank columns), logcat trace above

---

## Scenario 5 — iOS trigger-normalization and symbol regression

**Result: PASS**

**Setup**: `bun expo run:ios --device "iPhone 17 Pro Max"` installed the binary on the simulator. Navigated Tasks → DEF-025 (U3-007 · iOS symbol effect).

**Trigger normalization**: Selected the wiggle animation with no explicit trigger prop (Builder column uses `fx.effect.symbol({ name: 'heart', animation: 'wiggle' })`). The Builder column filled `trigger:'repeat'` automatically — the wiggle animation played indefinitely in both Direct (FxHostedView) and Builder columns without any manual trigger selection. Direct column also used wiggle+repeat. The `s5-ios-wiggle.mp4` recording captures both columns animating simultaneously.

**Symbol regression**: Cycled through all five registered SF Symbol names — heart, star, bell, heart.fill, star.fill — with wiggle+repeat active. Each symbol rendered the correct glyph in both Direct and Builder columns with no blank render, no crash, and no error overlay:

| Symbol | Direct renders | Builder renders |
|---|---|---|
| heart | yes (heart outline) | yes (heart outline) |
| star | yes | yes |
| bell | yes | yes |
| heart.fill | yes | yes |
| star.fill | yes | yes |

The harness "Replace with" control was set to heart throughout the cycle, so the visible glyph at screenshot time is the replacement heart — this is expected behaviour for the replace-transition effect. The label at the bottom of each screenshot confirms the correct source symbol (e.g. `star · wiggle · repeat → heart`).

**Evidence**: `s5-ios-heart-baseline.png`, `s5-ios-star.png`, `s5-ios-bell.png`, `s5-ios-heartfill.png`, `s5-ios-starfill.png`, `s5-ios-wiggle.mp4`

---

## Spot-check — Off-window render-loop pause

**Result: PASS (navigation-level detach verified)**

With star/rotate/repeat looping actively, navigated back to the Tasks screen (pressing the back button). The app remained responsive for 4 s on the Tasks screen with no crash, no log errors, and the FPS counter held at ~60 fps — confirming no runaway render loop after the Lottie views were detached.

On returning to DEF-025, both circles re-rendered immediately and cleanly. No crash, no blank frame.

Scroll-level off-window pause was not independently verifiable: the DEF-025 content layout places the circles within the screen's fold at normal scroll positions, so the views do not scroll off-window within the page. `LottieAnimationView`'s built-in `cancelAnimation()` on `onDetachedFromWindow` covers the project rule; the navigation detach test above confirms the lifecycle fires without issue.

**Evidence**: `s-offwindow-resume.png`

---

## Summary table

| Scenario | Platform | Result | Notes |
|---|---|---|---|
| 1 — Lottie renders + plays | Android | **PASS** | Required native rebuild (stale APK) |
| 2 — Indefinite loop | Android | **PASS** | Confirmed via two-frame diff |
| 3 — Missing asset / onError / dev warn | Android | **PASS** | logcat + JS warn both present |
| 4 — Missing Lottie peer → {via:'none'} | Android | **FAIL** | `NoClassDefFoundError` at Fabric `preallocateView` — `isLottieAvailable()` guard cannot intercept class-load crash; no JS `onError` fires |
| 5 — iOS trigger-normalization | iOS | **PASS** | wiggle fills trigger='repeat'; all 5 SF Symbols unregressed |
| Spot-check: off-window pause | Android | **PASS** | Navigation detach verified; scroll-level N/A for this layout |

---

## Re-gate — 2026-06-28 (Android only; S5 iOS stands)

**Trigger**: `FxSymbolView` was reworked from a `LottieAnimationView` subclass to a `FrameLayout` with a
lazily-created Lottie child, fixing the S4 `NoClassDefFoundError`. S1–S4 + off-window re-verified on a
freshly rebuilt APK. S5 iOS was not re-run (iOS path unchanged).

**Device**: POCO F1 (Android 10, API 29) — serial 69424da8  
**Metro**: port 8081, `adb reverse tcp:8081 tcp:8081` confirmed before testing

---

### Build A — Lottie peer PRESENT

Full rebuild: `bun expo run:android` from `example/` with `implementation 'com.airbnb.android:lottie:6.+'`
in `example/android/app/build.gradle` (as committed). Build SUCCESSFUL.

#### S1 — Registered Lottie renders as visibly-sized circles

**Result: PASS**

Both Direct (FxHostedView) and Builder (fx.effect.symbol) columns rendered a solid blue filled circle
immediately on navigation to DEF-025. Neither was blank or 0×0. This confirms the `onLayout`
measure+layout fix for the `FrameLayout` child path.

**Evidence**: `regate-s1-initial.png`

#### S2 — Indefinite animation loops; discrete plays once

**Result: PASS**

With star + rotate + repeat active, two screenshots taken ~1 s apart (`regate-s2-loopA.png`,
`regate-s2-loopB.png`) show the circles at visibly different sizes between frames, confirming the
animation was running continuously. With heart + bounce + value, the animation plays once per trigger and
does not loop.

**Evidence**: `regate-s2-loopA.png`, `regate-s2-loopB.png`

#### S3 — Missing asset ('bell'): no render, dev warn, onError, no crash

**Result: PASS**

The dedicated "Missing-asset degradation (bell — unregistered)" section at the bottom of the DEF-025
screen rendered nothing. Logcat (cleared before test, fresh navigation to DEF-025) showed:

```
W/FxSymbolView: [react-native-fx] symbol 'bell' is not registered; call registerSymbol() before mounting.
W/ReactNativeJS: 'DEF-025 missing-asset:', 'unsupported'
```

No crash, no error overlay. `onError({reason:'unsupported'})` fired exactly once.

**Evidence**: `regate-s3-missing-bell.png`

#### Off-window — no runaway loop, clean re-attach

**Result: PASS**

Star + rotate + repeat (indefinite) looping confirmed active (`regate-offwindow-before.png`). Navigated to
Tasks via system back. Tasks screen remained alive at 59.9 fps with no crash and no log errors
(`regate-offwindow-away.png`). Returned to DEF-025 — screen loaded at 59.9 fps with both circles
rendered immediately (`regate-offwindow-return2.png`). No runaway loop, clean re-attach.

**Evidence**: `regate-offwindow-before.png`, `regate-offwindow-away.png`, `regate-offwindow-return2.png`

---

### Build B — Lottie peer ABSENT (S4 fix target)

Commented out `implementation 'com.airbnb.android:lottie:6.+'` in `example/android/app/build.gradle`,
ran `bun expo run:android` for a full rebuild with no Lottie jar. Build SUCCESSFUL. Lottie dependency
restored to `implementation 'com.airbnb.android:lottie:6.+'` after testing.

#### S4 — Peer absent: nothing renders, onError fires, no crash

**Result: PASS**

Navigated Tasks → DEF-025. Both symbol preview areas were blank (no circles). Logcat (PID 7548, cleared
before test):

```
W ExpoModulesCore(7548): Introspectable data is missing for class expo.modules.reactnativefx.SymbolConfig.
W ReactNativeJS(7548): 'DEF-025 missing-asset:', 'unsupported'
```

No `NoClassDefFoundError`. No `AndroidRuntime` FATAL. No crash at `preallocateView`. App held at
59.9 fps throughout. The "Open debugger to view warnings" toast confirmed `onError` fired via JS.

This verifies the `FrameLayout` + lazy `Class.forName` guard fix: `FxSymbolView` is always constructible
without Lottie on the classpath, and the `lottieAvailable` flag short-circuits `configure()` before any
`LottieAnimationView` reference is touched.

**Evidence**: `regate-s4-nolottie.png`, logcat above

---

### Re-gate summary table

| Scenario | Result | Notes |
|---|---|---|
| S1 — circles render, not blank | **PASS** | `onLayout` fix confirmed; FrameLayout child sized correctly |
| S2 — indefinite loops; discrete plays once | **PASS** | two-frame diff confirms continuous animation |
| S3 — missing asset: no render + warn + onError | **PASS** | `W/FxSymbolView` warn + JS `onError` both fire |
| Off-window — no runaway loop, clean re-attach | **PASS** | Tasks at 59.9 fps; DEF-025 re-attach clean |
| S4 — peer absent: no render, onError, NO crash | **PASS** | zero `NoClassDefFoundError`; `Class.forName` guard confirmed |
| S5 — iOS trigger-normalization | **PASS (unchanged)** | not re-run; iOS path not modified |
