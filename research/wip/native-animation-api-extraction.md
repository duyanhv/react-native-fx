# Native animation API extraction
Status: historical — grammar promoted to canon (DOC-034); non-authoritative
Phase: post-v2 exploration
Feeds: `0-spine/02-capability-ir-and-lowering.md`, `3-motion/40-motion-reactivity-and-data-flow.md`, `3-motion/41-motion-vocabulary.md`, `4-runtime/34-animation-driver.md`, `5-realization/structure.{ios,android}.md`
Scope: compare two expansion directions for native animation APIs: expose platform-shaped iOS and Android surfaces first, or combine the shared concepts into an fx vocabulary first. The research extracts both animation concepts and concrete native APIs before deciding what belongs in public JS.

> **Promoted (DOC-034, 2026-06-29).** The durable grammar is now canon: `3-motion/41`
> decision 15 (the `target → state → clock.phase → clock.keyframes → source` sequence and the
> hybrid-timing principle), `0-spine/02` decision 17 (the lowering chain + native primitives
> private to lowering), `4-runtime/34 §The spring-axis divergence`, and the realization tables in
> `5-realization/structure.{ios,android}.md §motion`. Promotion was **principle-only**: no public
> API was frozen, no implementation/DEF row spawned. This WIP is retained as derivation history —
> the source-backed concept/API tables (incl. the §Android API extraction pass) and the
> `FxTransition`/`FxIosTransition`/`FxAndroidTransition` type sketches stay here, unfrozen, until a
> real consumer pulls a rung. Cite the canonical docs.

## Why this matters

SwiftUI's animation surface is broad: `Animation`, `Spring`, `PhaseAnimator`,
`KeyframeAnimator`, `.animation(value:)`, `.contentTransition`, `visualEffect`,
`scrollTransition`, and `CustomAnimation` all describe different concepts. Android has the
same spread under different names: view property animators, `SpringAnimation`, Compose
`animate*`, `updateTransition`, keyframes, gestures, scroll, and Material motion tokens.

The research needs two tables, not one. First extract the concepts each platform exposes.
Then extract the actual APIs that realize those concepts. Only after that split can you decide
whether fx exposes two platform-shaped surfaces and builds a universal layer on top, or exposes
the combined fx vocabulary first.

## Research method

Do the work in this order:

1. Extract the animation concepts from iOS and Android.
2. Extract the concrete APIs each platform offers for those concepts.
3. Classify each concept by fx boundary and driver.
4. Compare the two API directions.
5. Promote only the direction that preserves the native-owned frame contract.

## Evidence status

The tables below are a research scaffold. Each row needs a source-backed extraction pass before
it can promote into the canonical motion docs.

| Area | Status | Source |
|---|---|---|
| SwiftUI `Animation` | source-backed | Apple DocC JSON: `https://developer.apple.com/tutorials/data/documentation/swiftui/animation.json`; local Xcode iOS 26.5 `SwiftUICore` symbol graph |
| SwiftUI `Spring` | source-backed | Apple DocC JSON: `https://developer.apple.com/tutorials/data/documentation/swiftui/spring.json`; local Xcode iOS 26.5 `SwiftUICore` symbol graph |
| SwiftUI `PhaseAnimator` | source-backed for page existence; API extraction pending | Apple DocC JSON: `https://developer.apple.com/tutorials/data/documentation/swiftui/phaseanimator.json` |
| SwiftUI `KeyframeAnimator` | source-backed for page existence; API extraction pending | Apple DocC JSON: `https://developer.apple.com/tutorials/data/documentation/swiftui/keyframeanimator.json` |
| SwiftUI `UnitCurve` | source-backed for page existence; API extraction pending | Apple DocC JSON: `https://developer.apple.com/tutorials/data/documentation/swiftui/unitcurve.json` |
| Android `android.view.animation` | source-backed package inventory | Android reference: `https://developer.android.com/reference/android/view/animation/package-summary` |
| Android `android.animation` | source-backed | Android reference: `https://developer.android.com/reference/android/animation/package-summary` (+ `ValueAnimator`, `ObjectAnimator`, `AnimatorSet`, `Keyframe` pages). See §Android API extraction. |
| Android DynamicAnimation | source-backed | AOSP `androidx-main` source (the reference pages are JS-rendered): `SpringForce.java` (the named constants + values), `DynamicAnimation.java`, `FloatPropertyCompat.java`. See §Android API extraction. |
| Jetpack Compose animation | source-backed | Android docs `develop/ui/compose/animation/{value-based,quick-guide,customize}` + AOSP `androidx-main` `compose/animation/animation-core` (`AnimationSpec.kt`, `VectorizedAnimationSpec.kt`, `Easing.kt`) for verbatim signatures + `Spring` constants. See §Android API extraction. |
| Material motion | source-backed | `material-foundation/material-tokens` `motion.json` (easing control points + 16 duration tokens) + `material-components-android` `docs/theming/Motion.md` (the Emphasized `PathInterpolator` path) + Compose `androidx.compose.material3.MotionScheme`. See §Android API extraction. |

Apple Developer Documentation pages are backed by DocC JSON at:

```txt
https://developer.apple.com/tutorials/data/documentation/<module>/<symbol>.json
```

Use the DocC JSON for documentation structure, topic grouping, prose summaries, relationships,
and symbol references. Use the Xcode symbol graph for compile-accurate signatures against the
installed SDK.

## Android API extraction

Source-backed pass (2026-06-29) over the four pending Android rows. Each concrete signature
and numeric value below is cited in the evidence table above; the developer.android.com
reference pages are client-rendered, so the AOSP `androidx-main` source was used as the primary
authority where the live pages returned only their navigation shell.

### `android.animation` — the property-animation (tween) system

- `ObjectAnimator.ofFloat(target, propertyName, values…)` / `ValueAnimator.ofFloat(values…)` —
  discrete-target transition; `setDuration`, `setInterpolator`, `setStartDelay`.
- `AnimatorSet.playSequentially(…)` / `playTogether(…)` + `AnimatorSet.Builder` (`after`/`before`/
  `with`) — sequencing and grouping (the timeline-orchestration concept).
- Repeat: `setRepeatCount(int)` with `INFINITE = -1`; `setRepeatMode(int)` with `RESTART = 1` /
  `REVERSE = 2`.
- Keyframe timeline: `Keyframe.ofFloat(fraction, value)` (per-keyframe `setInterpolator`) →
  `PropertyValuesHolder.ofKeyframe(name, kf…)` → `ObjectAnimator.ofPropertyValuesHolder(target, pvh)`.
- Completion: `Animator.AnimatorListener` (`onAnimationStart/End/Cancel/Repeat`); per-frame tap via
  `ValueAnimator.AnimatorUpdateListener` (never bridged per frame in this repo's model).
- Curves live in `android.view.animation`: `LinearInterpolator`, `AccelerateDecelerateInterpolator`
  (the common default), `AccelerateInterpolator`, `DecelerateInterpolator`, `OvershootInterpolator`,
  `AnticipateInterpolator`, `BounceInterpolator`, and `PathInterpolator` (arbitrary cubic-Bézier /
  Path — how Material easing curves are expressed).
- **Does NOT cover spring physics** — that is `androidx.dynamicanimation`, a separate library.
  `Overshoot`/`Anticipate`/`Bounce` interpolators *approximate* spring feel but are
  time-parameterized, not physics-driven.

### `androidx.dynamicanimation` — the physics (spring/fling) system

- `SpringForce`: `setStiffness(float)` + `setDampingRatio(float)` + `setFinalPosition(float)`.
  Named constants (verbatim AOSP values): `STIFFNESS_HIGH = 10000`, `STIFFNESS_MEDIUM = 1500`,
  `STIFFNESS_LOW = 200`, `STIFFNESS_VERY_LOW = 50`; `DAMPING_RATIO_HIGH_BOUNCY = 0.2`,
  `DAMPING_RATIO_MEDIUM_BOUNCY = 0.5`, `DAMPING_RATIO_LOW_BOUNCY = 0.75`,
  `DAMPING_RATIO_NO_BOUNCY = 1.0` (critically damped, no overshoot).
- `SpringAnimation.animateToFinalPosition(float)` — retarget mid-flight, carrying current
  value + velocity (the spring retarget entry point); `setStartVelocity(float)` — velocity handoff.
- `FlingAnimation` — friction-decayed momentum (no target; `setFriction`, `setMin/MaxValue`).
- `DynamicAnimation.OnAnimationEndListener.onAnimationEnd(anim, canceled, value, velocity)` —
  completion event carrying terminal value + velocity.
- **Repo confirmation:** the shipped transient-presence spring (`DAMPING_RATIO_NO_BOUNCY` at
  `STIFFNESS_MEDIUM`) pairs `1.0` / `1500` — a firm, non-overshooting settle. Both constants exist
  as documented.

### Jetpack Compose animation

- `animate*AsState(targetValue, animationSpec, finishedListener)` — discrete-target transition.
- `updateTransition(targetState)` + `Transition.animate*(transitionSpec, targetValueByState)` —
  named-state transition: one enum state fans out to many native-eased properties with per-edge
  specs (`Segment.isTransitioningTo`). The natural lowering target for a future `FxView state`.
- `Animatable.animateTo(...)` is a `suspend` returning an `AnimationResult` whose `endReason` is
  `Finished` / `BoundReached` — the precise await-completion / sequencing model.
- Specs: `spring(dampingRatio, stiffness)` (the **default** spec), `tween(durationMillis,
  delayMillis, easing)`, `keyframes { v at t using e }` / `keyframesWithSpline { v atFraction f }`,
  `snap(delayMillis)`, `repeatable` / `infiniteRepeatable` + `RepeatMode.Restart|Reverse`.
- `Spring` constants mirror `SpringForce`: `StiffnessMedium = 1500f`, `DampingRatioNoBouncy = 1f`,
  etc. Named easings are cubic-Béziers: `FastOutSlowInEasing = (0.4,0,0.2,1)`,
  `LinearOutSlowInEasing = (0,0,0.2,1)`, `FastOutLinearInEasing = (0.4,0,1,1)`.

### Material motion — Android platform-native default tokens

- Easing token families: **Standard** = `cubic-bezier(0.2,0,0,1)` (+ Decelerate `(0,0,0,1)`,
  Accelerate `(0.3,0,1,1)`); **Emphasized** = a two-segment `PathInterpolator`
  (`M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1`), with Decelerate
  `(0.05,0.7,0.1,1)` / Accelerate `(0.3,0,0.8,0.15)`. Emphasized is not expressible as one
  cubic-Bézier — Compose approximates it with paired accelerate/decelerate specs.
- Duration tokens (ms): Short1–4 = 50/100/150/200; Medium1–4 = 250/300/350/400;
  Long1–4 = 450/500/550/600; ExtraLong1–4 = 700/800/900/1000.
- `androidx.compose.material3.MotionScheme` (`standard()` / `expressive()`) provides
  `{default,fast,slow}{Spatial,Effects}Spec()` — the theme-level motion defaults; in M3 Expressive
  the spatial specs are spring/physics-based, superseding raw easing+duration. (Exact per-spec
  stiffness/damping live in internal `MotionTokens` and were not extracted — flagged.)
- **Validates the proposed Android transition presets:** `materialStandard` → the Standard easing
  family; `materialEmphasized` → the Emphasized family. Both map to real, named Material token
  families.

### The cross-platform finding that fixes the spring direction

Android parameterizes springs by **damping ratio + stiffness** across *both* the View-system
`DynamicAnimation`/`SpringForce` *and* Compose `spring()`. iOS SwiftUI `Spring(duration:bounce:)`
parameterizes by **perceptual duration + normalized bounce**. These are different axes with no 1:1
mapping. This is the source-backed reason a single numeric cross-platform spring model is wrong, and
why the iOS / Android expert-timing blocks below carry genuinely different shapes — `FxIosTransition`
in `{ duration, bounce }`, `FxAndroidTransition` in `{ stiffness, dampingRatio }`. It also matches
the repo's already-shipped per-platform spring authoring (`DOC-009`).

## Concept extraction

This table asks: "What animation idea exists on both platforms, even if the names and APIs
diverge?"

| Concept | iOS expression | Android expression | fx driver | Boundary |
|---|---|---|---|---|
| discrete target transition | `.animation(value:)`, `withAnimation`, `UIView.animate`, `CASpringAnimation` | `ViewPropertyAnimator`, `SpringAnimation`, Compose `animate*AsState`, `updateTransition` | `target` | A or B |
| native spring timing | `Spring`, `Animation.spring`, `smooth`, `snappy`, `bouncy` | `SpringForce`, Compose `spring`, Material motion springs/tokens | `target` timing | A or B |
| curve/tween timing | `linear`, `easeIn`, `easeOut`, `easeInOut`, `timingCurve` | `TimeInterpolator`, Compose `tween`, Material easing | `target` timing | A or B |
| named state transition | SwiftUI state + `.animation(value:)`, `phaseAnimator` for simple phase state | Compose `updateTransition`, state-backed `animate*` | `target` | A or B |
| phase animation | `PhaseAnimator` | Compose transition loop / repeatable state sequence | `clock.phase` | A or B |
| keyframe timeline | `KeyframeAnimator` | Compose keyframes / Android animator sets | `clock.keyframes` | A or B |
| repeat / loop | `repeatCount`, `repeatForever`, timeline schedules | Compose `infiniteRepeatable`, `RepeatMode`, animator repeat | `clock` | A or B |
| transition completion semantics | completion closures, logical completion | animator listeners, Compose finished listeners | event contract | A or B |
| scroll-linked animation | `scrollTransition`, `visualEffect` with geometry | nested scroll, Compose scroll state, View scroll listeners | `source` | A or B |
| gesture-linked animation | gesture state + animation / UIKit gesture + animator | gesture detector / nested scroll + dynamic animation | `source` | A or B |
| layout participation | SwiftUI layout protocol / UIKit layout updates | Compose layout / custom View measure / Fabric shadow node | layout | L |
| custom per-frame animation math | `CustomAnimation` | custom animation spec / worklet-style user math | authored continuous | regime C |

The important point: "animation" is not one thing. It is target, timing, clock, source,
layout, events, and custom math.

## Native API extraction

This table asks: "Which native APIs should the platform resolver know about?"

| Platform | API | Concept | Candidate public exposure | Notes |
|---|---|---|---|---|
| iOS | `Animation.default` | platform default timing | combined token | Safe as `platform`, not as raw SwiftUI naming. |
| iOS | `Animation.smooth` / `snappy` / `bouncy` | native spring presets | iOS-specific timing block | Useful expert controls for iOS. |
| iOS | `Spring(duration:bounce:)` | iOS spring parameters | iOS-specific timing block | Matches the repo's existing iOS spring direction. |
| iOS | `Animation.spring(response:dampingFraction:)` | legacy spring shape | native-private or expert-deferred | Less aligned with the current `{ duration, bounce }` path. |
| iOS | `Animation.easeIn` / `easeOut` / `easeInOut` / `linear` | curve timing | combined or iOS-specific curve | Safe if duration and platform fallback are clear. |
| iOS | `Animation.timingCurve(...)` | cubic timing | expert-deferred | Easy to overexpose before use cases prove it. |
| iOS | `delay` / `speed` | timing modifiers | combined modifier | Safe after target timing lands. |
| iOS | `repeatCount` / `repeatForever` | clock modifiers | clock-only | Do not put on presence `transition`. |
| iOS | `PhaseAnimator` | phase clock | combined phase API | Lower only for fx-owned targets. |
| iOS | `KeyframeAnimator` | timeline clock | combined timeline API | Hosted/effect lowering is easier than RN content lowering. |
| iOS | `scrollTransition` / `visualEffect` | source-driven motion | source API | Belongs with Lane 1, not `transition`. |
| iOS | `CustomAnimation` | authored per-frame math | reject/defer | Regime C only. |
| Android | `SpringAnimation` / `SpringForce` | native spring timing | Android-specific timing block | Keeps Android parameterization native. |
| Android | `ViewPropertyAnimator` | content target transition | native-private lowering | Good for transform/opacity on the owned wrapper. |
| Android | `TimeInterpolator` / Material easing | curve timing | combined or Android-specific curve | Prefer Material tokens where available. |
| Android | Compose `animate*AsState` | target transition | native-private lowering | For fx-owned hosted/effect content. |
| Android | Compose `updateTransition` | named state transition | native-private lowering | Maps well to future `FxView state`. |
| Android | Compose `keyframes` / `infiniteRepeatable` | clock timeline/repeat | combined timeline API | Use for fx-owned Compose/effect targets. |
| Android | nested scroll / gesture APIs | source-driven motion | source API | Belongs with Lane 1. |
| Android | custom layout / measure APIs | layout participation | layout API only after Fabric gate | Not additive to V1/V2. |

This table intentionally separates "public exposure" from "native resolver knows this API."
The resolver can use raw native APIs internally. Public JS does not need to mirror them.

## Two directions

### Direction A — platform-first, then universal

This is the Expo UI-shaped direction: expose an iOS-shaped animation config and an
Android-shaped animation config, then provide a universal convenience layer above them.

```tsx
<FxPresence
  visible={open}
  transition={{
    ios: { preset: "snappy" },
    android: { preset: "materialEmphasized" },
  }}
/>
```

Benefits:

- Honest about platform differences.
- Lets expert users reach native-feeling parameters.
- Avoids fake cross-platform spring numbers.
- Can ship incrementally, one platform block at a time.

Costs:

- The JS surface gets wider.
- Users can overfit to one platform.
- The library must still define fallback behavior when only one side is provided.
- If names get too close to SwiftUI or Compose, fx leaks backend vocabulary.

Direction A is acceptable only if the platform blocks still use fx vocabulary, not raw
framework symbols. `ios: { preset: "snappy" }` is acceptable. `ios:
{ swiftUIAnimation: ".snappy" }` is not.

### Direction B — combined fx vocabulary first

This direction exposes shared semantic concepts first and lets the native resolver choose the
platform details.

```tsx
<FxPresence visible={open} preset="transient" transition={{ preset: "platform" }} />
```

Or:

```tsx
<FxView
  state={selected ? "selected" : "idle"}
  motion={{
    idle: fx.motion.identity(),
    selected: fx.motion.scale({ to: 1.04 }),
  }}
  transition={{ tone: "snappy" }}
/>
```

Benefits:

- Smallest public API.
- Best match for platform-native defaults.
- Harder for users to create cross-platform timing mismatches.
- Keeps the manifest as the vocabulary authority.

Costs:

- Requires device-tuned resolver choices before the API feels credible.
- Some platform-specific capabilities become inaccessible until an escape hatch lands.
- If the combined names are too generic, they become fake common API.

Direction B is correct for defaults and common paths. It fails if it pretends that one numeric
spring model maps equally to both platforms.

### Direction C — hybrid

The likely answer is hybrid:

1. Default surface is combined.
2. Expert timing has platform-specific blocks.
3. Raw native framework APIs stay private to the resolver.

```tsx
<FxPresence
  visible={open}
  preset="transient"
  transition={{
    preset: "platform",
    ios: { preset: "snappy" },
    android: { preset: "materialEmphasized" },
  }}
/>
```

The combined key sets the default intent. The platform blocks refine timing without changing
shape. Missing blocks preserve platform defaults.

## Provisional answer

Use the hybrid direction.

Expose an fx animation grammar, then lower it to native APIs per platform.

```txt
JS semantic target/config
  -> fx driver descriptor
  -> platform resolver
  -> native animation primitive
  -> native-owned frames
  -> semantic event
```

This keeps the existing architecture intact:

- JS sends discrete targets, config, and optional native-timing descriptors.
- Native owns every frame.
- Native returns completion or boundary events, never frame streams.
- Platform divergence stays in the lowering layer.
- RN content motion stays on the owned `expo-view` wrapper, not hosted inside SwiftUI or
  Compose.

## Public surface direction

### `transition` handles target timing first

Start with the existing `transition` prop. It is already the timing escape hatch, and it does
not require layout/Fabric work.

```tsx
<FxPresence
  visible={open}
  preset="transient"
  transition={{
    ios: { preset: "snappy" },
    android: { preset: "materialEmphasized" },
  }}
/>
```

Possible shape:

```ts
type FxTransition = {
  preset?: "platform";
  delay?: number;
  speed?: number;
  ios?: FxIosTransition;
  android?: FxAndroidTransition;
};

type FxIosTransition =
  | { preset: "default" | "smooth" | "snappy" | "bouncy" }
  | { type: "spring"; duration?: number; bounce?: number }
  | { type: "curve"; curve: "linear" | "easeIn" | "easeOut" | "easeInOut"; duration?: number };

type FxAndroidTransition =
  | { preset: "platform" | "materialStandard" | "materialEmphasized" }
  | {
      type: "spring";
      stiffness?: number | "low" | "medium" | "high";
      dampingRatio?: number | "noBounce" | "bouncy";
    }
  | { type: "curve"; curve: "linear" | "fastOutSlowIn" | "easeIn" | "easeOut"; duration?: number };
```

Rules:

- Omitting a platform side keeps that platform's default.
- Supplying a platform side opts into expert timing only, not shape.
- `motion` remains the explicit shape override.
- `preset` remains the platform-native full behavior.
- The native resolver rejects unsupported combinations instead of approximating silently.

### `state` is target semantics, not another animation API

Animation state should be semantic state plus target timing:

```tsx
<FxView
  state={selected ? "selected" : "idle"}
  motion={{
    idle: fx.motion.identity(),
    selected: fx.motion.scale({ to: 1.04 }),
  }}
  transition={{ preset: "platform" }}
/>
```

Native transitions between named states. JS does not author frames.

### `phase` is a clock driver

`PhaseAnimator` maps to a native clock over named phases, not to `transition`.

```tsx
<FxView
  phase={{
    phases: {
      rest: fx.motion.identity(),
      lift: fx.motion.scale({ to: 1.03 }),
      settle: fx.motion.identity(),
    },
    repeats: false,
    transition: { preset: "platform" },
  }}
/>
```

This can drive fx-owned content wrappers or fx-owned effects. It must not drive arbitrary RN
children individually.

### `keyframes` is a later clock driver

Keyframes are more expressive and easier to overbuild, so they should land after target and
phase.

```tsx
<FxView
  timeline={fx.timeline({
    opacity: [
      { at: 0, value: 0 },
      { at: 0.4, value: 1 },
      { at: 1, value: 1 },
    ],
    scale: [
      { at: 0, value: 0.96 },
      { at: 0.7, value: 1.02 },
      { at: 1, value: 1 },
    ],
  })}
/>
```

Lowering differs by target:

- hosted/effect target: SwiftUI `KeyframeAnimator` or Compose keyframes can apply;
- content target: use UIKit/Core Animation or Android View primitives on the fx-owned wrapper;
- RN content must not be hosted in SwiftUI just to get keyframes.

### `source` is interaction, scroll, and sensor

`visualEffect` and `scrollTransition` are source-driven, not timing-driven. They belong to
the Lane 1 signal grammar.

```tsx
<FxView
  interaction={{
    type: "scrollCollapse",
    source: scrollRef,
  }}
/>
```

Native reads the source, maps progress, drives transform/opacity or effect uniforms, and emits
only boundary events.

## What can happen before layout/Fabric

These are additive and can land before measured layout work:

1. `transition` expansion for existing target-driver content motion.
2. Hosted/effect timing for fx-owned pixels.
3. `FxView state` transitions if they only animate the single fx-owned wrapper.
4. Phase animation over fx-owned wrappers/effects.
5. Keyframes over fx-owned wrappers/effects, after phase proves the clock driver.
6. Source-driven Lane 1 interactions that only affect transform/opacity or effect uniforms.

These must wait for Fabric/layout or a separate architecture gate:

1. Height, width, flex, or sibling reflow.
2. Measured-content flow that contributes size to Yoga.
3. Shared-element transitions across tree locations.
4. Reorder commits and cross-tree mutation coordination.
5. Arbitrary user-authored per-frame mapping of fx-owned state.

## Sequencing

1. Expand `transition` for the `target` driver.
2. Add `FxView state` over the same target driver.
3. Add `clock.phase` for native phase loops and one-shots.
4. Add `clock.keyframes` after phase proves scheduling and events.
5. Add `source` interactions through the Lane 1 grammar.
6. Add layout participation only after the Fabric/layout boundary work.
7. Consider authored continuous mapping only if a concrete interaction fails the native-source
   falsifying test.

## Architecture impact

No V1/V2 architecture change is required for target timing, state, phase, keyframes over
fx-owned targets, or native-source interaction. They reuse the existing contract:

```txt
targets/config in -> native owns frames -> semantic events out
```

Architecture changes begin only when a capability needs one of these:

- writes to Yoga/Fabric layout;
- cross-tree identity and retention;
- user-authored per-frame logic for fx-owned state;
- raw platform framework names in the public API;
- hosting RN content inside SwiftUI or Compose to animate it.

## Sources

- Apple SwiftUI animation documentation: https://developer.apple.com/documentation/swiftui/animations
- Apple SwiftUI `Animation` DocC JSON: https://developer.apple.com/tutorials/data/documentation/swiftui/animation.json
- Apple SwiftUI `Spring` DocC JSON: https://developer.apple.com/tutorials/data/documentation/swiftui/spring.json
- Apple SwiftUI `PhaseAnimator` DocC JSON: https://developer.apple.com/tutorials/data/documentation/swiftui/phaseanimator.json
- Apple SwiftUI `KeyframeAnimator` DocC JSON: https://developer.apple.com/tutorials/data/documentation/swiftui/keyframeanimator.json
- Apple SwiftUI `UnitCurve` DocC JSON: https://developer.apple.com/tutorials/data/documentation/swiftui/unitcurve.json
- Android `android.view.animation` package reference: https://developer.android.com/reference/android/view/animation/package-summary
- Local Xcode iOS 26.5 SwiftUICore symbol graph, extracted with `swift-symbolgraph-extract`.
- `0-spine/04` / `0-spine/05` — the canonical boundary and regime classifier (`research/wip/capability-boundary-classifier.md` is the historical derivation).
- `research/0-spine/05-native-boundary-decision.md` — source-driven Lane 1 grammar.
- `research/wip/interactive-content-distort.md` — a feature applying this chaining API + the Lane 1
  `source` grammar: the interactive water-ripple (gesture-driven effect uniform; impulse animation).
- `research/3-motion/41-motion-vocabulary.md` — `preset` / `motion` / `transition` split.
- `research/4-runtime/34-animation-driver.md` — target driver and retarget mechanics.
