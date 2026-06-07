# Runtime: the animation driver
Status: researched (design) · source-audit pass · device proof pending
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
| **wrapped RN content** (transform/opacity) | Core Animation / `UIView.animate` (`CASpringAnimation`) | Android **View** animation (`ViewPropertyAnimator`, `androidx.dynamicanimation` springs) |
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

## Findings — verified against source (`references/`)

- **The driver animates an fx-owned, Fabric-invisible layer.** `transform`/`opacity` are
  Fabric props re-applied on every commit, so animating a Fabric-tracked view's layer
  directly is clobbered (`33`). The content driver therefore targets the **intermediate
  layer fx creates inside `FxNativeView`**, which Fabric does not track — not the tracked
  view's `transform` prop.
- **fx's default driver is not a worklet model.** Reanimated's driver is a per-frame JS
  worklet on a *separate Hermes runtime* with JSI shared-value listeners (Babel +
  serialization + runtime overhead). fx's own envelopes stay **declarative + native-eased**
  (discrete target in, native animator runs it) — no worklet runtime. This rejects worklets
  *for fx's own driver*, not the future regime-C lane: if continuous, externally-sourced
  motion is ever pursued, the lighter paths are `40`'s two routes — a **native source read**
  (native timer/displacement + callback) or a **UI-thread channel** (a gesture's shared value
  bound to a uniform off the JS thread) — never a worklet driving fx's own envelopes (`40`/`05`).

## Research questions

- What is the minimal interruptible-spring contract the driver must expose so a target
  change mid-flight retargets cleanly (no snap, no double-animation)?
- How does the driver bind the platform's **default** shape + spring/curve per `preset` (the law:
  platform-native defaults), and how does `tune` (`speed`/`emphasis`/`distance`) adjust
  it without leaving the platform's family?
- Where does the frame loop live, who pauses it off-window / backgrounded (ties to
  `31-lifecycle-and-teardown`), and how does it stay paused when nothing animates?
- How are completion / state-change events emitted back across the thin async boundary
  (`onTransitionEnd`), and what is their ordering guarantee under rapid toggles?
- Does the content driver and the effect driver share scheduling, or run independently?

## Open questions

- Whether `CASpringAnimation` / `dynamicanimation` give enough control, or a
  displacement-driven custom integrator is needed for the harder cases.
- BYO envelopes — can a curated effect's intro/outro be expressed without hardcoding it
  to one effect (carried open from `40`).

## Sources

- Conversation: own the native path, no Reanimated; the content-vs-effect driver split.
- `40-motion-reactivity-and-data-flow.md` (targets in / native eases / events out),
  `31-lifecycle-and-teardown.md` (the frame loop's lifecycle).
