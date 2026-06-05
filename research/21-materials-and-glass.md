# Capability: material (glass & blur)
Status: researched
Phase: v1 (progressive: Liquid Glass is iOS 26+)
Feeds: 50-api-and-presets.md
Owns: the `material` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`material` is the system-glass/blur capability — Liquid Glass on iOS 26, adaptive
materials below it, blur-based glassmorphism on Android. It is `interaction: 'self'`:
a `UIVisualEffectView`/`UIGlassEffect` is a real UIKit view that handles its own
press response (`isInteractive`) and samples its backdrop live, so fx neither owns
its gestures (not `fx`) nor treats it as inert (not `none`). Positioning: fx is the
**cross-platform superset** of `@callstack/liquid-glass` and `expo-glass-effect` —
both iOS-26-only and both falling back to a plain `View`; fx promises *premium glass
everywhere*.

## The node

- **id:** `material` · **kind:** render-target · **interaction:** `self` · **phase:** v1.
- A self-contained system material hosted as a layer; children mount inside it and
  stay interactive (real `contentView` hit-testing on iOS).

## Semantic surface

A conscious superset of the prior-art libs' vocabulary, plus fx-only extensions:

```ts
interface MaterialProps {
  effect?: 'regular' | 'clear';        // UIGlassEffect.Style on 26; material weight below
  interactive?: boolean;               // system liquid press response (UIGlassEffect.isInteractive)
  tintColor?: string;                  // blur-preserving tint
  colorScheme?: 'system' | 'light' | 'dark';
  intensity?: number;                  // 0–1 presence (fractionComplete), fx-only
  weight?: 'ultraThin' | 'thin' | 'regular' | 'thick' | 'chrome';  // material fallback weight
}
// Compound — the one honest compound (each child is a REAL glass view):
// <GlassContainer spacing={12}><Material/><Material/></GlassContainer>
```

- `effect`/`interactive`/`tintColor`/`colorScheme` mirror the prior-art libs (so
  their users feel at home). `intensity` and `weight` (material fallback) are fx-only.
- **`GlassContainer`** is a real compound component (`spacing` → merge threshold):
  each child is a genuine glass view that morphs/merges — the one place a compound is
  honest, because subcomponents are real native layers (the `_legacy/09` rule).

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| glass | `UIGlassEffect` on `UIVisualEffectView` (26) | — (no system glass) |
| material fallback | `UIBlurEffect` adaptive materials (13–25) | `RenderEffect.createBlurEffect` (31) + overlay |
| below floor | — | Haze/Cloudy lib |

**iOS-premium, Android-weakest** node: glass is a 26+ progressive enhancement;
Android has no Liquid Glass, so it composes blur + gradient + overlay. Backdrop
sampling is free/live on iOS (`UIVisualEffectView`) but costly on Android
(`RenderEffect` blurs own content) — equal polish, not pixel parity. Mechanics
(the `UIVisualEffectView` host, `fractionComplete` intensity, `cornerConfiguration`,
the Android blur layering) live in `structure.{ios,android}.md`.

## Decisions

1. **`material` is `interaction: 'self'`** — the system view owns its press/morph; fx
   exposes `interactive` as a passthrough to it, and does not route it to the runtime.
2. **API is a conscious superset** of `@callstack/liquid-glass` + `expo-glass-effect`
   (shared vocabulary), plus fx-only `intensity`, `weight` material fallback, themes.
3. **`GlassContainer` ships as a real compound** (children are real glass views);
   `spacing` → the native merge threshold.
4. **Premium fallback, never a flat box** — below the glass floor, degrade to a real
   material/blur, not a plain `View`.

## Open questions

- **`UIGlassEffect.Style` case set + beta guard** — `.regular`/`.clear` confirmed;
  `.identity` unverified; needs Xcode 26 / device (carried from `_legacy/02`).
- **Android backdrop blur cost** — capturing parent content for true backdrop blur is
  expensive/stale-prone; decide the default (own-content blur vs Haze) per `structure.android`.
- **`intensity` semantics across platforms** — `fractionComplete` on iOS vs blur
  radius on Android; normalize 0–1 consistently.

## Sources

- `_legacy/02-ios-glass-materials.md` — the full iOS glass/material findings (prior-art
  superset, `UIGlassEffect`/`UIGlassContainerEffect`, intensity, vibrancy, corners).
- `02-capability-ir-and-lowering.md` — the `material` rungs; `structure.{ios,android}.md` — mechanics.
- Apple `UIGlassEffect`/`UIVisualEffectView`; Android `RenderEffect`; Haze/Cloudy (links in structure docs).
