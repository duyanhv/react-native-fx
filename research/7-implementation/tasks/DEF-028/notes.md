# DEF-028 notes

## Fixed before device gate

- **Android construction crash fixed** — `SpringAnimation(FloatValueHolder).spring` is null until a
  `SpringForce` is installed. `FxRevealView` now assigns `SpringForce().apply { ... }` before setting
  chrome spring stiffness/damping, so the constructor no longer dereferences a null spring.
- **Unproven child-routing rework removed** — the prior `updateViewLayout`/bulk-remove routing patch
  came from fallback-layout evidence captured while `FxRevealView` failed to construct. Keep the
  diff minimal until a real constructing-view device gate proves a routing bug.
- **Android chrome damping corrected** — chrome springs were `DAMPING_RATIO_NO_BOUNCY`; corrected to
  `DAMPING_RATIO_MEDIUM_BOUNCY` to match the geometry driver default (`FxAnimationDriver.kt:107`).
  With mismatched damping the transform bounces while the radius glides, causing visible desync at the
  settle tail and on interrupted retargets.
- **Radii exaggerated for G1 visibility** — coordinator constants bumped to collapsed=20pt/dp,
  expanded=36pt/dp (from 12/20). An 8pt delta on a small card makes elliptical vs circular corners
  hard to spot mid-morph; the larger delta makes G1 unmistakable. Tune back to final product values
  after the gate confirms the mechanic. Example card `borderRadius` updated to 20 to match the
  collapsed chrome endpoint.

## Unverified claims (device-only)

- **Android mount-smoke.** Headless gates compile the constructor but do not instantiate the Android
  Expo view. The maintainer must confirm no `Couldn't create view` / `InvocationTargetException` /
  `SpringForce.setStiffness` crash appears in logcat and that the screen renders one collapsed card.
- **Android first-mount collapsed position.** Prior bounds were captured while Android had fallen
  back to raw stacked slot Views. The maintainer must judge first-mount position only after the
  mount-smoke row proves `FxRevealView` constructs.
- **G1 — round-corner fidelity under non-uniform morph.** The CA mask path animation on iOS
  and the spring-driven outline on Android are designed to stay circular, but visual verification
  under the actual scaleX≠scaleY flight requires the device gate.
- **G4 — chrome/transform retarget sync.** On iOS the geometry driver switches to a display-link
  integrator on retarget; the chrome uses a separate CASpringAnimation. The visual lock-step is
  expected (same spring constants) but not proven — device gate G4.
- **G2/G3 — clip overflow and clipped touch (Android).** `ViewOutlineProvider`+`clipToOutline`
  is visually-only (does not restrict touch bounds); G3 should trivially pass since `TouchTargetHelper`
  uses layout bounds, not clip bounds. G2 is device-proven only.
- **iOS < 17 degradation.** Below iOS 17 the motion ladder is empty; the chrome snaps to the
  target on initial seat. Unverified without a sub-17 device.

## What changed

- `manifest.ts` — added `cornerRadius` IR channel to `motion.properties`.
- `FxRevealView.swift` — layer split: `chromeLayer` outer chrome/clip boundary added;
  `expandedContainer` moved inside it; `CAShapeLayer` mask added; `snapChrome`/`animateChrome`
  methods added; `hitTest` updated.
- `FxRevealCoordinator.swift` — chrome calls added alongside every geometry call;
  `collapsedRadius`/`expandedRadius` constants; `collapsedChrome()`/`expandedChrome()` helpers.
- `FxRevealView.kt` — layer split: `FxRevealChromeContainer` inner class; `chromeContainer`
  wraps `expandedContainer`; `FloatValueHolder`/`SpringAnimation` chrome drivers;
  `snapChrome`/`animateChrome` methods; `addView` passthrough updated; `onLayout`/`onMeasure`
  updated; `shouldReduceMotion()` helper.
- `FxRevealView.kt` construction fix — assigns `SpringForce` to each chrome `SpringAnimation` before
  setting stiffness/damping.
- `FxRevealCoordinator.kt` — chrome calls added alongside every geometry call; density-aware
  radius constants; `collapsedChrome()`/`expandedChrome()` helpers.
- `reveal-conformance.test.ts` — three new assertions guarding the IR-channel contract.
- `example/screens/reveal.tsx` — labels updated to mention step 2.

## Known residuals (non-blocking)

- **`shouldReduceMotion()` duplication** — `FxRevealView.kt` carries its own copy of the logic
  that lives in `FxAnimationDriver.kt:177`. Both copies are functionally identical and consistent;
  the duplication is harmless today. A clean refactor (extract to an internal top-level function or
  a companion object) is a natural follow-on once a third caller appears.

## Next

Next: maintainer Android re-gate (mount-smoke → first-mount bounds → G1–G6) and iOS smoke → planner docs-closed.
