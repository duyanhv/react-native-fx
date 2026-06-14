# Native animation API extraction
Status: open — WIP, non-authoritative
Phase: post-v2 exploration
Feeds: `0-spine/02-capability-ir-and-lowering.md`, `3-motion/40-motion-reactivity-and-data-flow.md`, `3-motion/41-motion-vocabulary.md`, `4-runtime/34-animation-driver.md`, `5-realization/structure.{ios,android}.md`
Scope: compare two expansion directions for native animation APIs: expose platform-shaped iOS and Android surfaces first, or combine the shared concepts into an fx vocabulary first. The research extracts both animation concepts and concrete native APIs before deciding what belongs in public JS.

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
| Android `android.animation` | pending | Needed for property animation and `TimeInterpolator` |
| Android DynamicAnimation | pending | Needed for `SpringAnimation` / `SpringForce` |
| Jetpack Compose animation | pending | Needed for `AnimationSpec`, `spring`, `tween`, `keyframes`, `updateTransition`, and `animate*AsState` |
| Material motion | pending | Needed for Android platform-native default tokens |

Apple Developer Documentation pages are backed by DocC JSON at:

```txt
https://developer.apple.com/tutorials/data/documentation/<module>/<symbol>.json
```

Use the DocC JSON for documentation structure, topic grouping, prose summaries, relationships,
and symbol references. Use the Xcode symbol graph for compile-accurate signatures against the
installed SDK.

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
- `research/wip/capability-boundary-classifier.md` — boundary and regime classifier.
- `research/wip/lane1-signal-grammar.md` — source-driven Lane 1 grammar.
- `research/wip/interactive-content-distort.md` — a feature applying this chaining API + the Lane 1
  `source` grammar: the interactive water-ripple (gesture-driven effect uniform; impulse animation).
- `research/3-motion/41-motion-vocabulary.md` — `preset` / `motion` / `transition` split.
- `research/4-runtime/34-animation-driver.md` — target driver and retarget mechanics.
