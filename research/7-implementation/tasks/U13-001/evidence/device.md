# U13-001 device verification — FxPressable

Date: 2026-06-20  
Branch: integration/0.1.x  
Commit: b7a3edd  
Build type: Native rebuild (pod install + example:ios/android)

---

## iOS Simulator — iPhone 17 Pro (iOS 18)

Device: iPhone 17 Pro simulator, iOS 18

### A. MOUNT
**PASS.** Screen renders without redbox/crash. FxPressable "Press Me" button visible in section 1, "Scroll Yield Test" button visible in section 2, semantic log renders below.  
Screenshot: `ios-u13-001-screen.png`

### C. EVENT ORDER (tap, release)
**PASS.** Tap on "Press Me" button → semantic log (newest first) shows:
```
onPress
onPressOut
onPressIn
```
Actual order (oldest→newest): `onPressIn → onPressOut → onPress` ✓  
Screenshot: `ios-u13-event-order.png`

### B. FEEDBACK (press-and-hold)
**PARTIAL.** Visual feedback (scale + opacity) appears to be applied, but long-press behavior needs verification.  
Screenshot: `ios-u13-longpress.png`

### D. LONG-PRESS (hold ~0.5s, release)
**UNVERIFIED.** Executed long-press; semantic log still shows only the prior tap events. Need to confirm if `onLongPress` fires and if it suppresses `onPress`.

### E. CANCELLATION / SCROLL-YIELD
**UNVERIFIED.** Scroll-yield test (section 2, drag vertically) and out-of-bounds cancellation (section 1, drag outside) not yet tested.

### F. RAPID RE-PRESS
**UNVERIFIED.** Multiple rapid taps not tested; visual state glitches not assessed.

### G. NO-REGRESSION
**UNVERIFIED.** U10-001 effect-surface interactive shader (dots) press path not verified on iOS.

---

## POCO F1 — Android (physical device)

Device: POCO F1 physical device

### A. MOUNT
**PASS.** Screen renders without crash. "Press Me" button visible as a black square (no visual styling). "Scroll Yield Test" in inner ScrollView. Semantic log renders below.  
Screenshot: `android-u13-001-screen.png`

### C. EVENT ORDER (tap, release)
**PASS.** Tap on "Press Me" button → semantic log (newest first) shows:
```
onPress (504)
onPressOut (504)
onPressIn (472)
```
Actual order (oldest→newest): `onPressIn → onPressOut → onPress` ✓  
Screenshot: `android-u13-tap.png`

### B. FEEDBACK (press-and-hold)
**FAIL.** FxPressable on Android renders as a plain black square with NO visual feedback (no scale, no opacity, no material ripple). The button does not scale down or dim on press. No visual indication of press state.  
Expected: Material ripple animation from touch point or opacity/scale change.  
Observed: Static black square, no animation on press/release.

### D. LONG-PRESS (hold ~0.5s, release)
**UNVERIFIED.** Event pipeline fires but long-press-specific behavior not tested on Android.

### E. CANCELLATION / SCROLL-YIELD
**UNVERIFIED.** Scroll-yield test and out-of-bounds cancellation not yet tested.

### F. RAPID RE-PRESS
**UNVERIFIED.** Multiple rapid taps not tested.

### G. NO-REGRESSION
**UNVERIFIED.** U10-001 effect-surface interactive shader press path not verified on Android.

---

## Summary Table

| Check | Description | iOS Pass? | Android Pass? |
|-------|-------------|-----------|---------------|
| A | MOUNT: renders without crash, buttons visible | **PASS** | **PASS** |
| B | FEEDBACK: visual press response (scale/ripple) | **PARTIAL** | **FAIL** |
| C | EVENT ORDER: onPressIn → onPressOut → onPress | **PASS** | **PASS** |
| D | LONG-PRESS: fires onLongPress, suppresses onPress | **UNVERIFIED** | **UNVERIFIED** |
| E | CANCELLATION/SCROLL-YIELD: press yields to scroll | **UNVERIFIED** | **UNVERIFIED** |
| F | RAPID RE-PRESS: no glitches, visual state stable | **UNVERIFIED** | **UNVERIFIED** |
| G | NO-REGRESSION: U10-001 interactive shader works | **UNVERIFIED** | **UNVERIFIED** |

---

## Critical Findings

**Android Visual Feedback BROKEN:** The FxPressable component on Android is rendering as a static black square with NO visual feedback on press. The event pipeline (onPressIn/Out/Press) fires correctly, but the visual press feedback mechanism is completely absent. This is load-bearing for UX — users will not perceive that their press registered.

**iOS Feedback Status:** Appears functional but needs full verification including long-press event separation and visual animation confirmation.

**Event Pipeline:** Both platforms fire the correct event sequence in the correct order (onPressIn → onPressOut → onPress for normal tap). This path is proven on both iOS and Android.

---

## Next Steps (for maintainer)

1. **Critical:** Investigate Android FxPressable visual feedback rendering — why is the black square not animating with scale/opacity on press?
2. Verify iOS long-press fires onLongPress event separately and suppresses onPress.
3. Complete scroll-yield cancellation tests on both platforms.
4. Rapid re-press stress test.
5. Verify U10-001 interactive shader no-regression on both platforms.

---

## Reviewer addendum (planner, 2026-06-20)

**Positive, load-bearing:** check C (EVENT ORDER) PASSED on BOTH platforms — `onPressIn → onPressOut → onPress` — which proves the `onFx`-prefixed event pipeline (the `Events(...)` re-declaration + JS mapping) fires correctly at runtime. That was the highest-risk item; it works.

**Android black-square root cause (fixed `88d9622`).** The `RippleDrawable` was constructed as `RippleDrawable(color, ShapeDrawable(), null)` — the default `ShapeDrawable()` was passed as the **content** layer (2nd arg), which paints an opaque black fill over the wrapped button. Fixed to `RippleDrawable(color, null, ShapeDrawable())` — null content, `ShapeDrawable()` as the **mask** (3rd arg) — so the foreground is transparent at rest and bounds the ripple to the view. Android `assembleDebug` BUILD SUCCESSFUL. (Note: on Android the spec feedback is the ripple only — no scale/opacity — so "no scale" on Android is expected; the failure was the black overlay + absent ripple.)

**Gate status:** PARTIAL — A/C confirmed both platforms; B failed on Android (now fixed in code, **visual re-gate owed**); D/E/F/G were left unverified (time). A full re-gate is required: re-confirm B on Android (ripple now visible, no black square), and complete D (long-press suppresses onPress), E (scroll-yield → onPressOut only), F (rapid re-press), G (`<Fx interactionMode>` no-regression) on both platforms.
