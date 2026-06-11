# Motion vocabulary (the agnostic primitives)
Status: researched (semantics) · the executing runtime is open (→ 4-runtime/33–35)
Phase: v1 (semantics) · v2 (the owned runtime)
Feeds: 42-presence-and-lifecycle.md, 50-api-and-presets.md, 55-composition-chain.md
Owns: the agnostic motion IR (semantics). Mechanics → 4-runtime + structure.{ios,android}.

## Why this matters

Motion is now a **peer domain of Effects**, not a single reactive channel. This doc owns
its vocabulary — the small, agnostic set the consumer composes — and the **law** that
keeps "agnostic API" and "feels native" from contradicting:

> **A platform-native default may diverge in both timing *and* shape.** Native feel is not
> only the curve — it is **shape, origin, distance, edge/anchor, timing, and interruption**.
> So a `preset` resolves the *whole behavior* per platform (iOS and Android may differ in
> geometry, not just spring). fx never ships a cross-platform-uniform default; **only an
> explicit `motion` override forces a fixed cross-platform shape** (partial `edge`/`origin`
> sugar is deferred — see Open questions).

Curve-native-only would still produce the "cross-platform animation skin" feeling — same
geometry everywhere, just eased natively. The law is therefore **shape-native**: the
platform owns the shape too, until the user opts out of it.

## The preset / motion / tune / transition split (the main decision)

Four props, four jobs — this is what makes shape-native work without forcing the user to
design motion:

| Prop | Job | Cross-platform behavior |
|---|---|---|
| **`preset`** | a **platform-idiomatic behavior bundle** — `transient`, `lift`, … | fx resolves the **whole shape + timing per platform** (may diverge) |
| **`motion`** | an **explicit shape override** (a typed `MotionSpec` map) | the user **fixes** the shape **cross-platform** (opt-in uniformity) |
| **`tune`** *(deferred — V1.x / MOT-001)* | **intent adjustment** inside the platform family (`speed`/`emphasis`/`distance`) | stays platform-native; never raw curves |
| **`transition`** | **expert timing override** (`duration`/`delay`/`easing`/`spring`) | the escape hatch for timing only |

**V1 ships the `preset`/`motion`/`transition` triad; `tune` is deferred (Decision 13,
DOC-019).** The triad is load-bearing — the law needs a default behavior, an explicit-override
channel, and a timing escape hatch. `tune` is a third adjustment axis whose `{speed, emphasis,
distance}` semantics are invisible until MOT-001 device-tunes the formulas (the open `MOT-002`
vocabulary), and whose job overlaps `preset` (intent) and `transition` (timing). It resurrects
with MOT-001's device-proven catalog. The rest of this section keeps `tune`'s design for that
resurrection; it is simply absent from the V1 surface.

So the default door is `<FxPresence preset="transient" />` — fx picks the
platform-appropriate transient presentation on each OS. The moment the user supplies a
`motion` map, *they* have chosen the shape and it goes uniform — the **only** sanctioned way
to leave the platform default (there is no partial-override sugar like `edge=`; it's preset
*or* explicit `motion`). What "uniform" fixes is the **semantic geometry**, not necessarily
raw pixels: a measured channel (`{ measure: 'edge' }`, the `Travel` token below) still
resolves its magnitude **natively from layout**, so the *shape* is cross-platform-fixed while
the *distance* tracks the real view. Presets are **behavior-named, not
UI-named** (`transient`/`lift`, never `toast`/`card`) — fx owns the behavior, not the
component (`56`).

## `fx.motion` → `MotionSpec` (the builder + type)

Motion has its own builder and data type, the parallel of `fx.effect`/`EffectStack`
(`55`). `fx.motion.*` produces a **`MotionSpec`** — a **shape only**: which agnostic
properties move. It is **not** timing (that is `transition`), **not** phase/state (the
*map key* supplies that), and **not** a visual layer:

```ts
type Edge   = 'top' | 'bottom' | 'left' | 'right';
type Origin = 'center' | Edge | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
            | { x: number; y: number };          // transform anchor for scale/rotate

/** A translate magnitude. Either a JS-fixed delta (uniform points), or a token whose
 *  magnitude **native** resolves from the post-layout frame (`42`/`33`) — so "slide from
 *  the bottom" works without JS ever knowing the view's size. */
type Travel =
  | number                                   // a fixed delta in points (user-chosen, uniform)
  | { measure: 'edge'; edge: Edge };         // native-measured edge travel (× `tune.distance`)

interface MotionSpec {                  // a SHAPE only — agnostic channels; measured channels defer to native
  opacity?: number;
  scale?: number;
  translateX?: Travel;
  translateY?: Travel;
  rotate?: number;                      // degrees
  origin?: Origin;                      // transform anchor for scale/rotate
}

fx.motion.edgeIn({ from: 'bottom' })   // → { translateY: { measure: 'edge', edge: 'bottom' }, opacity: 0 }
fx.motion.edgeOut({ to: 'bottom' })    // → { translateY: { measure: 'edge', edge: 'bottom' } }
fx.motion.scale({ to: 1.03 })          // → { scale: 1.03 }
fx.motion.identity()                   // → {}  (the fallback shape)
```

**No `phase`, no `transition`, no `from`/`to` *inside* the spec.** The spec is the
**unresolved** semantic shape: numeric channels are fixed deltas, but a measured channel
(edge travel) carries a **token native resolves** to a concrete delta from the post-layout
frame (`42`/`33`) — JS never needs the view's size. The owning `motion` *map key* supplies
the lifecycle/state meaning (so `motion={{ exit: fx.motion.edgeIn() }}` has one source of
truth); timing comes from the component's `transition` (or `.animate()` on an effect step).
**`from`/`to` are *builder inputs*, not fields** — they resolve to a `translateX/Y`
**measured token** (`{ measure: 'edge' }`) whose magnitude the **native measurement
contract** (`42`/`33`) fills in.

`MotionSpec` is what `FxPresence`'s `motion` and `FxView`'s `motion` accept as a **typed
map** — a *different* map per component (lifecycle phases vs mounted states), never one
universal map:

```tsx
<FxPresence motion={{ enter: fx.motion.edgeIn({from:'bottom'}), exit: fx.motion.edgeOut({to:'bottom'}) }} />
<FxView     motion={{ idle: fx.motion.identity(), selected: fx.motion.scale({to:1.03}) }} />
```

It lowers to the `motion` driver node (`02`), is **never** an `EffectStack` member, and
`transition` (timing) is its own separate type. Supplying a `motion` map is the **explicit
shape override** — it fixes the shape cross-platform (the law). The semantic defaults come
from the **`preset`** (not `role`); the raw `fx.motion.*` map is the escape hatch.

### The motion-map fallback (one rule everywhere)

```
effectiveMotion(key) = userMotion[key] ?? presetMotion[key] ?? identity
```

**No implicit reverse** — a missing `exit` is *not* `enter` reversed unless the preset
defines it. An unknown `state` key degrades to `identity` (with a dev warning). The same
rule applies to presence phases and mounted states alike.

## Findings

### The driver layer beneath the vocabulary

The four props are sugar over a deeper layer: an animatable property — a content channel
or an effect uniform, the same thing — bound to a **native driver** (`02` decision 14).
Three drivers: **`target`** (discrete state → platform-native spring; what ships today),
**`clock`** (a native timeline: loop, pulse, keyframe sequence, stagger), **`source`**
(a native scroll/gesture value, mapped natively — `40` decision 7). `preset="transient"`
expands to a `target`-driver binding with platform-native springs; the four-prop front
door does not change. `target` + `clock` build first; `source` is V2 and substrate-tiered.

### One driver node, two targets

The vocabulary lowers to a single manifest node — **`motion` (`kind:'driver'`)** — whose
ladder splits by *what is animated* (`0-spine/02`):

| Target | iOS rung | Android rung | Substrate |
|---|---|---|---|
| **content** (the fx-owned wrapper carrying RN content; transform/opacity) | render-server spring (`CASpringAnimation`); `SwiftUI.Spring` integrator on retarget · `os:17` | `dynamicanimation` / `ViewPropertyAnimator` | `expo-view` |
| **effect** (fx's own drawn layer) | SwiftUI `.animation` | Compose `animate*AsState` | `hosted` |

Content motion is **transform/opacity only** on the **fx-owned wrapper** (carrying RN content,
`33`), so hit-testing geometry moves with it and **touch survives** (rule #4). The native animator owns timing; fx sets
discrete targets (the contract, `40`).

### `presence` and `.animate()` are orchestrations, not new primitives

`FxPresence` (`54`) composes `motion` into an enter/hold/exit envelope keyed by `visible`
+ `preset`; the chain's `.animate()` (`55`) attaches a `transition` to a stacked layer.
Both dispatch to the `motion` rungs. The lifecycle/role layer lives in the runtime
(`33`–`35`) and surface, not the manifest.

### Platform-exclusive motion

Genuinely platform-only motion (SwiftUI `phaseAnimator`-style phase cycling; Android M3
shape morph) is expressed the `shape-morph` way — a platform-only node with an empty
ladder on the other side, degrading to `{via:'none'}`. Agnostic where shared; honestly
platform-only where exclusive; never a fake-agnostic shape.

## Verifying the law (operational test)

"Platform-native defaults" is only a principle if it is checkable. Three concrete tests —
a default that fails any is a violation:

1. **Nameable source.** Every default — **shape *and* curve** (the enter/exit geometry, the
   spring, each `tune` level) — must trace to a **named platform source** (iOS: system
   spring / `UISpringTimingParameters`, the platform's transient/sheet presentation;
   Android: the platform's standard spring / Material motion (M3 Expressive `MotionScheme`
   where present), Material emphasized easing, the platform's snackbar/sheet).
   A shape or curve no reviewer can attribute to a platform default fails.
2. **No uniform invention.** The *same shape or curve* hardcoded on both platforms — **absent
   an explicit user `motion` override** — is a violation. Two platforms should resolve
   the same `preset` to *their own* geometry and timing; uniformity is opt-in only.
3. **Native-component parity.** Side-by-side on both devices, a `preset` should feel like the
   platform's own equivalent presentation, compared against the real native behavior — not
   against fx-iOS vs fx-Android.

The artifact this produces is a **per-platform default catalog**: one row per (preset ×
phase/state) naming the platform source, **shape, and curve**. That catalog is the law made
auditable; it lives with the preset catalog in `42`/`56` and is filled on device.

## Decisions

1. **The motion vocabulary lowers to one `motion` driver node**, content rung +
   effect rung, chosen by target (`0-spine/02`).
2. **Semantic over primitive, both public** — `appear`/`dismiss`/`emphasis` over the raw
   animatable properties; customize by intent, biased to the platform.
3. **The law is shape-native, not curve-native** — a platform-native default may diverge in
   timing *and* shape (origin, distance, edge/anchor, geometry, interruption). This doc holds it.
4. **Presence and the chain consume `motion`** — no separate primitive.
5. **Platform-exclusive motion = empty-ladder node**, not forced agnostic.
6. **`preset` / `motion` / `tune` / `transition` are four distinct jobs** — `preset`
   resolves the whole behavior per platform; `motion` is the explicit cross-platform shape
   override; `tune` adjusts intent inside the platform family; `transition` is expert timing.
   *(V1 ships the `preset`/`motion`/`transition` triad; `tune` is deferred — Decision 13.)*
7. **Presets are behavior-named, not UI-named** (`transient`/`lift`, never `toast`/`card`);
   `motion` is a typed map, *different per component* (phases vs states), never one universal map.
8. **Motion-map fallback** = `userMotion[key] ?? presetMotion[key] ?? identity`; no implicit
   reverse; unknown keys → identity (with a dev warning).
9. **Reduce-motion is instant degradation.** When the OS reduce-motion or animation-scale
   setting is active (iOS `UIAccessibility.isReduceMotionEnabled`, Android
   `Settings.Global.TRANSITION_ANIMATION_SCALE` = 0.0 or `ANIMATOR_DURATION_SCALE`
   = 0.0), the animation driver sets all motion envelopes to 0 duration — snap to
   target, no interpolation — and fires `onTransitionEnd` immediately. This applies to
   all content motion (presence enter/exit, state transitions). Opacity-only degradation
   is a deferred V2 refinement. Decorative effects (shaders, materials) have their own
   native clock and are not gated by the motion reduce-motion policy in V1.
10. **The vocabulary rides the driver layer (DOC-009, 2026-06-10).** `preset` / `motion` /
    `tune` / `transition` are sugar over *animatable properties bound to native drivers* —
    `target` / `clock` / `source` (`02` decision 14, `40` decision 7). The four-prop front
    door is unchanged; drivers are the layer beneath it, and the layer the "feels
    primitive" fixes land in.
11. **Springs are authored per platform; the uniform `{damping,mass,stiffness}` shape is
    dropped (DOC-009, 2026-06-10).** `transition.spring` takes each platform's own
    parameterization — iOS `{ duration, bounce }` (the iOS 17 unified spring); Android
    `{ stiffness, dampingRatio }` (`SpringForce` values or tokens; M3 Expressive
    `MotionScheme` tokens where present). Omitting a side keeps that platform's tuned
    default — the law, applied to timing authoring. The lossless bridge for internal
    conversion: `bounce ≈ 1 − dampingRatio`, `stiffness ≈ (2π/duration)²`. One invented
    cross-platform spring tuned to feel native on both is exactly the janky middle this
    forbids.
12. **The V1 primitive layer is the driver vocabulary, not a Compose-style enter/exit set
    (DOC-009, 2026-06-10).** V1 ships the ratified presets (DOC-005) and the `fx.motion.*`
    builders over the `target` driver; `emphasis` lives in `tune`, press response in
    `feedback` (`57`). Compose's `fadeIn`/`slideIn` names are not borrowed — the builders
    stay `edgeIn`/`edgeOut`/`scale`/`identity`. Multi-step sequences and one-shot bursts
    arrive with the `clock` driver (`42` decision 6), not as more named primitives.
13. **V1 ships `preset`/`motion`/`transition`; `tune` is deferred to MOT-001 (DOC-019,
    2026-06-11).** `tune` is the weak member of the four — a third intent axis whose
    `{speed, emphasis, distance}` formulas are device-pending (the open `MOT-002`) and whose
    job overlaps `preset` (intent) and `transition` (timing). No comparison library ships a
    separate intent axis (Reanimated: entering/exiting + transitions; Framer: variants +
    transition). It costs nothing to cut now — it does not exist in code. The four-prop design
    is retained for MOT-001's resurrection; the V1 *surface* exposes the triad only.

## Open questions

- The minimal animatable-property set and the `tune` vocabulary (`speed`/`emphasis`/
  `distance` — enough?) and the `preset` value set per component.
  **`tune` is deferred from the V1 surface (DOC-019):** its vocabulary stays the open `MOT-002`
  device work and resurrects with MOT-001; V1 ships `preset`/`motion`/`transition` only.
  **The V1 preset value set is ratified (DOC-005), presence narrowed (DOC-018):** `transient`
  (presence); `lift` (state). `sheet`/`modal` (presence) defer to MOT-001 (`42` — they name
  screen-scale presentations that collide with presence's scope ceiling). The per-platform
  shape and timing defaults are device-pending, owned by MOT-001.
- **Partial-override sugar (`edge`/`origin`) — deferred.** For now it's binary: `preset`
  (full platform default) *or* explicit `motion` (full uniform shape); no `edge="bottom"`
  middle ground. Reconsider as scoped `FxPresence` sugar only if demand is real (the risk is
  a slippery slope — why `edge` but not `distance`/`origin`? — and a semantically fuzzy
  "platform shape but from the bottom").
- ~~The selector `target` axis (`content`/`effect`).~~ **Resolved in `0-spine/02`** (decision
  11: declared per-rung, default `'effect'`).
- ~~Which semantic primitives ship in v1 (`appear`/`dismiss` certain; `emphasis`/
  `pressResponse` — v1 or v2?).~~ **Resolved (decision 12, DOC-009):** the V1 primitive
  layer is the driver vocabulary; presets + `fx.motion.*` carry the semantics, `tune`
  carries emphasis, `feedback` carries press response.
- ~~Borrow Compose's enter/exit names (`fadeIn`/`slideIn`/`scaleIn`/`expandIn`) for the
  primitive layer without adopting its API shape (rule #2).~~ **Resolved (decision 12,
  DOC-009):** not borrowed; the builders stay `edgeIn`/`edgeOut`/`scale`/`identity`.

## Sources

- Conversation: the layering, the law, customize-by-intent, platform-exclusive-as-empty-
  ladder, Compose naming as a model, the content-vs-effect driver split.
- `0-spine/02` (the `motion` node + selector `target` open question), `40` (regimes, the
  data-flow contract), `00` (the law), `42`/`54`/`55` (the consumers).
