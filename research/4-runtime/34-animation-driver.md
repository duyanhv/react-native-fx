# Runtime: the animation driver
Status: researched (design) · source-audit pass · retarget contract device-verified (U6-001, RT-007) · hard-retarget matrix device-verified (U6-002, RT-016) · `transient` catalog feel device-verified (U6-003; MOT-001 closed, U7-003)
Phase: v2
Feeds: 42-presence-and-lifecycle.md, 41-motion-vocabulary.md, structure.{ios,android}

## Why this matters

This is the engine that makes "JS sets a target, native eases to it" real for content
motion — fx's own, built from the platform's native animation primitives rather than
a third-party lib. It owns the interruptible envelope: spring/timing math, retargeting
mid-flight, and emitting the discrete completion events the data-flow contract (`40`)
promises back to JS.

## The two realization families

The driver is not one engine — it splits by *what is animated*, and the split is the
same one the manifest already encodes per platform:

| Target | iOS primitive | Android primitive |
|---|---|---|
| **wrapped RN content** (transform/opacity) | render-server springs (`UIView.animate(springDuration:bounce:)` / `CASpringAnimation`); `CADisplayLink` + `SwiftUI.Spring` integrator on retarget | Android **View** animation (`ViewPropertyAnimator`, `androidx.dynamicanimation` springs; `animateToFinalPosition()` retargets) |
| **fx's own effect layers** (glow, glass, mesh) | SwiftUI animation | **Jetpack Compose** animation (`spring()` / platform standard; M3 Expressive where present) |

Content uses the lower UIKit/View layer (it can move real RN views without hosting
them); effects use SwiftUI/Compose (they animate fx's own drawn content). Both are
touch-safe and need no JSI / C++ (rule #7). The mechanics expand in
`structure.{ios,android}`; this doc owns the cross-platform driver contract.

## Findings — the driver needs no synchronous boundary

The contract is **targets in, native owns frames, events out** — so the driver crosses
the boundary only for discrete targets and completion events; **frames never cross it.**
That removes the usual reason to reach for JSI: fast *synchronous* JS↔native calls (the
Nitro edge) are not on the driver's critical path, and reaching a `CALayer` / `View`
transform happens *below* Fabric, not through its per-frame prop pipeline (which is why
fx sidesteps the deep Fabric/JSI integration Reanimated needs). The boundary-mechanism
choice — Expo Modules vs Nitro vs raw Fabric — is decided once in **`0-spine/05`**, not
here; this doc only records that the driver imposes **no synchronous-boundary
requirement**. The one exception is the regime-C lane (continuous, gesture-sourced
motion), which `40` defers and `05` carves out narrowly.

## Findings — hit-testing under transform (touch-safe, with a platform caveat)

Transform-only animation keeps touch, but the platforms differ *mid-flight* — a divergence
the law expects rather than fights:

- **iOS hit-tests against the model layer** (the property's target value), not the
  **presentation layer** (where it visually is during the animation). So at rest, touch is
  exactly right; *during* an enter/exit the element is tappable at its **target** position,
  not its on-screen position. For short presence transitions this is fine — often
  desirable, since the element is "really" already at its destination. A documented caveat,
  not a bug.
- **Android** property animators update the real view properties each frame, so touch
  tracks the **visual** position throughout.

Implication: presence is touch-safe on both; the only nuance is *which* position is
tappable mid-transition, and it differs by platform. The driver's contract: **guarantee
correct touch at rest; do not promise pixel-aligned touch on an in-flight element.**
Continuous gesture-tracked motion (regime C) would need the model layer kept in sync every
frame — another reason it stays out of scope here.

**Future path:** making iOS track the visual position mid-animation would require a
`hitTest` override against the presentation layer (`CALayer.presentation()`). This is
feasible but is deferred to the interaction work (U6/U8) if mid-transition interaction
proves to matter. For now, the model-layer caveat is acceptable for short presence
envelopes (<300ms).

**The caveat flips during a retarget (DOC-009).** The iOS integrator branch (below) writes
the **model layer** each tick, so while it runs, hit-testing tracks the *visual* position —
the same behavior as Android. The model-layer caveat therefore applies only to the
committed render-server segment of an envelope, not to a retargeted one.

## Findings — the iOS spring disposition (render-server-first, integrator-on-retarget)

Ratified with the U6-001 preflight (DOC-009, 2026-06-10; the preflight artifact lives in
`7-implementation/tasks/U6-001/preflight.md`):

- **Render-server-first.** Fire-once envelopes — the overwhelming majority of
  presence/state transitions — commit the iOS 17 unified spring
  (`UIView.animate(springDuration:bounce:)` / `CASpringAnimation` with Apple's defaults).
  Committed Core Animation runs in the **render server**, off the app's main thread —
  the source of Apple-grade smoothness under load. Most transitions never leave this path.
- **Integrator only on retarget.** When a target actually changes mid-flight, capture the
  presentation-layer value and hand off to a `CADisplayLink` loop stepping the **`FxSpring`
  facade**: a thin value type mirroring Apple's `Spring` surface, delegating to
  `SwiftUI.Spring` — Apple's own solver, a substrate-free `VectorArithmetic` value type
  that hosts no view, so rule #4 is untouched. The loop carries velocity, clips inertia
  opposing the new target, writes one transform+opacity envelope to the model layer per
  tick, rest-tests, and emits a single completion event.
- **iOS 17 floor (maintainer decision).** `SwiftUI.Spring` only; no hand-rolled 13–16
  fallback. Below 17 the `motion` content ladder is empty and degrades to `{via:'none'}` —
  instant placement, consistent with the reduce-motion posture. The `02` content rung
  reads `os:17`.
- **Why not the stock alternatives.** Additive `CASpringAnimation` retargeting is only
  *approximate* — `presentation()` exposes value, not velocity, and `initialVelocity` is a
  displacement-normalized scalar that degenerates at small displacements.
  `UIViewPropertyAnimator` cannot retarget a running destination (`continueAnimation` is
  paused-only and changes timing, not target). UIKit Dynamics is a true live-retarget
  physics engine but fits the interactive lane (U8), not content motion — opacity is not a
  dynamic property.
- **Android needs none of this.** `androidx.dynamicanimation`'s
  `SpringAnimation.animateToFinalPosition()` retargets the running animation with value and
  velocity carried — stock, no custom integrator.

Design disposition only: RT-016 stays device-pending; U6-002 owns the on-device retarget
proof.

## Findings — the spring-axis divergence (why authoring is per-platform)

Source-backed (DOC-034, 2026-06-29): the two platforms parameterize springs on different
axes, with no 1:1 mapping. iOS SwiftUI `Spring(duration:bounce:)` is **perceptual duration +
normalized bounce**. Android is **damping ratio + stiffness** — and uniformly so across *both*
realization paths: the View-system `androidx.dynamicanimation` `SpringForce`
(`STIFFNESS_MEDIUM = 1500`, `DAMPING_RATIO_NO_BOUNCY = 1.0`, …) and Jetpack Compose
`spring(dampingRatio, stiffness)` share the same constants. This is the concrete reason
`transition.spring` is authored per platform (`41` decision 11) rather than through one invented
cross-platform spring, and it compounds the retarget asymmetry above (a stock
`SpringForce.animateToFinalPosition` on Android; the `FxSpring` integrator only on iOS). The
internal lossless bridge stays `bounce ≈ 1 − dampingRatio`, `stiffness ≈ (2π/duration)²`.

## Findings — verified against source (`references/`)

- **The driver animates an fx-owned, Fabric-invisible intermediate container.**
  `transform`/`opacity` are Fabric props re-applied on every commit, so animating a
  Fabric-tracked view's layer directly is clobbered (`33`). The content driver therefore
  targets the **intermediate container inside `FxSurfaceView`** — a native view that
  Fabric does not track, so Fabric cannot clobber its `transform`/`opacity`. The animator
  targets the container, not the outer `FxSurfaceView`. This is a view, not a raw
  `CALayer`, so children mount as subviews and hit-testing survives at rest.
- **fx's default driver is not a worklet model.** Reanimated's driver is a per-frame JS
  worklet on a *separate Hermes runtime* with JSI shared-value listeners (Babel +
  serialization + runtime overhead). fx's own envelopes stay **declarative + native-eased**
  (discrete target in, native animator runs it) — no worklet runtime. This rejects worklets
  *for fx's own driver*, not the future regime-C lane: if continuous, externally-sourced
  motion is ever pursued, the lighter paths are `40`'s two routes — a **native source read**
  (native timer/displacement + callback) or a **UI-thread channel** (a gesture's shared value
  bound to a uniform off the JS thread) — never a worklet driving fx's own envelopes (`40`/`05`).

## Findings — reduce-motion

The driver checks the OS reduce-motion / animation-scale setting at the start of each
animation envelope. When active (`UIAccessibility.isReduceMotionEnabled` on iOS;
`Settings.Global.TRANSITION_ANIMATION_SCALE` = 0.0 or `ANIMATOR_DURATION_SCALE` = 0.0
on Android), the driver sets the animation duration to 0, applies the target
immediately, and fires `onTransitionEnd` synchronously. The policy is recorded in
`41`/`42` and applies to all content motion (presence enter/exit, state transitions).

One Android mechanic to honor (DOC-009): duration-based animators respect
`ANIMATOR_DURATION_SCALE` automatically, but **springs and physics-based animations do
not** — the driver gates them manually (`ValueAnimator.areAnimatorsEnabled()`), or the
reduce-motion policy silently fails for exactly the animations fx prefers.

## Research questions

- ~~What is the minimal interruptible-spring contract the driver must expose so a target
  change mid-flight retargets cleanly (no snap, no double-animation)?~~ **Resolved
  (U6-001, RT-007, 2026-06-12):** animate-to(target vector) with retarget-on-call, cancel
  (settle in place), and one completion per envelope — implemented as `FxAnimationDriver`
  and device-verified on both platforms (no snap, completion-once, velocity carry with the
  opposing-inertia clip; evidence in `7-implementation/tasks/U6-001/evidence/`).
- How does the driver bind the platform's **default** shape + spring/curve per `preset` (the law:
  platform-native defaults), and how does `tune` (`speed`/`emphasis`/`distance`) adjust
  it without leaving the platform's family?
- Where does the frame loop live, who pauses it off-window / backgrounded (ties to
  `31-lifecycle-and-teardown`), and how does it stay paused when nothing animates?
  *(Half-answered by U6-001: the content driver runs frame work only inside a retargeted
  envelope — iOS starts a display link on handoff and stops it at rest/cancel, device-
  proven; fire-once envelopes run in the render server with no in-process loop. The
  off-window / backgrounded pause policy stays owned by `31`.)*
- How are completion / state-change events emitted back across the thin async boundary
  (`onTransitionEnd`), and what is their ordering guarantee under rapid toggles?
- Does the content driver and the effect driver share scheduling, or run independently?
- **Effect↔content composition.** When both the GPU effect surface (`metalView` / shader
  render node) and the content-motion intermediate container are active in the same
  `FxSurfaceView`, how do they compose in z-order, hit-testing, and the combined
  shader-and-motion case? This is the intersection of SPINE-004 (composition as API-layer
  prop — background/overlay/surface) and the U3 V2 interactive surface. Not decided in V1.

## Open questions

- ~~Whether `CASpringAnimation` / `dynamicanimation` give enough control, or a
  displacement-driven custom integrator is needed for the harder cases.~~ **Design
  disposition recorded (DOC-009):** Android stock (`animateToFinalPosition()` carries
  value + velocity); iOS render-server-first with the `FxSpring` integrator on retarget
  (§Findings above). **Device-proven (U6-002, RT-016, 2026-06-12):** the nine-row
  hard-retarget matrix passed in full on both platforms — timing sweep, clip-vs-carry,
  rapid-fire, zero-displacement, after-rest, rotation+combined, mixed channels,
  cancel-under-fire, JS silence — so the shipped paths suffice and no custom integrator
  is needed (evidence in `7-implementation/tasks/U6-002/evidence/`).
- ~~BYO envelopes — can a curated effect's intro/outro be expressed without hardcoding it
  to one effect (carried open from `40`).~~ **Resolved by composition (MOT-008, DEF-007,
  2026-06-14):** the driver needs no BYO-specific envelope — nothing is hardcoded to un-hardcode.
  Curated and BYO effects share the same three channels (`FxPresence` wrapper envelope, native
  `time` in-shader, semantic uniforms eased by `transition`). See `40` § Open questions for the
  contract.

## Sources

- Conversation: own the native path, no Reanimated; the content-vs-effect driver split.
- `40-motion-reactivity-and-data-flow.md` (targets in / native eases / events out),
  `31-lifecycle-and-teardown.md` (the frame loop's lifecycle).
