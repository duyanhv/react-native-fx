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

A preset is the *default*; other props refine it (`41`). **V1 ships the
`preset`/`motion`/`transition` triad; `tune` is deferred to MOT-001 (DOC-019).**

- **`preset`** — the platform-idiomatic bundle; fx picks shape + timing per platform.
- **`motion`** — an explicit `MotionSpec` map that **overrides the shape** and **fixes it
  cross-platform** (opt-in uniformity — the only sanctioned way off the platform default).
- **`transition`** — expert timing override only.
- **`tune`** *(deferred — V1.x / MOT-001)* — `{speed, emphasis, distance}` intent adjustment
  *inside* the platform family; absent from the V1 surface.

```tsx
<FxPresence preset="transient" />                       // platform decides shape + timing
<FxPresence motion={{ enter: fx.motion.edgeIn({from:'bottom'}), exit: fx.motion.edgeOut({to:'bottom'}) }} />  // explicit (uniform)
```

## The three preset-like bundles

`preset` / `feedback` / `effect` are three bundles on three different owned surfaces — a
clear domain split, not one prop (`50`).

| Bundle | Prop on | What it bundles | Behavior-named values |
|---|---|---|---|
| **preset** (presence) | `FxPresence` | enter/exit shape + timing | `transient` (V1); `sheet`/`modal` deferred to MOT-001 (`42`) |
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
4. **The canonical API is `<Fx effect="…">`.** Named effect components ship only when
   three conditions hold: the effect is drawn whole by fx (rule #5), it is standalone-useful
   without wrapped content, and the canonical API remains `<Fx effect="…">` (the component
   is thin sugar). The V1 set that passes this test today is `EdgeGlow`. `MeshGradient` is a
   fill style, reached via `<Fx effect="mesh-gradient">` (or `fx.effect.mesh()`), not a
   standalone component. Escape is downward — `motion`/`effect` overrides → builders (`tune`
   would be the first rung but is deferred from the V1 surface, DOC-019).
5. **V1 vocabulary ratified (DOC-005), presence set narrowed (DOC-018).** The behavior-preset
   values that ship in V1 are: `transient` (presence); `lift` (state). The feedback value is
   `native`. `sheet`/`modal` (presence) are **deferred to MOT-001** — designed but held back
   because they name screen-scale presentations that collide with presence's scope ceiling
   (`42`, DOC-018). The per-platform shape and timing defaults behind every preset are
   **device-pending** and owned by MOT-001; they will be validated on device and propagated to
   `41`/`42`.
6. **V1 effect-component set ratified (DOC-004).** `EdgeGlow` ships as a component.
   `MeshGradient` does not. These are sugar over effects already in the curated catalog
   (DOC-003, SPINE-001) — not new surface. They export from the core package, not
   `@react-native-fx/lab` (consistent with `52` Decision #10).

## Open questions

- ~~**Ship the named effect-component sugar, or only `effect=`?**~~ — **Resolved (DOC-004).**
  The criterion is recorded in Decision 4; `EdgeGlow` passes it for V1. `MeshGradient` is a
  fill, reached via `<Fx>`.
- **`FxView` state vocabulary** — the named states per `preset` (`idle`/`selected`/…; `40`).
  Ratified as `idle` · `selected` for `lift` in `57` (DOC-005).

## Sources

- The design conversation: shape-native law; preset = platform-idiomatic behavior bundle;
  behavior-named not UI-named; `preset`/`motion`/`tune`/`transition` split.
- `50` (the prop language + layers), `41` (the law + `MotionSpec` + the split), `54`
  (FxPresence `preset`), `57` (FxView/FxPressable), `55` (`<Fx>` `effect`), `42` (defaults).
