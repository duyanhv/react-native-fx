# Presence & lifecycle (enter / hold / exit)
Status: researched (semantics) · per-platform shape+timing + device feel open (→ 33/34/35, structure.*)
Phase: v1 (semantics) · v2 (the owned runtime)
Feeds: 54-presence.md, 41-motion-vocabulary.md, 56-platform-behavior-presets.md, 50-api-and-presets.md
Owns: the presence contract (cross-platform). Mechanics → 33/34/35 + structure.{ios,android}.

## Why this matters

Presence — content appearing and disappearing — is the first motion capability, and the
one that forced the owned runtime. This doc owns its **semantics**: the **presence preset**
catalog, the enter/hold/exit envelope, and how a discrete `visible` target becomes native
animation. The mechanics live in the runtime (`33` layout, `34` driver, `35` state); the
concrete shape *and* spring are the platform's own (the shape-native law, `41`).

## The surface it serves

```tsx
<FxPresence
  visible={visible}
  preset="transient"                       // platform-idiomatic presence behavior (56)
  tune={{ speed: 'fast', emphasis: 'medium', distance: 'compact' }}
>
  <MyToast />                              {/* YOUR component — fx wraps it, never replaces it */}
</FxPresence>
```

- `visible` — the discrete target (regime B of `40`); native runs the envelope.
- `preset` — the platform-idiomatic behavior; fx resolves the **whole shape + timing per
  platform** (`56`). Behavior-named (`transient`/`sheet`), never UI-named (`toast`).
- `tune` — adjust by intent, biased toward the platform (`41`).
- `motion={{ enter, exit }}` — the explicit shape override (a typed map, `41`); fixes the
  shape cross-platform. `transition` — expert timing.

## The presence preset catalog

Each preset names a **presentation *behavior***, not a fixed shape. Under the shape-native
law, the **platform owns the geometry** — the same preset may enter from a different edge,
origin, or distance on iOS vs Android. The table is the *behavior intent*; the concrete
per-platform shape+curve is the **default catalog** (open, device-filled). All presets are
**overlay** content (no flow layout — what keeps `33` tractable).

| preset | behavior intent | platform note (shape resolves per OS) |
|---|---|---|
| `transient` | a brief, self-dismissing overlay | iOS banner vs Android snackbar — *edge and direction may differ* |
| `sheet` | a slide-in panel | the platform's sheet presentation (iOS sheet vs Material bottom sheet) |
| `modal` | a centered, attention-blocking surface | fade + scale family; the scrim/backdrop is the app's, not fx |

`menu`/`tooltip` (anchor-origin) are **v2** — their origin is a *child* trigger, the
per-child case `33`/`05` flag as the Expo-Modules boundary trigger. A **fab** is *composed*
(`<FxPresence preset="…"><FxPressable feedback="native">`), not a preset — fx never owns a
UI widget. Anchored/slide behaviors need an **origin/travel** resolved natively from the
post-layout frame (`33`), with `tune.distance` scaling it.

## The native measurement contract (motion reads layout, never writes it)

Shape-native feel depends on resolving geometry *natively* from the laid-out view. Motion
may **read** (all on the native side, post-layout — `33`):

| Reads | For |
|---|---|
| **post-Yoga frame** (the managed wrapper's size/position) | travel distance, transform-origin |
| **window / root frame** | full-bleed slides (slide the whole height) |
| **safe-area / insets** | edge anchoring that respects notches/home-indicator |
| **resolved edge / origin** | turning `from:'bottom'` into a concrete translate delta |
| **travel distance** | how far an `edgeIn`/`edgeOut` moves (× `tune.distance`) |
| **anchor rect** (a child trigger's frame) | **v2** — `menu`/`tooltip` origin (the per-child boundary, `05`) |

**The rule: fx reads layout to resolve presentation; it never writes layout** (`04` — Yoga
owns layout). These reads are how an unresolved `MotionSpec`'s measured channels (`41`) get their concrete
deltas without JS knowing the view's size. Mechanics (when the frame is available, how it's read per
platform) live in `33`/`structure.*`.

## The per-platform default catalog (the deliverable)

This is the artifact that makes the shape-native law **auditable instead of vibes** — the
device-filled table behind every preset. One row per **(preset × phase)**:

| field | example (`transient` / `enter`) |
|---|---|
| `preset` | `transient` |
| `phase` | `enter` |
| `ios.source` | the platform behavior it mirrors (e.g. system banner) |
| `ios.shape` | resolved geometry (edge, origin, travel) |
| `ios.timing` | the named spring/curve (`UISpringTimingParameters` default) |
| `android.source` | (e.g. Material snackbar) |
| `android.shape` | resolved geometry (may differ from iOS) |
| `android.timing` | the platform standard spring / Material motion (M3 Expressive `MotionScheme` where present) |

Each row's `source`/`shape`/`timing` must pass `41`'s operational test (nameable platform
source; no uniform invention; native-component parity). It is filled on device — a real
deliverable, owned jointly by `42` (presets) and `5-realization` (per-platform values), not a
paragraph of intentions.

## The envelope (enter → hold → exit)

- **enter** plays on mount / `visible` → true.
- **hold** is the steady state (props eased by `transition` if they change).
- **exit** plays on `visible` → false, *then* the child unmounts — the deferred-unmount
  handshake (`35`). Native owns an interruptible envelope; a mid-flight re-toggle retargets.
- **Touch mid-transition (platform caveat, `34`).** Presence is touch-safe **at rest** on
  both platforms. *During* an enter/exit the tappable position differs: **iOS** hit-tests the
  element at its **target** position (the model layer), **Android** at its **visual** position.
  The contract guarantees correct touch **at rest**, not pixel-aligned touch on an in-flight
  element — so "touch-safe" means hit-testing survives the transform, **not** that a fast tap
  mid-flight lands pixel-exact on iOS. Design transient taps accordingly.

`tune` modulates by intent: `speed` scales duration, `emphasis` scales spring bounce,
`distance` scales travel — never raw curves (the bias from `41`). **`distance` precedence:**
it scales **preset** motion and **measured** tokens (`{ measure: 'edge' }`, `41`); an
**explicit numeric** `translateX/Y` in a user `motion` map is the exact shape the user chose
and is **not** rescaled unless they opt in. Explicit numeric motion wins as the user's exact
geometry; `distance` only modulates the semantic (preset / measured) magnitudes. The
motion-map fallback is `userMotion[phase] ?? presetMotion[phase] ?? identity`; **no implicit
reverse** (`41`).

## Decisions

1. **A preset names a platform-native presentation behavior; the platform owns the shape.**
   Under shape-native (`41`/`04`), the geometry *and* the curve resolve per platform; the
   table is intent, not a fixed agnostic shape.
2. **Presets are behavior-named, not UI-named** (`transient`/`sheet`/`modal`, never
   `toast`/`card`); a `fab` is composed, not a preset.
3. **`motion` is the explicit cross-platform shape override**; supplying it is the only
   sanctioned way to fix the shape on both platforms.
4. **Presets are overlay-scoped** — no flow-layout; `menu`/`tooltip` (anchor) are v2.
5. **The envelope is enter → hold → exit**, keyed by `visible`; exit→unmount is the `35`
   handshake. **`exit` is the idiomatic platform dismiss, not a blind reverse of enter.**

## Open questions

- **The per-platform default catalog** — its *shape* is now defined (above); the **values**
  (each `(preset × phase)` row's source/shape/timing) are the device-filled open work, the
  main deliverable.
- **The behavior-preset vocabulary** — `transient`/`sheet`/`modal` confirmed; the rest
  (re-derived from intent, behavior-named) pending.
- **Anchor rect (v2)** — the measurement contract is defined (above); the exact native
  read-timing and the child-anchor-rect path (`menu`/`tooltip`) remain open in `33`.
- **Named states beyond binary `visible`** — multi-step intro→hold→outro; one-shot bursts.

## Sources

- Conversation: shape-native law; `preset`/`motion`/`tune`; behavior-named not UI-named;
  overlay-scoping; the discrete handshake; exit-as-idiomatic-dismiss.
- `41` (the vocabulary + the law + fallback), `56` (the preset catalog), `40` (regimes),
  `33`/`34`/`35` (the runtime), `54` (the surface).
