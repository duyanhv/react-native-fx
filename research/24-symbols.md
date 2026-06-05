# Capability: symbol
Status: researched
Phase: v1 (iOS) · v2 / library (Android)
Feeds: 50-api-and-presets.md
Owns: the `symbol` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`symbol` is the icon-animation capability — SF Symbol effects on iOS, the most
instant-polish, lowest-effort win in the catalog. It is `interaction: 'self'`
(self-animating, no fx-managed gestures) and the most **platform-divergent** node:
iOS has a rich native vocabulary, Android has no system-symbol equivalent, so it
becomes a per-platform-different component rather than a unified one.

## The node

- **id:** `symbol` · **kind:** render-target · **interaction:** `self` · **phase:** v1 (iOS).
- An animated icon driven by a discrete effect name and a trigger.

## Semantic surface

```ts
interface SymbolProps {
  name: string;                         // SF Symbol (iOS) / drawable or Lottie ref (Android)
  effect: 'bounce' | 'pulse' | 'scale' | 'variableColor'
        | 'appear' | 'disappear' | 'breathe' | 'rotate' | 'wiggle';
  trigger?: 'value' | 'state' | 'repeat';   // discrete / held / continuous
  replaceWith?: string;                 // symbol→symbol content transition
}
```

- Effects map to behavioral classes: **discrete** (one-shot, `value`), **indefinite**
  (held/repeating, `state`/`repeat`), **transition** (appear/disappear), **content
  transition** (`replaceWith`). All driven by discrete state — no per-frame JS.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| symbol | `.symbolEffect` (17; `breathe`/`rotate`/`wiggle` need 18), `.contentTransition(.symbolEffect)` | Animated Vector Drawable / Lottie — no system symbols |

**iOS-only vocabulary.** On Android the same *intent* is met with AVD or Lottie,
which is a different component with different assets — fx surfaces a unified prop
shape but the lowering is genuinely per-platform. Mechanics in `structure.{ios,android}.md`.

## Decisions

1. **`symbol` is `interaction: 'self'`** — the system animates it; fx triggers via
   discrete `trigger`, never per-frame.
2. **iOS-native, Android-library** — unify the prop shape; accept that Android lowers
   to AVD/Lottie (per-platform-different component, not a shared primitive).
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
