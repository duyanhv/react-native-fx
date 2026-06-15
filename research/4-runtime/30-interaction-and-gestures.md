# Runtime: interaction & gestures
Status: researched
Phase: v2 (the interactive runtime lives on the `expo-view` substrate)
Feeds: 50-api-and-presets.md
Owns: the interaction contract (cross-platform). Mechanics → structure.{ios,android}.

## Why this matters

Interaction is the runtime (G) differentiator and the reason the `expo-view`
substrate exists. This doc owns the **cross-platform interaction contract** — the
`interactionMode` prop, the cooperative-recognizer principle, the semantic events,
and the cancellation/coexistence rules. The concrete recognizer configs live in
`structure.{ios,android}.md`; only the `shader` node (`interaction: 'fx'`) reaches
this layer, and only on `expo-view` (a hosted effect can't carry it — `01`).

**`interactionMode` is the `<Fx>` prop** — the **interactive *effect*** surface: an `<Fx>`
whose shader is touch-reactive, with the recognizer feeding shader uniforms
`pressDepth`/`pointerX`/`pointerY`/glow position. This is **not** `FxPressable` (`57`),
which wraps *your* content and gives it native press feedback. Different runtime ownership:
`<Fx interactionMode>` *is* the touch-reactive drawn effect; `FxPressable` animates a view
fx wraps. `interactionMode` lives only on `<Fx>`.

## The `interactionMode` contract

The whole interaction surface is one prop, default `none`. Read it as a 2×2: who
attaches a recognizer, and who claims/emits semantics.

| Mode | Attaches | Does | Claims? |
|---|---|---|---|
| **`none`** | nothing | touches pass straight through | never |
| **`passive`** | cooperative recognizer | observes the pointer → feeds a pointer uniform (`glowX`/`glowY`); no `onPress*` | never |
| **`active`** | the same recognizer, owning the press | full press lifecycle → `pressDepth`/`glowX`/`glowY` + `onPressIn/Out/Press/LongPress`; yields to scrollers on movement | press only |
| **`controlled`** *(shipped — DEF-020; discrete writes)* | nothing (zero arbitration) | the developer's own pipeline writes the uniforms — **discrete writes** via `setUniform`/`setHighlight`, or a future **UI-thread channel** (a Reanimated shared value bound off the JS thread, `40`); **never** per-frame `setUniform` from the JS thread | never |

## The cooperative principle

The recognizer is a **participant** in each platform's native arbitration, never a
custom arbiter racing RNGH:

- It begins eagerly on touch-down (the effect lights up instantly).
- It **never claims movement.** The moment an ancestor scroller/pager/sheet decides
  the gesture is a scroll (past slop), that ancestor wins and the OS **cancels** our
  recognizer — we render the spring-back. Yielding is the default outcome, not custom
  logic.

Because the surface is a plain native view (`expo-view`), the recognizer attaches
directly and **RNGH coexistence is free** — RNGH is built on the same primitives, so
being a good native citizen is being a good RNGH citizen. No RNGH dependency in V1.

## Native owns touch → feeds uniforms

Two input sources write the **same** uniform buffer, and the renderer is decoupled
from which is active:

1. **The cooperative recognizer** (`passive`/`active`) writes `pressDepth`/`glowX`/
   `glowY` on began/changed/ended/cancelled.
2. **JS imperatives** — `setHighlight`/`setUniform` (main-thread `AsyncFunction`s) —
   used by `controlled` for **discrete / low-frequency writes only**; continuous external
   sources bind through the **UI-thread channel** (`40`), never per-frame from the JS thread.

Per-pointer movement is written natively and **never crosses the bridge**. Only
**semantic** events reach JS — `onPress`/`onPressIn`/`onPressOut`/`onLongPress`,
low-frequency, `active` only.

## Cancellation = spring-back, no `onPress`

The single most important runtime behavior: when an ancestor scroller claims the
gesture, the effect springs back and emits **no** `onPress`. iOS cancel = `.cancelled`;
Android cancel = `ACTION_CANCEL`. Spring-back is a native render concern; it never
round-trips through JS.

## Findings — the arbitration model (verified against gesture-handler, `references/`)

The model to **borrow** (concepts, not the package — no RNGH V1 dep):

- **An explicit recognizer FSM** — `undetermined → began → active → end | failed | cancelled`
  — not a raw `UITapGestureRecognizer` (too rigid: max-delay/duration unconfigurable). fx
  uses a custom recognizer.
- **Slop-based early failure** — past `scaledTouchSlop` the press *fails itself* so the
  scroller wins; this is how it yields cooperatively (no complex rules).
- **Bidirectional simultaneous-recognition** — two recognizers coexist only if *both* opt in;
  otherwise the higher-priority one cancels the other.
- **An orchestrator + awaiting-chain** — "press waits for scroll to fail" is tracked
  explicitly until the scroller reaches failed/cancelled.
- **Coalescing key per activation** — batch rapid motion events to the dispatcher.
- **Coordinate transform** — touches map into the recognizer's (possibly transformed) view
  space, so reported coords match the visible region (ties to the SDF hit-test, `32`).
- **`shouldCancelWhenOutside`** — fail if the pointer leaves bounds mid-press (with hitSlop:
  negative shrinks the region, positive expands).

## Decisions

1. **`interactionMode` (`none|passive|active|controlled`)** is the entire interaction
   contract, default `none`; the shared `expo-view` base owns the single attach point.
2. **One cooperative press recognizer per platform**, attached only in
   `passive`/`active`; it participates in arbitration, never arbitrates.
3. **Native owns touch and feeds uniforms**; two sources, one buffer; no per-pointer
   bridge traffic. Events are semantic-only, `active`-only.
4. **Cancellation = spring-back, no `onPress`** — yielding is the default arbitration
   outcome, rendered natively.
5. **No RNGH dependency in V1** — coexistence is free from the plain-view substrate.
   Deep RNGH composition (`simultaneousWithExternalGesture`) and drag/tilt are later.
6. **Boundary: the surface is ONE interactive unit** — arbitrary RN children inside
   are not individually touchable; layered composition keeps RN children interactive.
   Nested fx surfaces obey the same rule: a shader-bearing surface nested inside
   another is occluded and touch-shadowed by the outer (the outer composites its
   shader above its content container and its recognizer claims the touch), so the
   outer is the single interactive unit — shader-in-shader is not a V1 composition
   pattern; use layered composition (device-confirmed, U8-002, API 33).
7. **`interactionMode` is `none | passive | active | controlled`.** The V1 *public* set was
   `none | passive | active` (DEF-015); `controlled` **ships in V2 (DEF-020, device-verified
   2026-06-15, both platforms)** as the view-ref discrete write path — `setUniform`/`setHighlight`
   as Expo `AsyncFunction`s on the surface ref, **no `SharedObject` needed** (the true `Fx*`
   SharedObject / detached handle is DEF-021). Discrete writes only: an imperative write wins over
   the prop value (the clobber rule) and is cleared when the mode leaves `controlled`; continuous
   gesture-sourced motion stays the UI-thread channel (DEF-006); **never** per-frame `setUniform`
   from the JS thread. The known write set is the scalar pair `intensity`/`pressDepth`
   (`setHighlight` writes `touch`/`pressDepth`), symmetric across both platforms — a feature grows
   it by adding its scalars to both. The prop name and the `none`/`passive`/`active` vocabulary stay
   frozen (DEF-015): agnostic (no rule-#2 leak) and free of the collisions the intent-word
   substitutes carry (`pressable` is `FxPressable`; `reactive` reads as Reanimated).

## Open questions

- **Drag/tilt (G3)** — axis-aware claiming for a shader that wants a drag axis inside
  a sheet; deferred, resolved via `controlled` + RNGH relations.

## Resolved

- **The cancel path + the full coexistence matrix (RT-001 — U8-002, device 2026-06-13).**
  The cooperative recognizer is cancelled the instant an ancestor claims — device-proven
  across both platforms over every distinct mechanism: native scroll (iOS + Android),
  pager (iOS), and the **`@gorhom/bottom-sheet` RNGH-pan hard case (Android)** — each
  yielding `onPressIn`/`onPressOut` with **no** `onPress`, the ancestor visibly moving,
  spring-back rendered natively; a still tap fires one `onPress`; `passive`/`controlled`
  stay semantically silent. Documented waivers (per-platform-redundant, the same
  recognizer mechanism already proven on the other platform, not re-run): Android pager
  and raw RNGH-`Pan`, and the iOS hard-case rows; the iOS visual rows are simulator-
  limited (the curated stitchable shaders render only on a physical iPhone). The Android
  interactive-uniform probe crash surfaced en route was fixed and device-proven
  separately (U8-003, API-33 AVD, repro-validated).

## Sources

- `_legacy/05-gestures-and-interaction.md` — the full interaction findings (recognizer
  construction, delegate simultaneity, the coexistence test matrix, the swallow analysis).
- `structure.{ios,android}.md` — `UILongPressGestureRecognizer` / `onTouchEvent` mechanics.
- `01-substrates-and-hosting.md` — why interaction requires `expo-view`.
