# Interactive content-distort (water-ripple)
Status: open — WIP, non-authoritative
Phase: post-v2 exploration
Feeds: `3-motion/41` (the canon animation grammar — decision 15; `wip/native-animation-api-extraction.md` historical), `0-spine/04`/`05` (capability-boundary taxonomy and Lane 1 grammar; `wip/capability-boundary-classifier.md` and `wip/lane1-signal-grammar.md` historical), `3-motion/40`, `2-effects/23-filters.md`, `5-realization/structure.android.md`
Scope: a named feature exploration — make the Android content-distort shipped by DEF-009 (a stateless, time-driven ripple) *interactive*: a ripple that follows touch like water, and an impulse triggered at a point like a rock dropped in a pond. Captures what it is, which lane it falls in, and what it depends on — so it is a recorded post-v2 target, not re-litigated each time it comes up. **No architecture decision; no ledger row.**

## Why this matters

DEF-009 proved the *runtime fact* — a draw-time AGSL sampler distorts live, still-touchable RN
content on Android via `RenderEffect.createRuntimeShaderEffect(shader, "content")`. The natural
next question is interactivity: a ripple is most compelling when it reacts. Two modes keep coming
up:

1. **Gesture trail** — a finger drags across the surface and the water ripples after it (a
   continuous touch → distortion).
2. **Impulse** — pass an `(x, y)` and a ring radiates out and decays, like a rock dropped in
   water (a discrete trigger → a self-running, settling animation).

This doc records where that lands in the architecture. It is **not** a spec and starts no work.

## What it is, precisely

A **stateful, interactive** evolution of the stateless DEF-009 modifier. The believable look has
two implementation flavors, and the choice is load-bearing:

- **Parametric multi-source** — native (Kotlin) holds a small list of active ripple sources
  `(x, y, startTime)`; the AGSL sums `sin(dist·k − age·speed) · decay(age, dist)` over them and
  re-samples `content.eval(...)`. A drag spawns a trail of sources; an impulse spawns one. **State
  lives natively; the shader stays a stateless sampler.** Fits the existing uniform-write path.
- **Height-field simulation** — ping-ponged off-screen buffers hold the water height, integrated
  per frame by a wave equation, perturbed by touch impulses. The "real" pond look, but it needs
  render-to-texture infrastructure fx does not have and a per-frame compute pass.

## Classification (from the parked frameworks)

The Lane 1 grammar and the boundary classifier already place this shape — it is not novel:

- **Target = an effect uniform → Boundary B.** `04`/`05` place Lane 1 targets inside transform/
  opacity on an fx-owned wrapper (Boundary A) or effect uniforms (Boundary B).
- **Driver = `source` (gesture-linked).** The canon animation grammar (`3-motion/41` decision 15)
  places gesture-linked motion on the `source` driver — native reads the source and drives
  transform/opacity or effect uniforms, emitting only boundary events.
- **The two flavors are the two lanes.** This is the sharp line:
  - **Parametric = Lane 1, additive.** A native continuous source (touch) mapped through the
    enumerated operators (track + range-map + curve + settle) onto an fx-owned Boundary-B uniform.
    No rule break, no boundary move. The shipped precedent is `FxSurfaceView`'s native
    `pressDepth`/`touch` smoothing (U8-001) — *"press depth / hover depth … already shipped
    natively."*
  - **Simulation = Lane 2 / regime C, gated (depth 4).** *"Arbitrary user-authored math or
    per-frame state beyond the enumerated operators"* — the lane the architecture deliberately
    keeps empty (`0-spine/05` decision #5). Earns itself only if a native-source mapping
    provably cannot express the effect.

So the *additive* version (parametric) is the one to pursue; the simulation is the gated lane,
not the default.

## Platform scope

- **Android over live content — the only place this works over the developer's real views.**
  Draw-time `RenderEffect` keeps touch alive (rule #4's Android softening). Same as DEF-009.
- **iOS over live content — out, structurally.** Sampling live RN content means hosting it, which
  severs RN/RNGH touch (rule #4); iOS has no draw-time content filter. A ripple over **fx-owned**
  content (SwiftUI `.distortionEffect`) is possible on iOS, but that is a different, decorative
  capability — not the content wrapper.

## Dependencies / enablers (why it is post-v2)

- **Foundation — DEF-009 (shipped):** the draw-time content-distort mechanic + the ripple sampler.
- **Impulse API — DEF-020:** `surface.ripple(x, y)` is an *imperative* call, so it needs the
  JS-held `Fx*` SharedObject handle. (A discrete `triggerKey`/`triggerPoint` prop pair is a
  non-imperative fallback, but the handle is the clean surface.)
- **Gesture trail — DEF-011 + DEF-006:** continuous touch → uniform must be native- or
  UI-thread-driven (never per-frame JS, rule #1). DEF-011 owns gesture claiming/arbitration vs
  scrollers; DEF-006 (Reanimated UI-thread channel) is the continuous source channel.
- **General home — the Lane 1 `source` grammar (post-v2).** The canon animation grammar
  (`3-motion/41` decision 15) sequences `source` last — after `target`, `state`, `clock.phase`, and
  `clock.keyframes`. The ripple's own animation (impulse decay = `clock.phase`/
  `keyframes`; gesture center = `source`) composes through that same post-v2 chaining grammar, so
  building it now would pre-empt that design.

**Placement verdict:** the DEF-009 mechanic is V1.x-shipped; DEF-020/DEF-011/DEF-006 are V2
*enablers*; the interactive water-ripple as a real, declarative, composable capability is
**post-v2** (Lane 1 `source`, parametric/Boundary-B). The simulation flavor is regime C.

## Open questions (for whenever Lane 1 is taken off the parking lot)

- **Its own node, or content-distort gains `interaction`?** DEF-009's node is `interaction: none`.
  Interactivity flips it toward `self`/`fx` (forces `expo-view`, already true). Decide whether
  `content-distort` becomes interactive or a sibling `ripple`/`water` node owns the interactive
  form.
- **Impulse surface:** imperative handle (`surface.ripple(x,y)`, DEF-020) vs a discrete
  `triggerKey`/`triggerPoint` prop pair (the existing `triggerKey` idiom). Pick per the DEF-020
  outcome.
- **Decay envelope home:** is the per-source decay a `clock` envelope (native keyframe/phase) or a
  `source` settle operator? Ties to the chaining-API sequencing.
- **Source budget:** how many simultaneous ripple sources before the parametric sum costs too much
  — a device-tuning question, like the DEF-009 amplitude.
- **The falsifying test:** does the parametric mapping actually express a believable drag-trail, or
  does it fail the Lane 1 ceiling and force regime C? Run the `05` Lane 1 falsification test on
  the ripple before committing a lane.

## Sources

- `3-motion/41` decision 15 — the canon animation grammar: the `source` driver for gesture-linked
  motion onto effect uniforms, and the step-5 sequencing. (`wip/native-animation-api-extraction.md`
  is the historical derivation — source-backed concept/API tables only.)
- `0-spine/04` / `0-spine/05` — canonical: Boundary-B effect-uniform targets, the native source
  → mapping → fx-owned-target grammar, the two-lane continuous-interaction model, and the
  falsifying test (`wip/capability-boundary-classifier.md` and `wip/lane1-signal-grammar.md` are
  historical derivations).
- `7-implementation/tasks/DEF-009/` — the shipped stateless foundation.
- decision-ledger DEF-020 (imperative handle), DEF-011 (drag/tilt), DEF-006 (UI-thread channel) —
  the V2 enablers.
- `2-effects/23-filters.md`, `5-realization/structure.android.md § content-distort` — the
  content-distort node + the shipped mechanic.
