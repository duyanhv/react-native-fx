# DOC-034 — Native animation grammar promotion

Type: ratify + doc-cleanup (wip → canon). Docs-only. No code, no device gate, no DEF row.
Authorized: maintainer, this session (2026-06-29), with one guardrail (below).

## Goal

Take `research/wip/native-animation-api-extraction.md` back into canon as the first WIP
promotion in the DOC-033 resolution-plan order. Two parts:

1. **Source-back** the four pending Android rows of the WIP evidence table
   (`android.animation`, `androidx.dynamicanimation`, Jetpack Compose animation, Material
   motion) to the same bar the iOS rows already met — real citations + concrete extracted API.
2. **Promote the principle only** of the hybrid animation grammar into the owning canonical
   docs. Not a public API, not an implementation plan.

## Authority sources

- `research/wip/native-animation-api-extraction.md` — the derivation (provisional answer: hybrid).
- `research/wip/README.md §Resolution plan` — the promote-first instruction (DOC-033).
- Owning canon: `3-motion/41` (motion vocabulary + driver layer), `0-spine/02` (capability IR +
  lowering), `4-runtime/34` (animation driver), `5-realization/structure.{ios,android}.md §motion`.
- Existing canon this builds on: `41` decisions 10–12 (driver layer, per-platform springs),
  `02` decisions 2 + 14 (no `swiftui*`/`compose*` above the manifest; the `target`/`clock`/`source`
  IR generalization).

## Scope (what gets promoted)

- The canonical rollout **sequence**: `target → state → clock.phase → clock.keyframes → source`.
- **`state`** classified as target semantics on the existing `target` driver — not a new node
  (SwiftUI `.animation(value:)` / Compose `updateTransition`).
- **`clock.phase` then `clock.keyframes`** as two `clock`-driver rungs in that order.
- The **hybrid-timing principle**: a combined default intent the resolver lowers per platform +
  optional per-platform expert blocks that refine timing only (not shape); omit a side → platform
  default; resolver rejects unsupported combinations rather than approximating.
- The source-backed **spring-axis divergence** as the reason timing is authored per platform
  (Android `dampingRatio + stiffness` across `dynamicanimation` *and* Compose vs iOS
  `duration + bounce`).

## Maintainer calls honored

1. **API concreteness — principle only.** Do not freeze `FxTransition` / `FxIosTransition` /
   `FxAndroidTransition` field names. Keep the type sketches in the WIP as derivation history.
2. **No DEF row.** No concrete consumer exists; the first real screen (anchored reveal / water
   ripple / FxFlow) spawns the exact rung it needs.
3. **No unsourced numbers.** Canon may cite the verified `SpringForce` / Compose constants and the
   spring-axis divergence; do not promote the internal `MotionScheme` per-spec stiffness/damping
   numbers (not extractable from the docs).

## Guardrail

For `clock.phase` and `clock.keyframes`, canon ratifies **ordering and driver classification
only**, not detailed public shape or per-platform signature. The Android side is now source-backed;
the iOS `PhaseAnimator` / `KeyframeAnimator` / `UnitCurve` API extraction is still pending beyond
page existence. Canon must read "these are additive future driver rungs with known native
counterparts," never "this is the frozen API."

## Out of scope

- Any code, type, or example change.
- DEF-016 / publishing (parked).
- Any other trigger-gated DEF row or WIP promotion.
- Freezing the public `transition` / `state` / `phase` / `keyframes` surface.

## Proof / done bar

Docs-only ratification. Done when: the four WIP evidence rows read `source-backed` with real
citations; the sequence + hybrid principle + spring-axis divergence are in the four owning canon
docs as additive decisions/sections; the guardrail wording is present; the WIP carries a promotion
banner and is retained as derivation history; `wip/README.md` + `progress.md` reflect the
promotion. Closes no ledger row. Maintainer reviews and ticks `merged`.
