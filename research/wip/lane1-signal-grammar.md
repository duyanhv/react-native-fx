# Lane 1 — native signal grammar and expressiveness ceiling

Status: historical — architecture promoted to canon (DOC-032); non-authoritative
Phase: additive (depth-1 Boundary A/B; no rule-break)
Feeds: `0-spine/04`/`05` (the canonical home for boundaries, lanes, and regimes; `capability-boundary-classifier.md` is the historical derivation), `0-spine/02-capability-ir-and-lowering.md`, `5-realization/structure.{ios,android}.md`
Scope: define the native mapping vocabulary that lets a native continuous source drive fx-owned presentation declaratively — and find the exact interactions it *cannot* express, because that ceiling is the line that sends a case to Lane 2 (regime C) or Boundary L.

> **Promoted (DOC-032, 2026-06-28).** The canonical architecture now lives in
> `0-spine/04 §The Lane 1 boundary invariant`, `0-spine/05 §Lane 1 native signal grammar`,
> `3-motion/40 §Source-driven interaction events`, and `7-implementation/architecture.md §12`.
> This WIP remains derivation history and stress-test detail. Cite the canonical docs.

## The hard box

Lane 1 is **not a general animation language.** It is a small native signal grammar for
fx-owned presentation only. Every primitive below earns its place by covering a real interaction
shape; the grammar stays minimal on purpose, because the moment it can express arbitrary authored
math or arbitrary state machines, it has stopped being Lane 1 and become Lane 2 — the thing it
exists to keep empty.

Three rules draw the box:

- **A target is transform/opacity (Boundary A) or an effect uniform (Boundary B) — never a layout
  prop.** The moment a mapping wants to drive height, width, or flex, it is Boundary L, a
  different escalation.
- **Stateful operators are a fixed, enumerated, parameterized set with native-defined semantics —
  not a user-composable state machine.** You pick an operator and set its parameters; you do not
  author its transition logic. A grammar that lets you assemble arbitrary stateful graphs is Lane
  2 in disguise.
- **Semantic events are the substitute for per-frame JS, not telemetry.** They let React update
  app state at interaction boundaries while native owns every frame in between.

## The Lane 1 contract

A native **source** produces a normalized signal. A native **mapping** transforms that signal. An
fx-owned **target** consumes the mapped value. JS declares the graph once; JS never receives or
sends frames. The clock and the source are native, so nothing here crosses the regime-C fence.

```txt
native source  ──normalized signal──▶  native mapping  ──mapped value──▶  fx-owned target
   (scroll, pan, press,                  (condition → transform            (transform/opacity
    overscroll, motion)                   → bounds → settle)                 or effect uniform)
        │                                                                          │
        └── may need a layout READ to normalize (Boundary A read, allowed) ────────┘
        semantic events (onFxSignalEvent{kind}) are the only thing JS receives — never frames
```

## The grammar

Just enough source and target vocabulary to keep the mapping concrete; the mapping is the part
under study.

### Sources (signal in)

A source emits a *normalized* signal — a progress value, a translation, a depth. Scroll
normalizes against content/viewport size; a drag normalizes against a reference distance; motion
against an angle range. Normalization sometimes needs a layout **read** (e.g. "dismiss at 40% of
the card height") — that is a Boundary-A read, allowed; it never writes layout.

- scroll / content offset
- pan / drag translation (a self-gesturing source on `expo-view`)
- press / hover depth (already native — see below)
- overscroll / rubber-band distance
- device motion (tilt / accelerometer)

### Mapping is phase-structured: track → settle

A source-driven interaction has two phases, and every piece sorts into one:

- **Track (active phase, always on).** While the source is live, the target follows the mapped
  signal. `follow` *is* this phase — the spine the grammar hangs on, not an operator. Conditioning,
  transforms, and the bounds policy shape *what* is tracked.
- **Settle (release phase, optional).** When the source ends (finger up, scroll rest), a single
  stateful operator decides the rest state. Track-only interactions (parallax) have no settle;
  gesture interactions (drag-dismiss) do.

This temporal structure is what isolates state: **every piece that carries hidden state lives in
the settle phase**, which is exactly where the hard-box rule (fixed, enumerated, not a composable
FSM) has to bite. The track phase is stateless by construction.

**Signal conditioning (optional, source-side only).**

- `smooth({ timeConstant })` — a constrained native low-pass applied **immediately after source
  normalization**, to denoise unstable native sources before mapping. Valid only for noisy
  continuous sources: sensor, hover, and raw pointer/drag where platform data is jittery. It is
  **not** for softening press depth or transition response — that is "make the target lag nicely,"
  which is animation behavior owned by the native motion/settle envelopes, not signal
  conditioning. Source-side placement is what keeps it from becoming a second hidden animation
  layer. Kept tiny — bespoke fusion (Kalman, band-pass, multi-axis) routes to Lane 2. The shipped
  `pressDepth` lerp is prior art that *native smoothing exists*, not the model for placement.

**Track shaping — stateless transforms.** Pure `y = f(x)`, no memory.

- `range-map` (input range → output range; `invert` is a reversed output range, not a separate op)
- `curve` (easing applied to the normalized signal)
- `deadzone` (ignore signal below a threshold magnitude)

**Bounds policy — extrapolation at the range edges.** What the output does when the signal leaves
the input range. A parameter of `range-map`, not an operator, so resistance stays native/
preset-shaped instead of inviting arbitrary math:

- `extrapolate: "clamp"` — stop at the edge (the default; `clamp` is this, not a standalone op)
- `extrapolate: "rubberBand"` — asymptotic native resistance (the platform's own bounce)

`extend` (unbounded linear output) is deliberately omitted: mathematically natural but
product-weak, and unbounded output is exactly where bad configs turn ugly — runaway parallax,
scale, blur, or material intensity. It returns only with a concrete interaction that needs it.

**Settle — stateful release operators.** The load-bearing part. Most "real" interactions are
*not* `y = f(x)` — they have memory, thresholds, velocity, interruption, and settling. Without
these, drag-dismiss, sticky headers, sheet detents, pull-to-reveal, and swipe actions falsely
escalate to regime C.

- `threshold` (latch when the signal crosses a value)
- `hysteresis` (different enter/exit thresholds, so it does not chatter at the boundary)
- `snap` / `detent` (settle to the nearest of a fixed set of rest points)
- `spring-to` (settle to a target with platform-native spring physics)
- `velocity-settle` (the release decision considers gesture velocity, not just position)

These are **fixed, enumerated, parameterized operators** — `snap({ detents, velocityThreshold })`,
not a hand-assembled FSM. Their transition logic is native and closed.

### Events follow the phase lifecycle

Operators first, events second: the boundaries fall out of the track → settle lifecycle rather
than being invented (naming events before the operators are stable either overfits them or
duplicates `onFxTransitionEnd`).

**One shared event contract, two families**, distinguished by *who drives the motion*:

- **transition completion** — `onFxTransitionEnd`, unchanged: the terminal event of a *discrete*
  fx envelope (a `visible`-style target fx runs itself).
- **interaction boundary** — one generic `onFxSignalEvent`, carrying
  `kind: "enterRange" | "exitRange" | "commit" | "settle" | "interrupt"`: the boundaries of a
  *source-driven* interaction, where a native source — not fx's own envelope — drives the motion.
  Track phase emits `enterRange` / `exitRange` (signal crosses a range / deadzone / threshold);
  settle phase emits `settle` (reached rest), `commit` (resolved to a committed detent or
  dismissal), `interrupt` (cut short by a new gesture).

The **non-overlap rule** that prevents duplication: a given fx owner is *either*
discrete-target-driven (emits `onFxTransitionEnd`) *or* source-driven (emits `onFxSignalEvent`)
for a given motion — never both. A drag-dismiss settling is `onFxSignalEvent{ kind: "settle" }`,
*not* a transition end, even though a `spring-to` ran the settle, because the interaction owns it.
This is what keeps `settle` / `commit` from re-implementing `onFxTransitionEnd`.

**Compact native surface.** At the Expo Modules boundary this is **one** event dispatcher with a
`kind` discriminant, not five separate event props. Per-kind callback props (`onCommit`,
`onSettle`, …) are fine as JS sugar on a wrapper later; the native surface stays small. The
shipped press events use separate props (`onShaderPress*`), so this is a *new* native idiom —
press is a candidate to fold into the discriminated event later (see open questions).

**Payload**, aligned to the shipped contract: an `owner` / `source` identity, the `kind`, a
`range` id for range crossings (an interaction can define several — deadzone, action-threshold),
`finished` or `interrupted` for terminal kinds, and **no frame values** — only the *final
boundary value* where one is meaningful (the committed detent, the settled position). Never a
stream. An interaction that "needs JS" almost always needs it at a boundary, not per frame — that
is what keeps it inside Lane 1.

### Targets (value out)

- transform / opacity on an fx-owned wrapper → **Boundary A**
- effect uniform / intensity (material, edge-glow, shader) → **Boundary B**
- never a layout prop → that is **Boundary L**

## Stress test — ten real interactions

The falsifying question for each:

> Can this be expressed as native source + native mapping + fx-owned target, with only semantic
> events back to JS?

| interaction | source | mapping | target | verdict |
|---|---|---|---|---|
| scroll-linked header collapse | scroll offset | track + range-map; `snap` settle (collapsed/expanded) | translate/scale/opacity of header wrapper (A) | **Lane 1** for the visual collapse; **Boundary L** if content below must reflow to reclaim the space |
| parallax hero | scroll offset | track + range-map (fractional, `extrapolate: clamp`) | translateY/scale of hero wrapper (A) | **Lane 1** — track-only, no settle |
| pull-to-reveal banner | overscroll / drag distance | track + range-map + `threshold`; `spring-to` settle; `onFxSignalEvent{commit}` | translate/opacity of a reserved banner wrapper (A) | **Lane 1** if reserved/overlay; **Boundary L** if it pushes siblings via Yoga |
| drag-to-dismiss card/sheet | pan translation | track (`extrapolate: clamp`); `velocity-settle` + `snap`; `onFxSignalEvent{commit/settle}` | transform/opacity of sheet wrapper (A) | **Lane 1** — the canonical track→settle case; → **Lane 2** only if the dismiss predicate/physics is bespoke beyond threshold+velocity |
| swipe actions | pan translation | track (`extrapolate: rubberBand`); `snap` detents + `threshold`; `onFxSignalEvent{commit}` (full-swipe trigger) | transform of row wrapper (A) | **Lane 1** — action content is app-owned, the motion is Lane 1 |
| interactive material intensity | press / hover or scroll | track + range-map | material/effect uniform (B) | **Lane 1** — track-only, Boundary B |
| press depth / hover depth | press recognizer | `smooth` + track | transform / effect uniform (A/B) | **Lane 1** — already shipped natively (`FxSurfaceView` smooths `pressDepth`) |
| edge glow tied to overscroll | overscroll | track + range-map + `curve` | edge-glow intensity uniform (B) | **Lane 1** — track-only, Boundary B |
| sensor tilt material/parallax | device motion | `smooth` + track + range-map + `deadzone` | transform (A) / effect (B) | **Lane 1** for basic tilt→parallax (with `smooth`); bespoke sensor fusion → **Lane 2** |
| reorder / drag placeholder | pan translation | track for the dragged item | transform of dragged wrapper (A) | **dragged item = Lane 1**; the gap / sibling displacement = **Boundary L**; the order commit = **cross-tree / mutation frontier** — this case falsifies a single-boundary Lane 1 |

## The expressiveness ceiling

Stated once, as a principle rather than a list: **Lane 1 owns the presentation of the driven
element** — its transform, opacity, and effect uniforms on an fx-owned wrapper, settled by the
fixed native stateful operators, with semantic events at the boundaries. It falsifies on three
distinct edges, each routing somewhere specific:

- the interaction's consequence must move *other* elements through Yoga → **Boundary L** (header
  reflow, banner push, reorder gap);
- the interaction changes React child *structure or order* → **cross-tree / mutation frontier**
  (the reorder commit);
- the mapping or commit decision needs *arbitrary user-authored math or per-frame state* beyond
  the enumerated operators → **Lane 2 / regime C** (bespoke dismiss physics, custom sensor
  fusion).

The recurring shape across the stress test is that **most rich interactions split**: the driven
element is Lane 1, and its layout or structural consequence is Boundary L or the frontier. Lane 1
is deliberately the *element-motion* half — and the stateful operators are what keep the
canonical gesture interactions (drag-dismiss, swipe, pull-to-reveal, sticky collapse) on the Lane
1 side of the line instead of falsely escalating them.

## What this earns

If the grammar above holds, the additive Lane 1 work covers: parallax, opacity/blur/material
reveals, scale-on-scroll, toolbar/header compression, pull-to-reveal (reserved), drag-to-dismiss
sheets, swipe actions, interactive material/press/hover depth, overscroll edge-glow, and basic
sensor parallax — none of which need a rule-break. The cases that genuinely escape are narrow and
named: anything whose *consequence* is sibling layout (Boundary L), anything that reorders the
tree (frontier), and anything that needs authored per-frame math (Lane 2). That is the payoff of
the hard box: a large, concrete set of interactions ship at depth 1, and the escapes are precise
enough to gate individually.

## Open questions

- Does the shipped per-prop press surface (`onShaderPress*`) fold into the discriminated
  `onFxSignalEvent`, or does Lane 1 match the per-prop idiom? One event vocabulary is cleaner; the
  fold-in is a small migration, but it touches a shipped, device-proven surface.
- How does a source bind to its normalization reference when the reference is a layout value
  (e.g. card height) — through the existing layout read, or does it force a measure dependency?
- Is `pull-to-reveal` worth supporting *only* in the reserved-size form first (Lane 1), with the
  Yoga-pushing form explicitly deferred to Boundary L, mirroring the flow draft's sequencing?
- What is the declarative JS shape for the graph (source → mapping → target) that stays "declared
  once" and never tempts a per-frame callback?

## Sources

- `0-spine/04` / `0-spine/05` — canonical: Boundary A/B/L (`04`), the source-channel axis, Lane 1
  vs Lane 2, and the regime-C gate this note operates within (`05`). (`capability-boundary-classifier.md`
  is the historical derivation.)
- `research/wip/native-slot-layout-transitions.md` — the reserved-size vs measured-content (Yoga)
  split that decides when a reveal/collapse is Lane 1 versus Boundary L.
- `packages/ios/FxSurfaceView.swift` and `FxPressHandler.swift` — press depth already drives a
  native uniform with settle smoothing; the existing proof that a native source → native mapping →
  fx-owned target path runs with no per-frame JS.
- `0-spine/05-native-boundary-decision.md` — decision #5 reserves regime C for authored
  continuous mapping; Lane 1 exists to keep that lane empty as long as possible.
