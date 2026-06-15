# U6-001 — iOS spring preflight (design disposition, not closure)

A spec-time `references-preflight` (per `agents/references-preflight.md`) on the `FxAnimationDriver`
content lane. Resolves the design question behind **RT-016** (animator sufficiency) before U6-001 is
built. This is the *design disposition* only — RT-016 stays `device-pending` and is closed by **U6-002**
on device.

Status: **dispositions maintainer-ratified and pinned in source (DOC-009, 2026-06-10)** —
`34` §Findings — the iOS spring disposition; `structure.{ios,android}.md` `motion` content
target; `02` content rung `os:17`. U6-001 is `todo`, blocked by U5-001. This artifact remains
as the spec-time reference dossier; the canonical mechanics now live in the docs above.

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

- **The integrator branch — `FxSpring` facade, `SwiftUI.Spring` only (iOS 17 floor).** A thin value
  type mirroring Apple's `Spring` surface (`update(value:&,velocity:&,target:,deltaTime:)`,
  `settlingDuration`), delegating to `SwiftUI.Spring` — Apple's own solver, a substrate-free math
  value type with no view hosting, so rule #4 is untouched. Owned by the facade: the `CADisplayLink`
  loop, the retarget logic (carry velocity, clip inertia opposing the new target), the model-layer
  write of a single transform+opacity `VectorArithmetic` envelope, the rest test, and the single
  completion event.

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
position mid-flight — same as Android — instead of the "tappable at destination" model-layer caveat.
**Recorded (DOC-009):** `34` §hit-testing carries the flip; it applies only while the integrator runs.

## Maintainer decisions (ratified 2026-06-10, DOC-009)

1. **iOS floor: Option A — iOS 17.** `SwiftUI.Spring` only; no hand-rolled 13–16 fallback. The `02`
   content rung moved `os:13` → `os:17`; below 17 the ladder degrades to `{via:'none'}` (instant
   placement, consistent with the ratified reduce-motion posture).
2. **Render-server-first, integrator-on-retarget** for the iOS lane (the disposition above).

## Feed-back ledger

- [x] `structure.ios.md` `motion` content-target mechanic corrected to render-server-first /
  integrator-on-retarget (DOC-009).
- [x] `structure.android.md` `dynamicanimation` + `animateToFinalPosition()` confirmed and pinned,
  with the spring parameterization and the reduce-motion spring gate (DOC-009).
- [x] Touch-caveat flip recorded in `34` (DOC-009).
- [ ] Carry the ratified decisions into the U6-001 spec when the task unblocks (U5-001).
- [ ] RT-016 device gate — U6-002, after U6-001 builds the driver.

## References consulted

- `references/react-native` NativeAnimated C++ driver `SpringAnimationDriver.cpp` (hand-rolled analytic
  integrator; retarget currently drops velocity + target — a bug, not a template to copy).
- `references/reanimated` `spring.ts` / `springUtils.ts` (closed-form integrator + velocity-carry +
  opposing-inertia clip on `onStart`; worklet/JSI mechanism rejected).
- Apple docs: `SwiftUI.Spring`, `CASpringAnimation`, `UIViewPropertyAnimator`, `UIView.animate`
  springs, `UIKit Dynamics`, `CADisplayLink`; WWDC23 "Animate with springs".
