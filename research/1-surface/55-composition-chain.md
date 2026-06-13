# Surface: effect composition
Status: researched (API)
Phase: v1
Feeds: the public package; consumes 02-capability-ir, 20–24; pairs with 41 (fx.motion)
Owns: the effect-composition builder — `fx.effect.*` → `EffectStack` (visual layers only).

## Why this matters

This is the native-chain-flavored way to **stack visual effect layers** — fills,
materials, shaders, symbols, filters — into one `EffectStack`. It is the escape hatch
beneath the curated effect preset component (`EdgeGlow`; `56`), and what `<Fx effect>`
mounts.

**Effects are not motion.** This builder composes *visual layers* only. Enter/exit/state
*motion* is a separate builder (`fx.motion` → `MotionSpec`, owned by `41`) consumed by
`FxPresence` (`54`). Keeping the two as distinct types is what stops `FxPresence
motion={{enter: fx.motion.edgeIn()}}` and `<Fx effect={fx.effect.mesh()}>` from being
type-confusable.

```tsx
const look = fx.effect
  .mesh({ palette: 'aurora' })       // render-target
  .glass({ variant: 'regular' })     // render-target (material `variant`, not the `effect` id)
  .glow({ intensity: 0.8 }).animate({ delay: 200 })  // per-step timing override
  .blur(8)                           // modifier
  .defaults({ duration: 400 });      // stack timing default

<Fx effect={look} style={…} />              // stack form
<Fx effect="mesh-gradient" />                // single form (by id) — same component
<Fx effect="plasma" interactionMode="active" onPress={…} />  // interactive effect surface
```

**`<Fx>` is one component** — single (`effect="id"`) or stack (`effect={stack}`); there is
no separate `FxLayer`. It also owns the **interactive effect** surface: an `<Fx>` whose
shader is touch-reactive (`interactionMode`, `onPress`, and shader uniforms `pressDepth` /
`pointerX` / `pointerY` / glow position — `30`). This is *not* `FxPressable`: that wraps
*your* content and gives it press feedback; `<Fx>` *is* the touch-reactive effect (different
runtime ownership). Interactive `<Fx>` lives on `expo-view` (`interaction:'fx'`, `01`).

## How it works (data-first)

The builder has **value semantics** — each call returns a new immutable builder. It
accumulates an ordered `EffectStack`:

```ts
type Transition = { duration?: number; delay?: number; easing?: string; spring?: SpringSpec };
// SpringSpec is authored per platform (41 decision 11): { ios?: { duration, bounce },
// android?: { stiffness, dampingRatio } } — omitting a side keeps that platform's tuned default.

interface EffectStep {
  node: 'fill' | 'shader' | 'material' | 'filter' | 'symbol';  // render-targets + the filter modifier — NOT 'motion'
  uniforms: Record<string, unknown>;  // resolved preset + shallow-merged overrides (50)
  transition?: Transition;            // per-step TIMING override (from .animate())
}
// `symbol` is a TERMINAL/self-contained step — mount it via <Fx effect="symbol-…"> as a
// single layer; it is not composed in multi-layer stacks (24). A stack containing `symbol`
// holds only that one render-target (filters may still apply to it).

interface EffectStack {
  steps: EffectStep[];                // ordered bottom → top composite order
  transition?: Transition;            // stack timing default (from .defaults() / <Fx transition>)
}
```

**`node` excludes `motion`.** `motion` is a *driver*, not a visual layer (`02`) — you do
not stack it. It is applied to a step's timing via `transition`, or to a typed `motion` map
on `FxPresence`/`FxView`. A spring is not a layer in the composite.

Each method (`.mesh`/`.glow`/`.glass`/`.blur`) is a JS preset (`50`) pushing a step. `<Fx>`
is the adapter: it runs `select()` per step (`02`, `target:'effect'`), mounts the native
layer stack, and the resolved record crosses the bridge **once**. Native composites in
order and eases each layer per its effective `transition`.

## Effect vs motion — two builders, two types

| Builder | Produces | Consumed by | Vocabulary |
|---|---|---|---|
| `fx.effect.*` | **`EffectStack`** (visual layers/modifiers) | `effect=` on `<Fx>` (`55`) | this doc + `20`–`24` |
| `fx.motion.*` | **`MotionSpec`** (opacity/transform shapes) | `motion` map on `FxPresence`/`FxView` (`54`/`57`) | `41` |

Same `fx` namespace, two sub-builders, two non-interchangeable types. `transition`
(timing) is shared by both but is itself neither — it is `{duration,delay,easing,spring}`.

## The `.animate()` binding rule (timing)

`.animate(t)` carries a **`Transition`** (timing), not a shape:

- **`.animate(t)` binds to the immediately preceding step** — a per-step timing override.
- **The stack default is set explicitly** — `.defaults({transition})` or `<Fx transition>`
  — never by chain position.
- **Effective per step = step override ?? stack default ?? platform default** (`41`).

## Decisions

1. **`fx.effect` → immutable `EffectStack` → one `<Fx>` adapter** (value
   semantics, one bridge crossing).
2. **`EffectStack` is visual-only; `EffectStep.node` excludes `motion`.** Motion is a
   driver applied via `transition`/`enter`/`exit`, never stacked as a layer.
3. **Two builders, two types** — `fx.effect`→`EffectStack` (here), `fx.motion`→`MotionSpec`
   (`41`); not interchangeable.
4. **`.animate()`/`.defaults()` carry `Transition` (timing)**; effective = override ??
   default ?? platform.
5. **Self-contained by default; content-distort is the gated opt-in** (Android/V2; rule #4).
6. **`<Fx>` is one component — single (`effect="id"`) or stack (`effect={stack}`); no
   separate `FxLayer`.** It also owns the **interactive effect** surface
   (`interactionMode`/`onPress`/shader uniforms `pressDepth`/`pointerX/Y`, `30`) — distinct
   from `FxPressable`, which wraps *your* content (different runtime ownership).
7. **The `fx.effect.*` namespace is accepted as the V1 builder entry point (DEF-015).** The
   `<Fx effect={fx.effect.*}>` repetition is tolerated because it appears only here, at the
   layer-3 escape hatch; the front door is the string form `<Fx effect="plasma" />` (`50`).
   **No bare `effect` export ships in V1** — the builder is reached through `fx.effect.*`
   only, preserving the `fx.effect`/`fx.motion` symmetry (Decision 3).

## Open questions

- **The deferred JSX-compound skin** (`<Fx.Stack>`) over the identical `EffectStack` —
  build now or on demand? (deferred.)
- ~~**`SpringTune` shape**~~ — **resolved: `SpringTune` removed.** The canonical API is
  `tune = { speed, emphasis, distance }` (`data-layer.md` I2). `Transition.spring` is
  authored per platform for direct control — iOS `{ duration, bounce }`, Android
  `{ stiffness, dampingRatio }` — never one cross-platform parameter set (`41` decision 11,
  DOC-009).
- ~~**Memoization**~~ — **resolved (SURF-010):** an inline-built `EffectStack` rebuilds each
  render, but the native side compares stack *values* via `previousProps`, so a rebuild with
  unchanged content does no native work — no manual memo or `useFx` needed. Verified on SDK 56,
  iOS + Android.

## Sources

- Conversation: stacking modifiers → full-composite → self-contained+opt-in distort → the
  `.animate()` resolution → the effect/motion type split.
- `02` (the nodes, `select()`, the `target` axis; `motion` is a driver), `50` (the prop
  language + tiering), `41` (the parallel `fx.motion`/`MotionSpec`), `57` (content primitives).
