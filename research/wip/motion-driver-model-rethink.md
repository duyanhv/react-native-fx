# WIP — Driver-model rethink (motion + effects as driven properties)
Status: **work-in-progress exploration** · no decision made · drafted 2026-06-09
Nature: a design-dialogue capture, parked here so it can be resumed cold. **Nothing here is
ratified.** The canonical motion docs (`../3-motion/40`–`42`) and the decision ledger remain
authoritative. If this direction is accepted, a `ratify` task promotes it and revises those.

---

## Resume here — where you left off

You judged the current motion API "primitive." The diagnosis landed: today there is exactly
**one kind of driver** (a discrete `target` — `visible`/`state`) and a handful of affine
channels, so every motion is "snap a channel A→B with a native curve." Effects have the same
shape (uniforms that can only be *set*, never *driven*). Your stated goal: **expose the native
animation primitives per platform** (fidelity over write-once uniformity) — because tuning one
abstract spring to feel native on both iOS and Android is impossible and always reads janky.
Shaders are explicitly *not* the main goal (keep BYO `.metal`/`.agsl` + presets as rule #5
already frames them). The main goal is making **effects + motion** stop feeling primitive.

**The proposed reframe** (details below): motion and effects are the same thing — *animatable
properties bound to native drivers* — and the fix is a real set of drivers, not more channels:
`bind(property, driver, mapping)`, with three drivers: **`target`** (discrete → native spring),
**`clock`** (native timeline: loop/pulse/keyframe/stagger), **`source`** (bind to a native
scroll/gesture value).

**The native research is done** (iOS + Android, both captured below). It produced one
load-bearing finding and a recommended build order.

### The open decision for tomorrow

The best native motion primitives live in the **declarative** frameworks (SwiftUI / Compose),
but content motion is locked to the **imperative** layer (`CALayer` / Android `View`) by
rule #4 ("never host RN content"). That fragments `source` and effect-uniform fidelity along
the substrate line — see the tier table. **The question to answer first:**

> Does the substrate-tiered slicing land — content-motion (`expo-view`) gets clean
> `target`/`clock` and a *best-effort* `source`, while rich render-server `source` and all
> effect-uniform animation live in the `hosted` effects lane? Or do you want content motion
> itself to reach render-server `source` fidelity on iOS — which means reopening rule #4?

My recommendation: **accept the tiered slicing; build `target` + `clock` first** (universal,
high-fidelity, breaks no rules); spec `source` with an honest substrate-dependent guarantee;
move effect-uniform animation into the hosted effects lane and tier it lowest.

---

## The reframe in detail

### The insight: effects and motion are one thing, crippled the same way

- A **motion** has channels: `opacity, scale, translate, rotate`.
- An **effect** has uniforms: glow intensity/width, blur radius, shader params.

Both are "a number/color/vector that wants to animate," and today both can only go A→B on a
discrete trigger. That single-shot, discretely-set nature *is* the primitiveness — no pulse,
no loop, no keyframe sequence, no scroll/gesture binding, on either side. The IR already
half-saw this: the `motion` driver node in `../0-spine/02-capability-ir-and-lowering.md`
carries both `target:'content'` and `target:'effect'` rungs. This reframe finishes that
unification.

### The model: `bind(property, driver, mapping)`

Properties stay what they are (content channels / effect uniforms). The missing piece is a
real set of **drivers**:

- **`target`** — discrete state → native curve. Same trigger as today, but the curve is a
  **native-primitive spring written per platform**, not a lowered `{damping,mass,stiffness}`.
  This is the "finally feels native, tunable per platform" fix.
- **`clock`** — a native timeline. Loop / pulse / shimmer / breathing / multi-keyframe /
  stagger-by-delay. Pure-native, zero rule tension.
- **`source`** — bind a property to a **native** scroll offset or gesture value, mapped
  natively. Parallax, rubber-band, drag-to-dismiss-that-tracks. The big interactive gap.

Same vocabulary for an effect and a motion:

```
// content motion: spring in, native-faithful per platform
bind('translateY', target({ to: 'visible' }), {
  ios:     spring({ duration: 0.4, bounce: 0.2 }),
  android: spring({ stiffness: 'mediumLow', dampingRatio: 'lowBouncy' }),
})

// effect uniform: a glow that breathes forever
bind('glow.intensity', clock({ loop: true, duration: 1600 }), keyframes([0.3, 1, 0.3]))

// effect uniform driven by a native scroll — no JS per frame
bind('blur.radius', source({ scroll: scrollRef, range: [0, 200] }), [0, 24])
```

### What it costs

The agnostic `preset`/`motion`/`tune`/`transition` split (`../3-motion/41`) does **not** die —
it demotes to *sugar built on this*. `preset="sheet"` expands to a `target`-driver binding with
platform-native springs. The four-prop front door stays; drivers become the layer beneath it.
`clock`/`source` are genuine new native-runtime work (`../4-runtime`), but they reuse the
content-motion wrapper + lifecycle plumbing already built and device-verified (U4-001/U4-002).

---

## Native research — the full picture

Two parallel research passes against Apple and Android developer docs. The headline: the
platforms **agree** on two of the three drivers and **disagree** on the third.

### `target` and `clock` are slam dunks on both platforms

**Spring (`target`)** is the strongest primitive on both sides, and both give exactly what
you want — a velocity-preserving, retarget-mid-flight, no-restart spring. Only the
parameterization differs, and it converts losslessly:

| | iOS | Android |
|---|---|---|
| Modern spring | **duration + bounce** (`Animation.spring(duration:bounce:)`, unified UIKit+SwiftUI since iOS 17) | **stiffness + dampingRatio** (`SpringForce`); M3 Expressive `MotionScheme` tokens |
| Physical form | `CASpringAnimation(mass,stiffness,damping)`, `UISpringTimingParameters` | `SpringForce` constants (below) |
| Retarget/velocity | additive UIView anims (default since iOS 8); SwiftUI auto-velocity; `UIViewPropertyAnimator` | `SpringAnimation.animateToFinalPosition` keeps velocity; Compose `Animatable` |

The bridge: `bounce ≈ 1 − dampingFraction`; `stiffness ≈ (2π/duration)²`;
`damping = 1 − 4π·bounce/duration` (bounce ≥ 0). iOS response/dampingFraction maps as
`response ↔ duration`, `bounce = 1 − dampingFraction`.

**Android `SpringForce` constants** (exact floats from `SpringForce.java`):
`STIFFNESS_HIGH=10000`, `STIFFNESS_MEDIUM=1500` (default), `STIFFNESS_LOW=200`,
`STIFFNESS_VERY_LOW=50` (Compose adds `StiffnessMediumLow=400`).
`DAMPING_RATIO_HIGH_BOUNCY=0.2`, `MEDIUM_BOUNCY=0.5`, `LOW_BOUNCY=0.75`, `NO_BOUNCY=1.0`.
Note the View-library default damping is `MEDIUM_BOUNCY`; Compose's default is `NoBouncy`.

**M3 Expressive `MotionScheme`** (modern recommended Android spring) splits springs two ways:
*spatial* (position/size — underdamped, allows overshoot) vs *effects* (color/opacity —
critically damped, no overshoot), each in fast/default/slow. `MotionScheme.expressive()` is
the recommended default. This is the tuned token set to derive Android defaults from — honors
the shape-native law directly.

**Design consequence:** expose the spring as each platform's own — **duration/bounce on iOS,
stiffness/dampingRatio (or `MotionScheme` tokens) on Android** — and let defaults come from the
platform's tuned tokens. Kill the invented `{damping,mass,stiffness}` in `Transition`.

**Timeline (`clock`)** is also clean on both:
- iOS: `CAKeyframeAnimation` (values/keyTimes/timingFunctions, per-segment easing) on the
  expo-view path; `keyframeAnimator` (per-property `KeyframeTrack`s) and `PhaseAnimator` on the
  hosted path; `repeatForever`/`repeatCount`/`autoreverses` for loops.
- Android: `ValueAnimator` keyframes (`PropertyValuesHolder.ofKeyframe`) + `repeatCount=INFINITE`
  / `repeatMode=RESTART|REVERSE`; Compose `rememberInfiniteTransition` + `infiniteRepeatable`,
  and `keyframes {}`/`keyframesWithSpline {}`.
- **Shared gap:** neither has a first-class *stagger* primitive — both express it as per-element
  delay offsets (`beginTime` / `startDelay`). We synthesize stagger ourselves.

### `source` is the fault line — and the asymmetry is sharp

- **iOS *can* bind a property to scroll/gesture on the render server with zero main-thread
  work — but only through SwiftUI** `visualEffect { content, proxy in … }` (runs off the main
  thread, after layout, triggers no layout recalc) and `scrollTransition`. On the imperative
  `CALayer` path you're limited to a `CADisplayLink`/KVO **main-thread** reader or
  `UIViewPropertyAnimator.fractionComplete` scrubbing.
- **Android fundamentally *cannot*.** Every scroll/gesture-driven update routes through the UI
  thread, every frame (`NestedScrollConnection`, `scrollState` reads, `Animatable.snapTo`
  during drag + `animateTo`/`animateDecay` on release). The mitigation — read scroll state
  inside a `graphicsLayer{}`/`offset{}` lambda so it skips recomposition — keeps 60–120fps but
  is **not** render-thread offload.

**The honest guarantee for `source`:** "zero per-frame **JS**" (true everywhere — satisfies
rule #1) — **not** "zero per-frame **native** work" (only true on iOS-hosted). This distinction
must be first-class in the design, not papered over.

### Effect-uniform animation is the weakest combination

- **iOS:** `CALayer.filters`/CIFilter is *documented but non-functional on iOS* — a real trap.
  Animate effect uniforms via SwiftUI modifiers (`.blur`, `colorEffect`/`layerEffect`) or
  `CAMetalLayer` + `CADisplayLink` for BYO Metal (app-thread per-frame, JS-free).
- **Android:** `RenderEffect` is **immutable** (rebuild + `setRenderEffect` per frame on the UI
  thread to animate blur); AGSL `RuntimeShader.setFloatUniform` per frame. API-gated:
  RenderEffect = **API 31+**, AGSL = **API 33+** — need graceful degradation below.

### The deeper finding — best primitives are declarative, content motion is imperative

The cleanest native motion lives in SwiftUI / Compose, but rule #4 locks content motion to the
imperative layer (`CALayer` / Android `View`). This maps onto the two substrates and tells you
how to tier fidelity:

| driver / property | content motion (`expo-view`, wraps RN — imperative) | effects (`hosted`, fx draws whole — declarative) |
|---|---|---|
| `target` spring | clean (CALayer additive / dynamicanimation) | clean (SwiftUI / Compose spring) |
| `clock` timeline | clean | clean |
| `source` scroll/gesture | best-effort: main-thread reader (zero-JS, not zero-native) | **render-server on iOS** (visualEffect); UI-thread on Android |
| effect-uniform (blur/glow) | trap on iOS / API-gated on Android — avoid | the right home (SwiftUI modifiers / RenderEffect) |

**Punchline:** `target` + `clock` are universal and high-fidelity. `source` and effect-uniforms
fragment along the line the architecture already draws — effect-uniform animation belongs in
*effects* (hosted), not content motion; rich `source` is full-fidelity only for hosted effects
on iOS.

### Reduce-motion (native reads, both platforms)

- iOS: `UIAccessibility.isReduceMotionEnabled` / SwiftUI `accessibilityReduceMotion`. Idiom is
  cross-fade/jump, not just speed-up.
- Android: `Settings.Global.ANIMATOR_DURATION_SCALE` (0 disables). Duration animators auto-respect
  it; **springs/physics do not** — gate manually via `ValueAnimator.areAnimatorsEnabled()`.

---

## Recommended build order (if accepted)

1. **`target` + `clock` core** — native springs (duration/bounce ↔ stiffness/dampingRatio) and
   native timelines, on the content-motion (expo-view) substrate. ~80% of the "feels primitive"
   pain; slam dunk on both platforms; breaks zero rules.
2. **`source` as a substrate-tiered driver** — guarantee "no per-frame JS" universally;
   "render-server fidelity" only on iOS-hosted; "UI-thread-mapped" elsewhere.
3. **Effect-uniform animation in the hosted effects lane** — tier lowest; API-31/33 degradation
   on Android; avoid the CIFilter trap on iOS.

## If accepted, this would touch (canonical docs — do not edit until ratified)

- `../0-spine/02-capability-ir-and-lowering.md` — generalize the `motion` driver node into the
  driver/binding vocabulary.
- `../3-motion/41-motion-vocabulary.md` — `preset/motion/tune/transition` demote to sugar over
  drivers; replace `Transition.spring` `{damping,mass,stiffness}` with per-platform native
  spring types.
- `../3-motion/42-presence-and-lifecycle.md` — presence/state become `target`-driver
  orchestrations.
- `../7-implementation/decision-ledger.md` — resolves/reframes `MOT-005` (transition scope),
  `MOT-006`/`MOT-007` (regime-C → the `source` driver), `MOT-009` (named states / sequences →
  `clock`); revisits `RT-013` (content-motion hosted-reachability) via the tier table.
- `../5-realization/structure.{ios,android}.md` — pin the per-driver mechanics (spring types,
  keyframe/timeline APIs, the scroll/gesture binding per substrate).

## Key sources

iOS: WWDC23 "Animate with springs" (10158), "Advanced animations" (10157), "Beyond scroll
views" (10159); WWDC24 "Custom visual effects" (10151); `CASpringAnimation`,
`Animation.spring(duration:bounce:)`, `visualEffect`/`scrollTransition`, `CALayer.filters`
(the iOS caveat). Android: developer.android.com spring-animation guide + `SpringForce.java`,
property-animation overview, hardware-acceleration, Compose customize/value-based/advanced,
m3.material.io motion + `MotionScheme`, `RenderEffect`, AGSL. Full URL list is in the session
transcript that produced this doc.
