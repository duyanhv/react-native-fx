# Capability: filter
Status: researched
Phase: v1
Feeds: 50-api-and-presets.md
Owns: the `filter` IR node (semantics). Mechanics → structure.{ios,android}; lowering → 02.

## Why this matters

`filter` is the pixel-filter capability — blur, saturation, contrast, brightness,
hue, opacity, shadow. It is a **modifier**, not a self-contained render-target, which
makes it the node most exposed to the hosting line: a filter applied over *live RN
content* re-raises the iOS touch-severing problem. So `filter` is an **internal modifier
inside an `EffectStack`** (a step in `fx.effect.*`, mounted by `<Fx>`, or attached to
`FxView` as decoration — `55`/`57`), **never a wrapper around live RN children**.

## The node

- **id:** `filter` · **kind:** modifier · **interaction:** `none` · **phase:** v1.
- **V1 status: unselectable** — both lowering rungs are marked `status:'planned'`; no
  `FxFilterView` renderer exists. `select()` returns `{via:'none'}` for all contexts.
  `FilterConfig` is exported for type use, but the node is not offered until a renderer ships.
- Applies to the effect's **own** layers (e.g. a `.blur()` step over a `fill`/`shader` in
  the same `EffectStack`) — never over arbitrary RN children.

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
| filters | SwiftUI `.blur`/`.saturation`/… (hosted, `status:'planned'`) | `RenderEffect` chain (31, hosted, `status:'planned'`) |

Both rungs are `status:'planned'` — `select()` skips them and returns `{via:'none'}`.
**Planned parity**, with one asymmetry: on iOS these modifiers are safe only over the
effect's own hosted content (wrapping live RN content severs touch); on Android
`RenderEffect` is draw-time, so it *could* apply over live content without severing —
but V1 keeps the bundled-inside-effect rule on both platforms for consistency.
Mechanics in `structure.{ios,android}.md`.

## Surface consumption

**Never mounted standalone.** `filter` is a **modifier step inside an `EffectStack`** —
`fx.effect.mesh().blur()` — applied to the render-targets below it, mounted by `<Fx>` or
attached via `FxView effect`. There is **no `effect="blur"` standalone id**; it is a stack
operation, not a render-target.

```tsx
<Fx effect={fx.effect.shader('plasma').blur(8)} />     // blur over the shader layer
<FxView effect={fx.effect.glow().saturation(1.2)}><MyCard /></FxView>
```

**Not allowed:** wrapping a live RN subtree (re-raises the iOS touch-severing problem).

## Composition & stacking

- **kind:** modifier. **No `composition` mode of its own** — it has no position; it
  *transforms the layers beneath it in the stack*.
- Stacks: applies to the preceding render-target(s) in declared order — `fill + filter`,
  `shader + glow + blur`. Multiple filters chain (`55`).

## Runtime behavior

- **static config eased by `transition`** — e.g. `blur` radius or `saturation` amount eased
  on change. It has **no native clock of its own** (it rides the layer it modifies).

## Degradation

In V1, `filter` is always `{via:'none'}` (both rungs `status:'planned'`). A stack that
includes a `filter` step silently drops it — the render-targets below still draw, gracefully.

## Events

**None.** `filter` is internal config; it surfaces no JS events (its host effect may emit
`onLoad`/`onError`).

## Decisions

1. **`filter` is an internal modifier, not an RN-content wrapper** — a step inside an
   `EffectStack` (over `fill`/`shader` layers, mounted by `<Fx>`/`FxView effect`), never
   around a live RN subtree.
2. **Filters chain in declared order** and are static config eased by `transition`.
3. **Planned parity node** — native filter modifiers planned on both sides; the Android
   draw-time freedom is noted but not exposed as a wrapper in V1.

## Open questions

- **Shadow as `filter` vs a layout concern** — `.shadow` straddles; decide its home.

**Resolved** — *whether to ever expose a content-filter wrapper on Android* (where
it's touch-safe): yes. The `content-distort` `ripple` demonstrator ships (Android-only,
draw-time `RenderEffect` → touch survives; mechanical `contentDistortion='ripple'`,
high-level sugar deferred). See `02 §content-distort`; shipped + device-verified under
DEF-009 (closes FX-008).

## Sources

- `02-capability-ir-and-lowering.md` — the `filter` rungs.
- `structure.ios.md` / `structure.android.md` — SwiftUI filter modifiers / RenderEffect chain.
- `_legacy/03-android-rendereffect.md` — Android RenderEffect detail (draw-time, chaining).
