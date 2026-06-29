# DOC-034 — notes

## Unverified claims

- None requiring device proof (docs-only ratification, no code, no device gate).
- The iOS `PhaseAnimator` / `KeyframeAnimator` / `UnitCurve` detailed signatures remain
  unextracted by design (guardrail) — canon marks them additive future rungs, page-existence only.
- The Material `MotionScheme` per-spec stiffness/damping numbers were not extractable from the
  docs and were deliberately NOT promoted (maintainer call 3).

## What changed and why

- `wip/native-animation-api-extraction.md` — flipped the four pending Android evidence rows to
  `source-backed` with real citations (developer.android.com reference + AOSP `androidx-main`
  source + `material-foundation`/`material-components-android`); added §Android API extraction
  capturing concrete signatures, verbatim `SpringForce`/Compose spring constants, the Material
  easing/duration tokens, and the cross-platform spring-axis finding. Added a Promoted (DOC-034)
  banner and changed Status to historical/derivation-history.
  Source-backing came from four parallel research agents (one per framework); the
  developer.android.com reference pages are JS-rendered, so AOSP source was the primary authority
  for verbatim numbers.
- `3-motion/41` — new Findings subsection (§The grammar sequence and the hybrid timing principle)
  + Decision 15 (the sequence, `state`/`phase`/`keyframes` classification, the hybrid principle,
  the guardrail wording).
- `0-spine/02` — Decision 17 (the driver sequence + the `JS → descriptor → resolver → native
  primitive → frames → event` lowering chain + native primitives private to lowering, per d2).
- `4-runtime/34` — new Findings subsection (§The spring-axis divergence) — source-backed reason
  springs are authored per platform.
- `5-realization/structure.ios.md §motion` + `structure.android.md §motion` — mapped the
  effect-target rungs to the sequence; marked `clock.phase`/`clock.keyframes` additive future
  rungs, not frozen API (iOS signatures still pending).
- `wip/README.md` — removed the native-animation entry from §Current, added it to
  §Retired/historical, and marked its §Resolution-plan row Done (DOC-034); repointed the
  interactive-content-distort §Current bullet's "composes through the chaining API" cross-ref
  from the historical WIP to `3-motion/41` decision 15 (maintainer review nit).
- Feeder sweep (DOC-030-style) — repointed the two active WIP files that cited the now-historical
  native-animation WIP as a live authority to canon `3-motion/41` decision 15, flagging the WIP as
  historical: `wip/anchored-reveal-and-library-shape.md` (Feeds + §Platform timing model) and
  `wip/interactive-content-distort.md` (Feeds + the `source`-driver bullet + the step-5 home +
  §Sources). No live "cite the WIP as authority" pointer remains; the handoff snapshot and
  task-layer refs are left as the correct audit trail.
- `7-implementation/progress.md` — registered DOC-034 (state `ready-to-merge`).

## Scope held

Principle-only: no `FxTransition`/`FxIosTransition`/`FxAndroidTransition` field names frozen; no
DEF/implementation row spawned; no unsourced `MotionScheme` numbers; DEF-016/publishing untouched.

## Next

Maintainer reviews the canon edits and ticks `merged` (then the finishing commit on
integration/0.1.x). No further planner action until the maintainer names the next WIP promotion or
a concrete product need.
