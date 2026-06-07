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
  name: string;                         // SF Symbol (iOS) / drawable or Lottie ref (Android)
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
| symbol | `.symbolEffect` (17; `breathe`/`rotate`/`wiggle` need 18), `.contentTransition(.symbolEffect)` | Animated Vector Drawable / Lottie — no system symbols |

**iOS-only vocabulary.** On Android the same *intent* is met with AVD or Lottie — a
different **lowering / asset contract**, **not a different public component.** The public
surface stays `<Fx effect="…">` (or optional effect sugar); only the asset/runtime path
differs per platform. `symbol` may be **iOS-native only**, which is fine as long as the
manifest honestly **degrades** (graceful `{via:'none'}`) or **requires app-supplied Android
assets** — recorded as data, not a separate component. Mechanics in `structure.{ios,android}.md`.

## Surface consumption

Mounted by `<Fx>` (or an optional `symbol` effect sugar). Feeds the symbol effect ids
(bounce/pulse/variable-color/replace). `interaction:'self'` — self-animating. Not a content
wrapper.

Zero-config presets stay as simple string ids; typed config uses the **builder/object
form** — effect-specific config never leaks onto `<Fx>`'s top-level prop surface:

```tsx
<Fx effect="symbol-bounce" />                          // zero-config preset id
<Fx effect={fx.effect.symbol({                         // typed config (builder)
  name: 'heart', animation: 'bounce', trigger: 'value',
})} />
```

`symbol` is `interaction:'self'` — it does **not** own a recognizer, so `trigger` is
`'value' | 'state' | 'repeat'`, **never `'tap'`**. To fire on a tap, *your* code changes the
trigger value (e.g. on your button's `onPress`); the symbol does not capture the gesture.

## Composition & stacking

- **kind:** render-target · **interaction:** `self`. **composition:** `surface` /
  self-contained (an icon occupies its own box).
- **Terminal / self-contained step only** — mountable via `<Fx effect="symbol-…">` as a
  *single* layer, **not composable in multi-layer stacks** (`55`). A `filter` may apply to
  it, but it never sits under/over other render-targets.
- **Does not stack** like `fill`/`shader` — it is a self-contained system element, not a
  composite layer; a `filter` over it is possible but unusual.

## Runtime behavior

- **discrete trigger** — JS sets a discrete `trigger`; the system animates the symbol
  effect natively. **No continuous clock** that JS touches.
- **state-eased** — symbol→symbol changes via `.contentTransition(.symbolEffect)`.

## Degradation

- Android (no system symbols) → AVD/Lottie asset path; **if no app-supplied asset →
  `{via:'none'}`** (graceful). iOS-native-only is acceptable, expressed honestly in the
  manifest.

## Events

`onLoad`; `onTransitionEnd` / trigger-complete when a discrete symbol effect finishes (so JS
can sequence). No per-frame stream.

## Decisions

1. **`symbol` is `interaction: 'self'`** — the system animates it; fx triggers via
   discrete `trigger`, never per-frame.
2. **iOS-native, Android-library** — unify the prop shape and the public surface (`<Fx>`);
   accept that Android lowers to AVD/Lottie (a per-platform-different **lowering/asset
   contract**, not a different public component).
3. **Effect names map to SF Symbols' behavioral classes** (discrete/indefinite/
   transition/content) — the trigger semantics follow from the class.

## Open questions

- **Android scope** — ship `symbol` on Android via Lottie (asset burden, dependency)
  or mark it iOS-only in V1 and document the gap? Ties to the `via:'lib'` contract (`02`).
- **Symbol asset sourcing** — SF Symbols are Apple-only; the Android equivalent needs
  the app to supply matching AVD/Lottie assets. Decide the contract.

## Sources

- `02-capability-ir-and-lowering.md` — the `symbol` rungs.
- `structure.ios.md` — `.symbolEffect` mechanics + version gates.
- Apple `symbolEffect` (createwithswift / Donny Wals iOS 18 effects); Lottie / AVD for Android.
