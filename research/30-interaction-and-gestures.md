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

## The `interactionMode` contract

The whole interaction surface is one prop, default `none`. Read it as a 2×2: who
attaches a recognizer, and who claims/emits semantics.

| Mode | Attaches | Does | Claims? |
|---|---|---|---|
| **`none`** | nothing | touches pass straight through | never |
| **`passive`** | cooperative recognizer | observes the pointer → feeds a pointer uniform (`glowX`/`glowY`); no `onPress*` | never |
| **`active`** | the same recognizer, owning the press | full press lifecycle → `pressDepth`/`glowX`/`glowY` + `onPressIn/Out/Press/LongPress`; yields to scrollers on movement | press only |
| **`controlled`** | nothing (zero arbitration) | the developer's own RNGH/Reanimated pipeline drives the uniforms via `setUniform`/`setHighlight` | never |

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
   used by `controlled`.

Per-pointer movement is written natively and **never crosses the bridge**. Only
**semantic** events reach JS — `onPress`/`onPressIn`/`onPressOut`/`onLongPress`,
low-frequency, `active` only.

## Cancellation = spring-back, no `onPress`

The single most important runtime behavior: when an ancestor scroller claims the
gesture, the effect springs back and emits **no** `onPress`. iOS cancel = `.cancelled`;
Android cancel = `ACTION_CANCEL`. Spring-back is a native render concern; it never
round-trips through JS.

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

## Open questions

- **Device validation of the cancel path** — `.cancelled`/`ACTION_CANCEL` fires the
  instant a scroller/pager/`@gorhom` sheet claims; run the full coexistence matrix.
- **`@gorhom/bottom-sheet` (RNGH)** vs native sheets — confirm our recognizer is
  cancelled cleanly by an RNGH pan (the hard case; `01`).
- **Drag/tilt (G3)** — axis-aware claiming for a shader that wants a drag axis inside
  a sheet; deferred, resolved via `controlled` + RNGH relations.

## Sources

- `_legacy/05-gestures-and-interaction.md` — the full interaction findings (recognizer
  construction, delegate simultaneity, the coexistence test matrix, the swallow analysis).
- `structure.{ios,android}.md` — `UILongPressGestureRecognizer` / `onTouchEvent` mechanics.
- `01-substrates-and-hosting.md` — why interaction requires `expo-view`.
