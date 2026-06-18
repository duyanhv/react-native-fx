# Surface: content primitives
Status: researched (API) · native mechanics open (→ 33/34/35)
Phase: v1 (API) · v2 (the owned runtime behind them)
Feeds: the public package; consumes 41, 54, 56; composed by 56
Owns: the content primitives — `FxView`, `FxPressable`, `FxGroup`/`FxItem`.

## Why this matters

These are **layer 2** (`50`) for *content* — they wrap *your* views and animate them. (The
*effect* primitive `<Fx>` lives in `55`; the presence primitive `FxPresence` in `54`.) They
use the shared, scoped prop language (`50`): `preset` is platform-idiomatic, `motion` is the
explicit shape override (a typed map), `transition` is timing, `effect` is an `EffectStack`.

## The primitives

### `FxView` — content with state-driven presentation

Wraps content and animates its **mounted-state** transform, driven by a discrete `state`
(`40`). Touch-safe (transform/opacity on a managed wrapper, `04`/`33`).

```tsx
<FxView
  preset="lift"                            // platform-idiomatic state behavior (56)
  state={selected ? 'selected' : 'idle'}   // discrete target (FxView-only); native eases
  motion={{                                // explicit override — a map of mounted STATES (41)
    idle:     fx.motion.identity(),
    selected: fx.motion.scale({ to: 1.03 }),
  }}
  effect={fx.effect.glow()}                // optional visual layer — EffectStack (55)
  transition={{ spring: 'native' }}        // Transition — timing only
>
  <MyCard />                               {/* YOUR component — fx wraps it, never replaces it */}
</FxView>
```

`preset` is the platform-idiomatic default; `motion` (a map keyed by **mounted state**, not
lifecycle phase — that distinction is real, `41`) overrides the shape; `state` is the live
target. fx wraps *your* card — it does not ship a `<Card>`. Fallback per key:
`userMotion[state] ?? presetMotion[state] ?? identity` (`41`).

### `FxPressable` — native press feedback

Wraps content and runs the **platform's** press response natively (no per-frame JS),
surfacing semantic events. Owns the **press recognizer + cancellation + press events** — a
real runtime concern, which is why it is its own component, not an `FxView` flag.

```tsx
<FxPressable feedback="native" onPress={…}><MyButton/></FxPressable>
```

`feedback` (the press-behavior bundle) selects the platform press motion (the law). fx wraps
*your* button — it does not ship a `<Button>`. (Interactive *effects* — a touch-reactive
shader — are `<Fx interactionMode>` in `55`, not this.)

### `FxGroup` / `FxItem` — the honest compound

The one honest compound (`50`): each `FxItem` is a **real native morphing view** (glass
containers that morph between siblings, `21`). Not config-children — a genuine native-layer
boundary.

```tsx
<FxGroup>
  <FxItem><GlassView/></FxItem>
  <FxItem><GlassView/></FxItem>
</FxGroup>
```

## Decisions

1. **Content vs effect by runtime ownership** — `FxView`/`FxPressable` own *content*
   presentation (wrap + animate *your* views, `04`); effects (`<Fx>`) are `55`. **fx wraps
   any UI kit and never ships `<Toast>`/`<Button>`/`<Card>`** — the semantic layer is
   `preset`/`feedback` (`56`).
2. **`FxView`: `preset` (platform-idiomatic) + `motion` (a map of mounted states) + `effect`
   + `transition`.** `motion`'s keys are dev-named states, *not* lifecycle phases (those are
   `FxPresence`); same prop name, different typed map.
3. **`FxPressable` is its own component** — it owns the press recognizer/cancellation/events,
   not just motion, so folding it into `FxView` would make a kitchen sink. (Shared native
   base internally; clear public API.)
4. **`FxGroup`/`FxItem` is the only honest compound** — each item a real native layer.
5. **Scoped props** — `state` only on `FxView`, `feedback` only on `FxPressable`; wrap any
   children into one managed wrapper, no per-child motion (`33`/`05`).
6. **`FxGroup` morph scope is glass-only in V1.** Cross-item morph is supported only for
   the `material` (glass) effect, via the system's `GlassEffectContainer` on iOS 26+.
   No other effect nodes (`fill`, `shader`, `symbol`, `filter`) support cross-item morph
   in V1. The merge-threshold and `spacing` contract is system-owned in V1; explicit
   `spacing` control is deferred to V2. Below iOS 26, `FxGroup` renders individual glass
   views without morphing (`.ultraThinMaterial` fallback). Android uses its own material/
   blur fallback (no morphing); the exact mechanic is owned by `structure.android.md`.

## Open questions

- **`FxView` state vocabulary** — ratified as `idle` · `selected` for `lift` (DOC-005).
  The per-platform `MotionSpec` map defaults are device-pending — they ride the as-yet-unbuilt `FxView` state catalog (MOT-001 shipped only the `transient` presence catalog and closed at U7-003).
- **`FxPressable` `feedback` values** — ratified as `native` (DOC-005). Per-platform
  default catalog is device-pending — it rides the as-yet-unbuilt `FxPressable` (MOT-001 closed at U7-003 without it).
- **`FxGroup` morph scope** — **resolved (DOC-006, 2026-06-10).** Glass-only in V1; system-owned merge contract. See Decision 6 above.
- Native mechanics (the managed wrapper, state handshake) are `open` in `33`/`34`/`35`.

## Sources

- `50` (the layers + scoped prop language), `54` (FxPresence — presence sibling), `55`
  (`<Fx>` effects + interactive surface), `41` (`fx.motion`/`MotionSpec`, the law + fallback),
  `56` (`preset`/`feedback`), `21` (glass morph → `FxGroup`/`FxItem`), `40` (the state channel).
