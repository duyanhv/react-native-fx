# Motion, reactivity & data flow
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the reactive/transition channel + the data-flow contract (cross-platform).

## Why this matters

This is the DX heart of fx: how presentation state stays *alive and reactive* without JS
ever driving frames. Get this wrong and the experience is laggy; get it right and discrete,
low-frequency JS updates produce silky native animation. The rule that makes it work —
**JS sets targets, native animates to them** — is the same rule that lets fx stay on a
thin async boundary with no JSI/C++.

## The three data-flow regimes

Every real-world presentation driver — an effect, a presence envelope, a mounted state, a
press feedback — sorts into one of three regimes by *how its driving value flows*, not by
what it looks like:

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
discrete target once; native ramps to it. The targets are the **actual surface props**, not
a generic state zoo:

1. **Steady config** → effect `uniforms` on `<Fx effect={…}>` / `fx.effect.*`; changes eased
   by `transition`.
2. **Presence** → `FxPresence`'s `visible` (boolean) — native plays enter → hold → exit (`42`).
3. **Mounted state** → `FxView`'s `state` (named) — native eases between the state's motions (`57`).
4. **Capability triggers** → a **discrete trigger *value*** where a capability needs one
   (e.g. `symbol`'s `trigger`, `24`), set by *your* code — not an fx-owned recognizer.

```tsx
<FxPresence visible={open} preset="transient" onTransitionEnd={advance} />
<FxView state={selected ? 'selected' : 'idle'} preset="lift" />
<Fx effect={fx.effect.glow({ intensity })} transition={{ duration: 400 }} />
```

There is **no generic `mood`/`playing` top-level state** — those were demoted; a curated
effect may carry such ideas as its own effect-specific *uniforms*, never as a global surface
prop. **One-shots are discrete trigger *values*, not a blessed imperative `ref.fire()`** — if
`4-runtime` later proves an imperative one-shot is genuinely needed, it adds it; until then a
one-shot is a state/trigger value that flips and native runs the envelope.

Native owns the envelope math (the damped-cosine burst, the intro reveal), driven by
`time`. JS never computes it.

## The contract, per surface

The data-flow contract is concrete per owner — each surface is a *target type* with a
defined down-channel (what JS sets) and up-channel (what native returns):

| Surface | JS sets (down) | Target type | Native does | JS sees (up) |
|---|---|---|---|---|
| `FxPresence` | `visible` (bool) | **lifecycle** | enter → hold → exit envelope + deferred unmount | `onTransitionEnd({phase})` |
| `FxView` | `state` (named) | **mounted-state** | eases transform/opacity between the state's motions | `onStateChange` / `onTransitionEnd` |
| `<Fx effect>` | effect `uniforms`/config | **effect** | native-eased uniform changes (`time` native-injected) | `onLoad`/`onError`/`onTransitionEnd` |
| `FxPressable` | `feedback` (preset) | **recognizer** | native press response | `onPress*` |

All down-channels are **discrete props**; all up-channels are **discrete events** (`04`/`35`).
No surface streams frames.

## One-shots: the trigger model

A one-shot (a burst, a `symbol` bounce) is a **declarative discrete trigger *value***, not an
imperative call:

```tsx
<Fx effect={fx.effect.symbol({ name: 'heart', animation: 'bounce', triggerKey: likes })} />
// native fires the envelope each time `triggerKey` changes value (a key / version / counter)
// the trigger lives inside the effect config — there is no generic `<Fx trigger>` surface prop
```

- **Canonical — declarative trigger values** (`trigger` / `triggerKey` / `version`): native
  runs the envelope on each *change*. Fits "JS desired state in, native frames out" with no
  imperative surface.
- **Deferred — imperative `ref.fire()`**: useful, but it makes the API imperative and must be
  **justified by a real runtime need** (`4-runtime`); not blessed in V1. If it lands it is
  additive over the same envelope, not a replacement.

## native → JS (state back to the app)

Constrained to discrete/low-frequency, never a per-frame stream:

- **Push** — `Events`: `onPress*`, `onTransitionEnd`/`onStateChange`, and — load-bearing
  now BYO is first-class — **`onLoad`/`onError`** (a developer's `.metal`/`.agsl` can
  fail to compile; JS needs to fall back).
- **Pull** — a view `AsyncFunction` returning a value (`snapshot()`/`getUniform()`) for
  "what's the current value right now," on demand.
- **Never** — a per-frame native→JS stream. Continuous JS-side tracking of a native
  value is the Reanimated shared-value path (post-V1).

## Event payloads (semantic, low-frequency)

Enough shape to design the API against — discrete only, never a frame stream:

```ts
onTransitionEnd({
  owner: 'presence' | 'view' | 'effect',   // which surface fired
  phase?: 'enter' | 'exit',                 // presence only
  state?: string,                           // view only (the state that settled)
  finished: boolean,                        // ran to completion
  interrupted: boolean,                     // a retarget cut it short
})
```

`onStateChange` carries `{ from, to }`; `onPress*` carry the standard press payload;
`onLoad`/`onError` carry `{ ok }` / `{ error }`. All are **events, not streams** (`35`).

## Interrupt semantics (retarget, never blind restart)

Native feel lives here. When a target changes **mid-flight**, the native envelope
**retargets from its current value** — it does not restart from zero:

- `visible: true → false → true` — a re-enter mid-exit retargets toward *present* from
  wherever the exit had reached; no jump-to-offscreen-then-slide.
- `state: idle → selected → idle` — eases from the in-flight transform, not from `idle`'s.
- **`preset` changes during animation** — the in-flight motion retargets to the new preset's
  resting shape; it does not snap.
- **`transition` changes during animation** — the *timing* of the remainder updates; the
  current value is preserved (no position jump).

The lifecycle FSM (`35`) owns this; the driver (`34`) implements the interruptible spring.
The contract here: **retarget from the present value, preserve continuity, emit
`interrupted: true`** — never a blind restart.

## Motion drivers (realization → structure.\*)

The native side animates targets with each platform's animation system —
`phaseAnimator`/`keyframeAnimator`/spring on iOS, Compose `animate*`/`updateTransition`
+ M3 Expressive physics springs on Android. Those mechanics live in
`structure.{ios,android}.md`; this doc owns the *contract* (targets in, native eases,
discrete events out).

## Escaping Regime C (when an effect genuinely needs it)

Two clean routes, never per-frame `setUniform` from the **JS thread**:

1. **Make the source native** — if the driver is a native scroller/pager, read its
   offset natively and write the uniform natively (onboarding morph, scroll-reactive
   backgrounds; no JS, no Reanimated). The sleeper win.
2. **UI-thread channel** — Reanimated shared values / animated props (gesture writes a
   shared value off the JS thread, bound to a uniform). The silky bring-your-own-gesture
   path; **post-V1**, additive over the same uniform names.

**On `setUniform` itself.** The imperative `setUniform`/`setHighlight` (`4-runtime/30`/`51`)
are not banned — they are a **low-frequency / debug / `controlled`-mode escape hatch**, not a
frame source. What's forbidden is *per-frame writes from the JS thread*; a discrete write, or
a `controlled` surface whose per-frame source is the UI thread (route 2), is exactly the
sanctioned use. `setUniform` is the escape, never the default channel (`51`).

## Decisions

1. **JS sets targets; native animates.** No per-frame JS↔native, either direction.
2. **`transition` (native-eased uniform changes)** is a first-class channel — it makes
   discrete Regime-B updates feel continuous.
3. **Reactivity is discrete surface targets, not a state zoo** — `visible` (FxPresence),
   `state` (FxView), effect `uniforms`, and capability trigger *values* + completion events;
   native owns the envelope. **No generic `mood`/`playing`; no blessed imperative `ref.fire()`
   yet** (a one-shot is a discrete value until `4-runtime` proves otherwise).
4. **`onLoad`/`onError` are part of the contract** — BYO shaders can fail; JS must learn.
5. **native→JS is push (Events) + pull (snapshot), never a per-frame stream**; continuous
   tracking is the post-V1 Reanimated path.
6. **Regime C routes to a native source read first, the UI-thread channel second** —
   never JS-per-frame.

## Open questions

- **`transition` scope** — all uniforms, or per-uniform easing config?
- **The named-state vocabulary** per `FxView` preset (`idle`/`selected`/… ; ties to `57`/`50`).
  `mood`/`playing` are demoted to effect-specific *uniforms*, never global props.
- **Native-source-read API** — how an effect declares "track this native scroll/pager"
  (the Regime-C option-1 surface); is it V1 or V2?
- **BYO envelope** — how a BYO author declares an intro/outro envelope in `.metal`/`.agsl`
  so it isn't hardcoded to the curated glow.

## Sources

- This document is synthesized from the design conversation (regimes, the transition
  channel, native↔JS lanes); no single legacy doc.
- `02-capability-ir-and-lowering.md` (`clock`, per-rung), `30-interaction-and-gestures.md`
  (the recognizer as a native driver), `structure.{ios,android}.md` (animation mechanics).
