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
  name: string;                         // iOS: SF Symbol name; Android: registerSymbol() Lottie key
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
| symbol | `.symbolEffect` (17; `breathe`/`rotate`/`wiggle` need 18), `.contentTransition(.symbolEffect)` | Lottie via `registerSymbol` (`os 21`, `feature:'lottie'` optional peer); AVD deferred |

**iOS native, Android app-supplied Lottie (DEF-025).** iOS draws every glyph from Apple's
system set through `.symbolEffect`. Android has no system-symbol equivalent, so it lowers to an
**app-supplied Lottie animation** registered by name through `registerSymbol` — the same public
surface (`<Fx>` / `fx.effect.symbol`), not a different component. The Android rung is `via:'lib'`,
asset `lottie`, gated by `feature:'lottie'` (the optional `com.airbnb.android:lottie` peer,
`compileOnly`, never bundled); absent the peer the rung is unselectable and degrades to
`{via:'none'}`. AVD (`via:'native'`) remains a deferred later rung.

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

- iOS <17 → `{via:'none'}` (graceful).
- Android, two axes (DEF-025): the optional Lottie peer absent → `feature:'lottie'` unmet →
  `{via:'none'}` (selector-skipped). The native `FxSymbolView` also self-guards (a `Class.forName`
  probe) so it stays construct-safe even when Fabric preallocates it past the selector — it never
  links the absent peer. A `name` with no registered asset → renders nothing + dev warn +
  `onError({reason:'unsupported'})`.

## Events

`onLoad`; `onTransitionEnd` / trigger-complete when a discrete symbol effect finishes (so JS
can sequence). No per-frame stream.

## Decisions

1. **`symbol` is `interaction: 'self'`** — the system animates it; fx triggers via
   discrete `trigger`, never per-frame.
2. **iOS native, Android Lottie (DEF-025)** — one prop shape and public surface (`<Fx>` /
   `fx.effect.symbol`); iOS ships through `.symbolEffect`, Android through an app-supplied Lottie
   animation registered by name via `registerSymbol`, gated by the optional `feature:'lottie'`
   peer. AVD (`via:'native'`) stays a deferred later rung. (Was iOS-only in V1; DEF-025 closed the
   peer gap.)
3. **Effect names map to SF Symbols' behavioral classes** (discrete/indefinite/
   transition/content) — the trigger semantics follow from the class. On Android the class
   collapses to a play-mode (discrete → play once per trigger; indefinite → loop while active);
   the Lottie asset carries the look, the enum only selects loop vs once.
4. **Android asset sourcing is app-supplied Lottie (DEF-025)** — SF Symbols are Apple-only, so
   Android binds a `name` to an app-registered Lottie JSON via `registerSymbol({ name, android:
   { type:'lottie', source } })`. fx owns the binding mechanism, never a bundled icon pack. The
   JSON crosses the bridge once at registration; per-view only `name` crosses.

## Sources

- `02-capability-ir-and-lowering.md` — the `symbol` rungs.
- `structure.ios.md` — `.symbolEffect` mechanics + version gates.
- Apple `symbolEffect` (createwithswift / Donny Wals iOS 18 effects); Lottie / AVD for Android.
