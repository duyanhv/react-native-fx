# Capability: filter
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the `filter` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`filter` is the pixel-filter capability — blur, saturation, contrast, brightness,
hue, opacity, shadow. It is a **modifier**, not a self-contained render-target, which
makes it the node most exposed to the hosting line: a filter applied over *live RN
content* re-raises the iOS touch-severing problem. So `filter` is exposed as a
modifier **bundled inside effect components**, never as a general wrapper around an
RN subtree.

## The node

- **id:** `filter` · **kind:** modifier · **interaction:** `none` · **phase:** v1.
- Applies to the effect's **own** hosted content (e.g. a filter on a `fill` or
  `shader` layer), composed inside an effect component — not over arbitrary RN children.

## Semantic surface

```ts
interface FilterUniforms {
  blur?: number;        // radius
  saturation?: number;  // 0 = grayscale, 1 = normal, >1 boosted
  contrast?: number;
  brightness?: number;
  hueRotate?: number;   // degrees
  opacity?: number;
}
```

Filters compose (chain) in declared order. Values are static config (Regime B); the
native side may ease them via the `transition` channel (`40`).

## Lowering (summary — authority is 02 + structure.\*)

| | iOS | Android |
|---|---|---|
| filters | SwiftUI `.blur`/`.saturation`/`.contrast`/`.hueRotation`/`.shadow` (hosted) | `RenderEffect` blur + color-filter chain (31, hosted) |

**Parity**, with one asymmetry: on iOS these modifiers are safe only over the
effect's own hosted content (wrapping live RN content severs touch); on Android
`RenderEffect` is draw-time, so it *could* apply over live content without severing —
but V1 keeps the bundled-inside-effect rule on both platforms for consistency.
Mechanics in `structure.{ios,android}.md`.

## Decisions

1. **`filter` is an internal modifier, not an RN-content wrapper** — bundle it inside
   effect components (over `fill`/`shader` layers), never around a live RN subtree.
2. **Filters chain in declared order** and are static config eased by `transition`.
3. **Parity node** — native filter modifiers both sides; the Android draw-time
   freedom is noted but not exposed as a wrapper in V1.

## Open questions

- **Whether to ever expose a content-filter wrapper on Android** (where it's
  touch-safe) — ties to `content-distort` being Android-planned (`02`).
- **Shadow as `filter` vs a layout concern** — `.shadow` straddles; decide its home.

## Sources

- `02-capability-ir-and-lowering.md` — the `filter` rungs.
- `structure.ios.md` / `structure.android.md` — SwiftUI filter modifiers / RenderEffect chain.
- `_legacy/03-android-rendereffect.md` — Android RenderEffect detail (draw-time, chaining).
