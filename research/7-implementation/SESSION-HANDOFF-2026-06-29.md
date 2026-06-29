# Session handoff — 2026-06-29 (HOLDING PATTERN. One feature shipped this session: **DEF-027 FxReveal anchored-reveal geometric spine (step 1) MERGED**, device-verified both platforms, closing SURF-011. Also: **DOC-034** promoted the native-animation hybrid grammar to canon, **DOC-035** swept stale shipped-code/WIP comments. The placement-host contract is now canon. No feature is queued; the next session promotes the next `wip/` exploration in order, or starts a trigger-gated row, only when the maintainer names one. Publishing still parked. Supersedes the 2026-06-28 holding-pattern note.)

This is a deliberate stopping point. The repo has a coherent baseline: shipped engine, shipped
surface, both V2 cross-platform peer gaps closed, the Lane 1 + native-animation architecture
promoted into canon, and now the **first geometry-orchestration component (`FxReveal`) shipped** —
the interactive anchored-reveal spine on both platforms. Nothing is trigger-gated to pick up
unprompted; the next session starts feature work only on a named product need or a maintainer-picked
`wip/` promotion.

## What this session did

- **DOC-034 — native animation grammar promoted to canon (MERGED `99ba663`).** Source-backed the
  four pending Android rows of `wip/native-animation-api-extraction.md` (`android.animation`,
  `androidx.dynamicanimation`, Jetpack Compose, Material motion), then promoted the hybrid grammar
  *principle-only*: `41` decision 15 (the `target → state → clock.phase → clock.keyframes → source`
  sequence + hybrid timing), `02` decision 17 (lowering chain + native primitives private to
  lowering), `34 §The spring-axis divergence`, `structure.{ios,android}.md §motion`. No public API
  frozen, no DEF row. The WIP is now historical (derivation history). `reviews` n/a (ratify row).
- **DOC-035 — stale shipped-code + WIP comment sweep (MERGED `99ba663`).** Deleted the dead
  `packages/src/surface/types.ts` placeholder; de-staled the symbol manifest comment and the
  `source/types.ts` docblock; repointed the `wip/README.md` interactive-content-distort cross-ref.
- **DEF-027 — `FxReveal` anchored-reveal geometric spine, step 1 (MERGED `f5c3662`; tick `511b4c4`).**
  Closes **SURF-011**. Device-verified iOS 26.5 + Android API 35. A new geometry-orchestration
  surface that morphs a collapsed slot into a preset-owned bottom-half panel (inverse-transform,
  sharp content, cross-fade, interruption, per-phase completion). **Preset-first** —
  `preset="anchoredMorph"` owns the target; **no `anchor`/`from` prop, no public `placement` prop**.
  **Boundary A by construction** (own collapsed-slot frame, a self-read; no foreign rect; no Yoga
  write). Shipped through five build/review/device rounds — the load-bearing pivot was the
  **placement-host ratification** (below). `reviews/DEF-027.md`.

## New canon this session (cite these, not the WIP)

- **Animation grammar** — `3-motion/41` decision 15 (sequence + hybrid timing) + decision 16
  (the `target` driver's non-uniform `scaleX`/`scaleY` + `origin` IR channels, added for the reveal —
  **IR-only**, public `MotionSpec` keeps uniform `scale`); `0-spine/02` decision 17 (lowering chain +
  private native names); `4-runtime/34 §The spring-axis divergence`.
- **Reveal-host contract (DEF-003-compatible)** — `1-surface/54 §Placement & portal coexistence`:
  **the app owns the bounds-containing placement host (root overlay / its own portal / RN `Modal`);
  fx owns the reveal animation inside it.** fx creates no overlay window of its own. `1-surface/50
  §Props by default` notes the anchored-reveal surface direction. The Android lesson is pinned: RN's
  `TouchTargetHelper` does not descend into a parent for out-of-bounds points, so a reveal whose
  panel overflows a collapsed-sized parent is not touch-reachable — the host must contain the target.
- **Reveal mechanics** — `5-realization/structure.{ios,android}.md § reveal` is the one home (the
  fill-host + collapsed-slot-frame model, the inverse transform, the Android `BOX_NONE` touch
  contract + phase-gated expanded interactivity, the initial-`open` deferral, Boundary A, degradation).
- **Boundary** — `0-spine/04 §The cross-tree frontier`: FxReveal is the worked Boundary-A case;
  a *foreign-anchor* `FxAnchor` is the cross-tree frontier, deferred to its own `05` decision.

## Holding-pattern entry — for the next session

1. **Start from [`HOW-TO-CONTINUE.md`](./HOW-TO-CONTINUE.md)**; treat
   [`v2-capability-baseline.md`](./v2-capability-baseline.md) as the product map and
   [`research/wip/README.md`](../wip/README.md) `§Resolution plan` as the WIP queue.
2. **Do NOT run DEF-016** (publishing / the `react-native-fxkit` rename) — parked until the maintainer
   explicitly reintroduces it.
3. **Do NOT start any trigger-gated DEF row or `wip/` promotion unprompted.** No trigger-gated work
   without a concrete product need; no `wip/` promotion until the maintainer picks one.

## The queue (when the maintainer picks one)

- **`FxReveal` step 2 — chrome** (radius morph + clip, then border/background): a **future DEF row**,
  spec'd only when the reveal's chrome is actually needed. The spine (step 1) is shipped.
- **`FxAnchor`** (foreign-anchor / shared-element): the cross-tree frontier — its own `0-spine/05`
  decision, when a real arbitrary-anchor product screen appears.
- **`wip/` resolution plan** (`wip/README.md`): `native-animation-api-extraction.md` is **done**
  (DOC-034, historical); `anchored-reveal-and-library-shape.md` is **partly promoted** (DEF-027 step 1
  shipped; chrome / `FxAnchor` / `FxFlow` / Boundary L remain its derivation-history scope);
  `interactive-content-distort.md` (water-ripple) and `native-slot-layout-transitions.md` (`FxFlow`)
  stay parked until a product trigger.

## When the maintainer DOES pick the next capability

- **Force a recommendation-pass before spec** for anything with a real public-API or platform fork.
  Drive with prose + a recommendation + pushback (NOT AskUserQuestion), get the call, then spec.
  DEF-027 is the worked template, including a mid-build architecture pivot: a device gate can expose a
  contract problem (here: Android overflow touch) whose right fix is a **ratification** (the
  placement-host decision), not a blind code rework — pause, ratify into canon, then rework + re-gate.
- **Reuse the shipped patterns:** the app-placed reveal-host contract (`54`) for any geometry feature;
  the Android `ReactPointerEventsView` `BOX_NONE` touch contract + the U8-001 `TouchTargetHelper`
  rule for any hosted-content touch; the `motion` driver's non-uniform `scaleX`/`scaleY` + `origin`
  channels (`41` d16) for non-uniform transforms; plain `View` on Android (DOC-017); device gate via
  agent-device (POCO F1 / API 35 + iPhone 17 Pro sim / iOS 26.5). Test gate is `bun run test` (Jest),
  not `bun test`; a new iOS Swift file needs `pod install`; lint is the pinned biome via `bun run
  lint`. Slow-animations (iOS Simulator Cmd+T) catches interrupt ordering; Android springs ignore
  animator-duration-scale (U7-003).
- Role unchanged: planner / reviewer / investigator / housekeeper. Specs + paste-ready prompts +
  independent gate re-runs + bookkeeping; subagents/human execute; device gates + the
  `device-verified`/`merged` ticks are the maintainer's (tick only when delegated). Commits
  human-directed, on `integration/0.1.x`, Conventional Commits, no AI co-author trailer.
