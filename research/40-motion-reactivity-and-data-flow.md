# Motion, reactivity & data flow
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the reactive/transition channel + the data-flow contract (cross-platform).

## Why this matters

This is the DX heart of fx: how an effect stays *alive and reactive* without JS ever
driving frames. Get this wrong and the experience is laggy; get it right and discrete,
low-frequency JS updates produce silky native animation. The rule that makes it work —
**JS sets targets, native animates to them** — is the same rule that lets fx stay on a
thin async boundary with no JSI/C++.

## The three data-flow regimes

Every real-world effect sorts into one of three regimes by *how its driving value
flows*, not by what it looks like:

- **A — fully native.** The driver is native (`time`, the press recognizer). Ambient
  backgrounds, floating buttons, finger-following glow. Zero JS in the loop →
  structurally lag-free.
- **B — low-frequency JS.** JS pushes a value a few times per second / on a user
  action (progress, theme swap, a state change). Imperceptible cost.
- **C — continuous, JS-side source.** A value that changes every frame whose source is
  on the JS/gesture side (onboarding morph-on-swipe, scroll-reactive backgrounds,
  drag-driven heroes). **This is the only lag trap.**

The whole design keeps work in A and B and forbids C-on-the-JS-thread.

## The reactive / lifecycle channel

The mechanism that makes B *feel* like C: **native-eased transitions.** JS changes a
target once; native ramps to it. Three sub-channels, all discrete:

1. **Steady config** → `uniforms`/props; changes eased by `transition`.
2. **Lifecycle state** → a declarative prop (`state`/`mood`/`playing`). Native plays
   intro→hold→outro as it flips.
3. **One-shot triggers** → imperative `ref.fire()`; native runs the whole timed
   envelope (the burst), emitting `onTransitionEnd`/`onStateChange` so JS can sequence.

```tsx
<EdgeGlow
  mood="listening"                      // preset (palette + speed), resolved in JS
  uniforms={{ intensity: 0.9 }}
  transition={{ duration: 400, easing: 'easeInOut' }}  // native tweens on change
  playing={isLoading}                   // lifecycle state
  onTransitionEnd={advanceState}        // discrete back-channel
  ref={ref}                             // ref.fire() = burst
/>
```

Native owns the envelope math (the damped-cosine burst, the intro reveal), driven by
`time`. JS never computes it.

## native → JS (state back to the app)

Constrained to discrete/low-frequency, never a per-frame stream:

- **Push** — `Events`: `onPress*`, `onTransitionEnd`/`onStateChange`, and — load-bearing
  now BYO is first-class — **`onLoad`/`onError`** (a developer's `.metal`/`.agsl` can
  fail to compile; JS needs to fall back).
- **Pull** — a view `AsyncFunction` returning a value (`snapshot()`/`getUniform()`) for
  "what's the current value right now," on demand.
- **Never** — a per-frame native→JS stream. Continuous JS-side tracking of a native
  value is the Reanimated shared-value path (post-V1).

## Motion drivers (realization → structure.\*)

The native side animates targets with each platform's animation system —
`phaseAnimator`/`keyframeAnimator`/spring on iOS, Compose `animate*`/`updateTransition`
+ M3 Expressive physics springs on Android. Those mechanics live in
`structure.{ios,android}.md`; this doc owns the *contract* (targets in, native eases,
discrete events out).

## Escaping Regime C (when an effect genuinely needs it)

Two clean routes, never per-frame `setUniform` from JS:

1. **Make the source native** — if the driver is a native scroller/pager, read its
   offset natively and write the uniform natively (onboarding morph, scroll-reactive
   backgrounds; no JS, no Reanimated). The sleeper win.
2. **UI-thread channel** — Reanimated shared values / animated props (gesture writes a
   shared value off the JS thread, bound to a uniform). The silky bring-your-own-gesture
   path; **post-V1**, additive over the same uniform names.

## Decisions

1. **JS sets targets; native animates.** No per-frame JS↔native, either direction.
2. **`transition` (native-eased uniform changes)** is a first-class channel — it makes
   discrete Regime-B updates feel continuous.
3. **Reactivity is state + triggers, not values** — declarative `state`/`mood`/`playing`
   + imperative `fire()` + completion events; native owns the envelope.
4. **`onLoad`/`onError` are part of the contract** — BYO shaders can fail; JS must learn.
5. **native→JS is push (Events) + pull (snapshot), never a per-frame stream**; continuous
   tracking is the post-V1 Reanimated path.
6. **Regime C routes to a native source read first, the UI-thread channel second** —
   never JS-per-frame.

## Open questions

- **`transition` scope** — all uniforms, or per-uniform easing config?
- **`state`/`mood` as a uniform vs a first-class prop** — and the named-state vocabulary
  per curated effect (ties to `50`).
- **Native-source-read API** — how an effect declares "track this native scroll/pager"
  (the Regime-C option-1 surface); is it V1 or V2?
- **BYO envelope** — how a BYO author declares an intro/outro envelope in `.metal`/`.agsl`
  so it isn't hardcoded to the curated glow.

## Sources

- This document is synthesized from the design conversation (regimes, the transition
  channel, native↔JS lanes); no single legacy doc.
- `02-capability-ir-and-lowering.md` (`clock`, per-rung), `30-interaction-and-gestures.md`
  (the recognizer as a native driver), `structure.{ios,android}.md` (animation mechanics).
