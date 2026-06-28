# Capability: symbol
Status: researched
Phase: v1 (iOS) · v2 / library (Android)
Feeds: 50-api-and-presets.md
Owns: the `symbol` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`symbol` is the icon-animation capability — SF Symbol effects on iOS, the most
instant-polish, lowest-effort win in the catalog. It is `interaction: 'self'`
(self-animating, no fx-managed gestures) and the most **platform-divergent** node:
iOS has a rich native vocabulary, Android has no system-symbol equivalent, so it lowers
to a per-platform-different **asset/runtime path** behind one unified public surface
(`<Fx>` / optional effect sugar) — not a different public component.

## The node

- **id:** `symbol` · **kind:** render-target · **interaction:** `self` · **phase:** v1 (iOS).
- An animated icon driven by a discrete effect name and a trigger.

## Semantic surface

```ts
interface SymbolConfig {
  name: string;                         // SF Symbol in V1; future drawable/Lottie ref on Android
  animation: 'bounce' | 'pulse' | 'scale' | 'variableColor'  // NOT the public `effect` id
           | 'appear' | 'disappear' | 'breathe' | 'rotate' | 'wiggle';
  trigger?: 'value' | 'state' | 'repeat';   // discrete / held / continuous
  replaceWith?: string;                 // symbol→symbol content transition
}
```

- Animations map to behavioral classes: **discrete** (one-shot, `value`), **indefinite**
  (held/repeating, `state`/`repeat`), **transition** (appear/disappear), **content
  transition** (`replaceWith`). All driven by discrete state — no per-frame JS.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| symbol | `.symbolEffect` (17; `breathe`/`rotate`/`wiggle` need 18), `.contentTransition(.symbolEffect)` | planned AVD/Lottie future path — no system symbols |

**iOS-only V1 vocabulary.** Android has no system-symbol equivalent, so V1 does not ship an
Android `symbol` runtime. AVD/Lottie remain planned future lowerings behind the same public
surface, not a different public component. The manifest keeps those Android rungs
non-selectable in V1 so Android degrades gracefully to `{via:'none'}`.

## Surface consumption

Mounted by `<Fx>` via `fx.effect.symbol({…})`. `interaction:'self'` — self-animating. Not a
content wrapper.

The string form of `<Fx effect="…">` is for zero-config effects — effects that draw with no
required configuration, where a bare id is a complete instruction. Symbol is the one
render-target with no zero-config tier: `name` is its visual identity, not an optional tweak,
and there is no truthful default glyph. Therefore symbol uses **the builder form only** — a
string id `symbol-*` does not exist and will never be added to `EffectId`.

```tsx
// Builder form — the sole symbol surface. name and animation are required.
<Fx effect={fx.effect.symbol({ name: 'heart', animation: 'bounce', trigger: 'value' })} />

// Aspirational / deferred: zero-config string preset (e.g. "symbol-bounce") would require
// a truthful name default, which contradicts the no-default decision above. Not shipped.
```

`symbol` is `interaction:'self'` — it does **not** own a recognizer, so `trigger` is
`'value' | 'state' | 'repeat'`, **never `'tap'`**. To fire on a tap, *your* code changes the
trigger value (e.g. on your button's `onPress`); the symbol does not capture the gesture.

## Composition & stacking

- **kind:** render-target · **interaction:** `self`. **composition:** `surface` /
  self-contained (an icon occupies its own box).
- **Terminal / self-contained step only** — mounted as a *single* layer via
  `fx.effect.symbol({…})`, **not composable in multi-layer stacks** (`55`). A `filter` may
  apply to it, but it never sits under/over other render-targets.
- **Does not stack** like `fill`/`shader` — it is a self-contained system element, not a
  composite layer; a `filter` over it is possible but unusual.

## Runtime behavior

- **discrete trigger** — JS sets a discrete `trigger`; the system animates the symbol
  effect natively. **No continuous clock** that JS touches.
- **state-eased** — symbol→symbol changes via `.contentTransition(.symbolEffect)`.

## Degradation

- iOS <17 → `{via:'none'}` (graceful). Android V1 → `{via:'none'}` because AVD/Lottie
  support is planned/deferred, not shipped.

## Events

`onLoad`; `onTransitionEnd` / trigger-complete when a discrete symbol effect finishes (so JS
can sequence). No per-frame stream.

## Decisions

1. **`symbol` is `interaction: 'self'`** — the system animates it; fx triggers via
   discrete `trigger`, never per-frame.
2. **iOS-only in V1** — unify the prop shape and the public surface (`<Fx>`), but ship
   the runtime only through iOS `.symbolEffect`. Android AVD/Lottie stays planned and
   non-selectable until a later task defines the asset contract and renderer.
3. **Effect names map to SF Symbols' behavioral classes** (discrete/indefinite/
   transition/content) — the trigger semantics follow from the class.
4. **Android asset sourcing is deferred** — SF Symbols are Apple-only. Android AVD/Lottie
   assets require an app-supplied asset contract, which does not ship in V1.

## Sources

- `02-capability-ir-and-lowering.md` — the `symbol` rungs.
- `structure.ios.md` — `.symbolEffect` mechanics + version gates.
- Apple `symbolEffect` (createwithswift / Donny Wals iOS 18 effects); Lottie / AVD for Android.
