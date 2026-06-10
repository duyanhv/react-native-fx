# Capability: material (glass & blur)
Status: researched
Phase: v1 (progressive: Liquid Glass is iOS 26+)
Feeds: 50-api-and-presets.md
Owns: the `material` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`material` is the system-glass/blur capability — Liquid Glass on iOS 26, adaptive
materials below it, blur-based glassmorphism on Android. It is `interaction: 'self'`:
the system glass (the shipped iOS rung is SwiftUI `.glassEffect` on the hosted substrate,
backed by UIKit `UIGlassEffect`/`UIVisualEffectView` — mechanics in `structure.ios`) is a
real system view that handles its own press response (`.interactive()`/`isInteractive`) and
samples its backdrop live, so fx neither owns its gestures
(not `fx`) nor treats it as inert (not `none`). Positioning: fx is the **cross-platform
superset** of `@callstack/liquid-glass` and `expo-glass-effect` — both iOS-26-only, both
falling back to a plain `View`; fx promises *premium glass everywhere*.

## The node

- **id:** `material` · **kind:** render-target · **interaction:** `self` · **phase:** v1.
- A self-contained system material **drawn as a layer** — fx draws the glass; it does
  **not** own children. Glass *behind* your content is `composition: background` or an
  `FxView effect`; multiple glass views that morph use `FxGroup`/`FxItem` (`57`).

## Semantic surface (the effect's uniforms — mounted by `<Fx>`/`FxView`)

`material` is an **effect**, so it reaches the consumer through the standard effect surface
(`50`/`55`/`57`), never as a `Material`/`GlassContainer` component:

```tsx
<Fx effect="glass" />                              // fx-owned drawn glass layer
<FxView effect={fx.effect.glass({ tint: '#fff' })}>// glass attached to YOUR content
  <MyCard />
</FxView>
<FxGroup>                                          // morphing/merging glass — the only compound (57)
  <FxItem><Fx effect="glass" /></FxItem>
  <FxItem><Fx effect="glass" /></FxItem>
</FxGroup>
```

The typed inputs are the **glass effect's uniforms/config**, a conscious superset of the
prior-art libs (so their users feel at home), plus fx-only extensions:

```ts
interface MaterialUniforms {
  variant?: 'regular' | 'clear';       // UIGlassEffect.Style on 26 (NOT the public `effect` id)
  interactive?: boolean;               // system liquid press response (UIGlassEffect.isInteractive)
  tintColor?: string;                  // blur-preserving tint
  colorScheme?: 'system' | 'light' | 'dark';
  intensity?: number;                  // 0–1 presence (fractionComplete), fx-only
  weight?: 'ultraThin' | 'thin' | 'regular' | 'thick' | 'chrome';  // material fallback weight
}
```

`variant`/`interactive`/`tintColor`/`colorScheme` mirror the prior-art vocabulary
(`variant`, not `effect` — `effect` is reserved for the public `<Fx effect="glass">` id);
`intensity` and `weight` (material fallback) are fx-only. **Glass morphing/merging is
`FxGroup`/`FxItem`** — the surface's one honest compound (each item a real glass view that
merges) — not a `material`-specific component.

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| glass | SwiftUI `.glassEffect` (26, the shipped hosted rung — backed by system `UIGlassEffect`/`UIVisualEffectView`; `structure.ios`) | — (no system glass) |
| material fallback | `UIBlurEffect` adaptive materials (13–25) | `RenderEffect.createBlurEffect` (31) + overlay |
| below floor | — | Haze/Cloudy lib |

**iOS-premium, Android-weakest** node: glass is a 26+ progressive enhancement; Android has
no Liquid Glass, so it composes blur + gradient + overlay. Backdrop sampling is free/live on
iOS (`UIVisualEffectView`) but costly on Android (`RenderEffect` blurs own content) — equal
polish, not pixel parity. Mechanics (the `UIVisualEffectView` host, `fractionComplete`
intensity, `cornerConfiguration`, the Android blur layering) live in `structure.{ios,android}.md`.

## Surface consumption

Mounted by `<Fx>`; attachable to `FxView` as decoration; morphing/merging glass uses
`FxGroup`/`FxItem` (the one compound). Feeds `effect=` id `glass`.

```tsx
<Fx effect="glass" />                              // fx-owned drawn glass
<FxView effect={fx.effect.glass({ tint })}><MyCard /></FxView>
<FxGroup><FxItem><Fx effect="glass" /></FxItem><FxItem><Fx effect="glass" /></FxItem></FxGroup>
```

**Not allowed:** owning RN children. (`material` *does* sample its **own backdrop** live —
that is the system view's job, `interaction:'self'` — but it never wraps or distorts an RN
subtree.)

## Composition & stacking

- **kind:** render-target · **interaction:** `self`. **composition:** `surface` (content
  on glass) or `background` (glass behind content); not a free-floating overlay.
- Stacks lightly: `material + tint` (a uniform), and `filter` over its own layer. It does
  not compose *under* arbitrary effects the way `fill`/`shader` do — the system view is
  largely self-contained.

## Runtime behavior

- **native** — the system view owns morph + (with `interactive`) press response; fx does
  not drive it per frame.
- **state-eased** — `intensity` (`fractionComplete`) and `tint` change discretely, eased by
  `transition`.
- **interactive-native-input** — `interactive:true` enables the system liquid press; it is
  `self`, so fx does **not** route it to the runtime (G).

## Degradation

A premium fallback ladder, never a flat box: iOS 26 `UIGlassEffect` → iOS 13–25 blur
material → Android `RenderEffect` blur + overlay → below floor Haze/Cloudy.

The below-floor rung is **`via:'lib'`**, which is a **dependency contract, not a silent
bundle**: fx does not ship Haze/Cloudy itself — the `lib` rung implies an **optional peer
dependency** the app installs, gated by the `6-ship/53` peer/optional-dependency policy
(decision 6 — the optional-peer rule is **resolved**; only package/version naming remains open
in `02`). If the lib isn't present, the rung guards out and the ladder degrades further
(graceful), never a hard dependency.

## Events

`onLoad` (when the material is ready) only. Press/morph are **handled by the system view**
(`self`), so fx surfaces **no `onPress*`** for `material` — that is the system's, not fx's.

## Decisions

1. **`material` is `interaction: 'self'`** — the system view owns its press/morph; fx
   exposes `interactive` as a passthrough, and does not route it to the runtime (G).
2. **Uniforms are a conscious superset** of `@callstack/liquid-glass` + `expo-glass-effect`,
   plus fx-only `intensity`, `weight` material fallback, themes.
3. **Glass morphing uses `FxGroup`/`FxItem`** (the surface's only compound, `57`) — there is
   **no `Material`/`GlassContainer` component**; glass is mounted by `<Fx>`/`FxView effect`.
4. **Premium fallback, never a flat box** — below the glass floor, degrade to a real
   material/blur, not a plain `View`.
5. **`FxGroup` merge contract is system-owned in V1.** Glass morphing uses the system's
   `GlassEffectContainer` on iOS 26+; fx exposes no explicit `spacing` or merge-threshold
   prop in V1. The merge-threshold contract is deferred to V2. Glass is the only effect
   that supports cross-item morph in V1.

## Open questions

- ~~**`UIGlassEffect.Style` case set + beta guard**~~ — **resolved (FX-002; U3-002 device
  gate, 2026-06-10).** `.regular`/`.clear` confirmed on device (iOS 26, Xcode 26.5) via
  `UIGlassEffect` on the shipped UIKit rung — visually distinct over a moving backdrop.
  `.identity` is moot: this doc ships `regular`/`clear` only and fx does not adopt it.
- **Android backdrop blur cost** — capturing parent content for true backdrop blur is
  expensive/stale-prone; decide the default (own-content blur vs Haze) per `structure.android`.
- **`intensity` semantics across platforms** — `fractionComplete` on iOS vs blur radius on
  Android; normalize 0–1 consistently.
- **`FxGroup` merge contract for glass** — **resolved (DOC-006, 2026-06-10).** Merge
  semantics are system-owned in V1 via `GlassEffectContainer`; no explicit `spacing` prop.
  See `57` Decision 6 and `21` Decision 5.

## Platform notes

- iOS glass shape: `structure.ios.md` §material records the host-layer corner-radius read and the `.glassEffect` compositing limit (glass samples only its own host).

## Sources

- `_legacy/02-ios-glass-materials.md` — the full iOS glass/material findings (prior-art
  superset, `UIGlassEffect`/`UIGlassContainerEffect`, intensity, vibrancy, corners).
- `02-capability-ir-and-lowering.md` — the `material` rungs; `structure.{ios,android}.md` — mechanics.
- Apple `UIGlassEffect`/`UIVisualEffectView`; Android `RenderEffect`; Haze/Cloudy (links in structure docs).
