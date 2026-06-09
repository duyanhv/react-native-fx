# U6-001 — iOS spring preflight (design disposition, not closure)

A spec-time `references-preflight` (per `agents/references-preflight.md`) on the `FxAnimationDriver`
content lane. Resolves the design question behind **RT-016** (animator sufficiency) before U6-001 is
built. This is the *design disposition* only — RT-016 stays `device-pending` and is closed by **U6-002**
on device. No source doc, ledger row, or tracker state was changed by this preflight.

Status: U6-001 is `todo`, blocked by U5-001. This artifact exists so the work is not lost; act on it
when U6-001 is picked up.

## The verdict question (RT-016)

Do stock platform springs retarget cleanly mid-flight (velocity preserved, no snap), or is a custom
displacement integrator required — on a Fabric-untracked intermediate container (`expo-view` plain view)?

## Disposition

- **Android — stock, validated.** `androidx.dynamicanimation.SpringAnimation` + `animateToFinalPosition()`
  is documented to retarget the running animation as "continuous movement since last frame" (value +
  velocity carried). No custom integrator. Matches the primitive already named in `structure.android.md`.

- **iOS — render-server-first, integrator-on-retarget.** Not a flat integrator. The fire-once case
  (the overwhelming majority of presence/state envelopes) should use the **declarative render-server
  path** — the iOS-17 unified spring (`UIView.animate(springDuration:bounce:)` / `CASpringAnimation`
  with Apple's defaults) — because committed Core Animation runs in the **render server**, off the app's
  main thread, which is where Apple's smoothness-under-load comes from. Drop to a **`CADisplayLink`
  integrator only when an actual mid-flight target change occurs** (capture presentation-layer state,
  hand off). Most transitions never leave the render-server path.

- **The integrator branch — `FxSpring` facade, modern-first with fallback.** A thin value type mirroring
  Apple's `Spring` surface (`update(value:&,velocity:&,target:,deltaTime:)`, `settlingDuration`), backed
  two ways behind one `#available(iOS 17, *)` split:
  - iOS 17+ → delegates to `SwiftUI.Spring` (Apple's own solver — a substrate-free math value type, no
    view hosting, so rule #4 is untouched).
  - iOS 13–16 → hand-rolled closed-form damped-oscillator step (the RN/Reanimated math).
  Shared once across both: the `CADisplayLink` loop, the retarget logic (carry velocity, clip inertia
  opposing the new target), the model-layer write of a single transform+opacity `VectorArithmetic`
  envelope, the rest test, and the single completion event. Downstream is oblivious to which solver runs.

## Load-bearing findings (the why)

- **`SwiftUI.Spring` is a substrate-free solver** — pure `VectorArithmetic` math, instantiates no view;
  steppable on `CADisplayLink` to drive a plain `CALayer`. iOS 17+. (Below 17 there is no stock solver.)
- **Core Animation runs in the render server**, independent of the app's main thread — the source of
  Apple-grade smoothness under load. A `CADisplayLink` integrator runs in-app and is main-thread-bound
  (far lighter than Reanimated's JS-worklet integrator, but still not render-server).
- **Additive `CASpringAnimation` retarget is only *approximate*** — no documented in-flight velocity read
  (`presentation()` exposes value, not velocity), `initialVelocity` is a displacement-normalized scalar
  that degenerates at small displacements, composition is exact only for like-parameter linear springs.
- **`UIViewPropertyAnimator` cannot retarget a running target** — `continueAnimation` is paused-only and
  changes timing, not destination. Not a fit for mid-flight target change.
- **`UIKit Dynamics`** (`UIAttachmentBehavior.anchorPoint` + `UIDynamicItemBehavior`) is a true live
  retargetable physics engine (iOS 7, reads/injects 2-axis velocity, real-frame updates so touch tracks
  visual) — a candidate for the **interactive U8 lane**, not content motion (opacity is not a dynamic
  property; older `frequency`/`damping` spring model).
- **Why Reanimated does not feel like Apple:** it does *not* use the platform spring engine — it
  hand-rolls its own integrator and deliberately makes iOS/Android uniform (the inverse of the law,
  platform-native defaults), and it runs in-app on the worklet thread (jank under load) rather than the
  render server. (`references/reanimated/.../animation/spring/spring.ts`, `springUtils.ts`.)

## Touch caveat flip

A `CADisplayLink` integrator writes the **model layer** each tick, so iOS hit-testing tracks the *visual*
position mid-flight — same as Android — instead of the "tappable at destination" model-layer caveat the
animation-driver doc currently records. Record as a deliberate change when the mechanic lands.

## Open decisions for the maintainer (before building U6-001)

1. **iOS floor.** Option A: iOS-17 floor for spring content-motion, `Spring` only, instant degradation
   below 17 (consistent with the ratified reduce-motion posture). Option B: iOS-13 floor, `Spring` (17+)
   + hand-rolled fallback (13–16). The content rung currently says `os:13` → B matches today's contract;
   A is simpler and most-native. Recommendation leans A unless iOS 13–16 spring feel is required.
2. **Render-server-first vs flat-integrator** for the iOS lane. Recommendation: render-server-first,
   integrator-on-retarget (above).

## Feed-back still owed (do when U6-001 is picked up, with maintainer sign-off)

- Correct `structure.ios.md` `motion` content-target mechanic to the disposition above (current text
  names `CASpringAnimation`/`UIView.animate` without the render-server-first / integrator-on-retarget
  split).
- Keep/confirm `structure.android.md` `dynamicanimation` + `animateToFinalPosition()`.
- Record the touch-caveat flip in the animation-driver doc.
- Carry the two open decisions into the U6-001 spec; leave RT-016 open for U6-002's device gate.

## References consulted

- `references/react-native` NativeAnimated C++ driver `SpringAnimationDriver.cpp` (hand-rolled analytic
  integrator; retarget currently drops velocity + target — a bug, not a template to copy).
- `references/reanimated` `spring.ts` / `springUtils.ts` (closed-form integrator + velocity-carry +
  opposing-inertia clip on `onStart`; worklet/JSI mechanism rejected).
- Apple docs: `SwiftUI.Spring`, `CASpringAnimation`, `UIViewPropertyAnimator`, `UIView.animate`
  springs, `UIKit Dynamics`, `CADisplayLink`; WWDC23 "Animate with springs".
