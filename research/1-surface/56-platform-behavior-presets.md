# Surface: platform-native behavior presets
Status: researched (API) · the preset vocabularies + per-platform defaults open (→ 42, 41, device)
Phase: v1
Feeds: the public package; consumed by 54 (FxPresence), 57 (FxView/FxPressable), 55 (<Fx>)
Owns: the platform-native behavior bundles — `preset` / `feedback` / `effect`.

## Why this matters

The top layer is **not a UI kit.** fx is a native presentation layer that **wraps any UI
kit** — it owns *how content appears and moves*, never the content or component design. So
the front door is **named presentation behaviors** applied to *your* components, not a pile
of exported `<Toast>`/`<Button>`/`<Card>`.

> **A preset is a platform-idiomatic behavior bundle.** It resolves the *whole behavior —
> shape and timing — per platform* (the shape-native law, `41`). Presets are
> **behavior-named, never UI-named** (`transient`, `sheet`, `lift` — presentation
> *behaviors*; never UI *widgets* like `toast`, `card`, `button`). Only
> visual things fx draws whole (effects) become components.

This is the line that keeps fx from being "Expo UI with animation" *and* from being a
"cross-platform animation skin": fx never ships the toast/card, and it does not force the
same geometry on both platforms — `preset="transient"` is a *top banner on iOS, a bottom
snackbar on Android* if that is what each platform does.

```tsx
<FxPresence visible={open} preset="transient"><MyToast/></FxPresence>
<FxView     state={selected ? 'selected' : 'idle'} preset="lift"><MyCard/></FxView>
<FxPressable feedback="native"><MyButton/></FxPressable>
<Fx effect="edge-glow" />        // fx owns the visual whole — no wrapped content
```

## preset / motion / tune / transition (the shape-native engine)

A preset is the *default*; three other props refine it (`41`):

- **`preset`** — the platform-idiomatic bundle; fx picks shape + timing per platform.
- **`motion`** — an explicit `MotionSpec` map that **overrides the shape** and **fixes it
  cross-platform** (opt-in uniformity — the only sanctioned way off the platform default).
- **`tune`** — `{speed, emphasis, distance}` intent adjustment *inside* the platform family.
- **`transition`** — expert timing override only.

```tsx
<FxPresence preset="transient" />                       // platform decides shape + timing
<FxPresence motion={{ enter: fx.motion.edgeIn({from:'bottom'}), exit: fx.motion.edgeOut({to:'bottom'}) }} />  // explicit (uniform)
```

## The three preset-like bundles

`preset` / `feedback` / `effect` are three bundles on three different owned surfaces — a
clear domain split, not one prop (`50`).

| Bundle | Prop on | What it bundles | Behavior-named values |
|---|---|---|---|
| **preset** (presence) | `FxPresence` | enter/exit shape + timing | `transient` · `sheet` · `modal` · … (`42`) |
| **preset** (state) | `FxView` | state→transform shape + timing | `lift` · … |
| **feedback** | `FxPressable` | press response shape + timing | `native` · … |
| **effect** | `<Fx>` | a visual effect stack | `edge-glow` · `mesh-gradient` · `glass` · … (`55`, `20`–`24`) |

## The one exception — effect components (an open ship decision)

The **canonical API is `<Fx effect="…">`.** Separately, `effect` presets are the only ones
that *may also* ship as named **components** — because fx **draws them whole** (no developer
content, no UI kit replaced). Whether to ship them, and how many, is an **open ship
decision** (`6-ship`), **not a core architecture promise**:

```tsx
<EdgeGlow intensity={0.8} />         // ≈ <Fx effect="edge-glow" intensity={0.8} />
<MeshGradient palette="aurora" />
```

Optional thin sugar over `<Fx effect="…">`; the `effect=` preset is the canonical form.

## Decisions

1. **A preset is a platform-idiomatic behavior bundle** — fx resolves the whole shape +
   timing per platform (shape-native, `41`); only an explicit `motion` override goes
   cross-platform-uniform (partial `edge`/`origin` sugar is deferred, `41`).
2. **Presets are behavior-named, not UI-named** (`transient`/`sheet`/`lift`, never
   `toast`/`card`/`button`) — presentation behaviors, not UI widgets —
   fx owns the behavior, not the component. It wraps any UI kit.
3. **Three preset-like bundles** — `preset` (presentation), `feedback` (press), `effect`
   (visual) — on three owned surfaces; an honest domain split, not a reduction.
4. **The canonical API is `<Fx effect="…">`.** If named effect components ship at all
   (`EdgeGlow`/`MeshGradient`), they are optional sugar over it — an **open ship
   decision** (`6-ship`), not a core promise, and only effects qualify (fx draws them whole).
   Escape is downward — `tune` → `motion`/`effect` overrides → builders.

## Open questions

- **The behavior-preset vocabulary** — the actual `preset`/`feedback` value sets
  (`transient`/`lift`/…), re-derived from `42`'s presence-behavior findings but
  **behavior-named**, and their per-platform shape+timing defaults (`41`'s default catalog);
  fill on device.
- **Ship the named effect-component sugar, or only `effect=`?** Lean: a small curated set.
- **`FxView` state vocabulary** — the named states per `preset` (`idle`/`selected`/…; `40`).

## Sources

- The design conversation: shape-native law; preset = platform-idiomatic behavior bundle;
  behavior-named not UI-named; `preset`/`motion`/`tune`/`transition` split.
- `50` (the prop language + layers), `41` (the law + `MotionSpec` + the split), `54`
  (FxPresence `preset`), `57` (FxView/FxPressable), `55` (`<Fx>` `effect`), `42` (defaults).
