# Session handoff — 2026-06-28 (HOLDING PATTERN, refreshed: DEF-026 Android `source`/scroll MERGED + the Lane 1 architecture promoted to canon (DOC-032) + the WIP resolution plan recorded (DOC-033). **No open cross-platform peer gap remains.** No feature is queued; the next session either promotes the next `wip/` exploration in order or waits for a product trigger. Publishing still parked. Supersedes the prior DEF-025 holding-pattern note.)

This is a deliberate stopping point, not a mid-task handoff. The repo has a coherent baseline:
shipped engine, shipped surface, both V2 cross-platform peer gaps closed, the Lane 1 future
architecture promoted into canon (but unbuilt), and the WIP queue ordered. There is nothing
trigger-gated to pick up unprompted — the next session starts feature work only when the maintainer
names a concrete product need, and starts a `wip/` promotion only when the maintainer picks one.

## State of the world

- **V1 surface contract complete + merged** on `integration/0.1.x` — all eight public exports
  (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`) + `fx.effect.*`, device-verified.
- **V2 engine (Units 4–9) + addenda (DEF-014/020/011/008/009)** merged + device-ratified.
- **DEF-025 (Android `symbol`) MERGED 2026-06-28** — app-supplied Lottie via `registerSymbol`,
  `feature:'lottie'`-gated; AVD deferred. Closed the `symbol` peer gap. `reviews/DEF-025.md`.
- **DEF-026 (Android `source`/scroll) MERGED 2026-06-28** (commit `6198904`) — a native `FxScrollView`
  (plain `View`, core `ScrollView`/`HorizontalScrollView` subclass) maps `onScrollChanged` offset →
  per-tile `opacity`/`scale` on the UI thread, zero per-frame JS, over fx-owned tiles. Best-effort tier,
  lower fidelity than iOS render-server `.scrollTransition` by design. Device-verified Android API 35
  (both axes, 60fps/0-dropped, off-window resume; sub-API-33 + iOS-regression rows waived NOT-RUN).
  Closes the fx-owned `source` peer gap; ledger **FX-011**. `reviews/DEF-026.md`.
- **Both V2 cross-platform peer gaps are now CLOSED.** The only single-platform rows left
  (`content-distort` Android-only, `shape-morph` Android-only) are platform-native-by-design, not gaps.
  The lone remaining deferred tier on a shipped capability is `source` **ambient-RN-scroll** (a reader
  over the app's *own* RN scroll) — its own cross-platform capability, deferred on iOS too.
- **Lane 1 architecture PROMOTED to canon (DOC-032).** Source-driven continuous interactions are now
  canonical (but unbuilt): `04 §The Lane 1 boundary invariant`, `05 §Lane 1 native signal grammar`,
  `40 §Source-driven interaction events`, `50 §Lane 1 interaction surface direction`,
  `architecture.md §12`. Preset-first; the lowered `source → mapping → settle → target` descriptor is
  IR, not a public graph. The `wip/lane1-*.md` files are retained as derivation history with banners.
- **WIP resolution plan RECORDED (DOC-033).** `wip/README.md §Resolution plan` owns the per-file order.
- **The current product map is [`v2-capability-baseline.md`](./v2-capability-baseline.md)** — shipped
  matrix, peer-gap status (both closed), trigger-gated list, ratified rejections. Source of truth for
  "what ships today." (`source` row now reads "both".)

## Holding-pattern entry — for the next session

1. **Start from [`HOW-TO-CONTINUE.md`](./HOW-TO-CONTINUE.md)**; treat
   [`v2-capability-baseline.md`](./v2-capability-baseline.md) as the product map and
   [`research/wip/README.md`](../wip/README.md) `§Resolution plan` as the WIP queue.
2. **Do NOT run DEF-016** (the `react-native-fxkit` rename / docs-install alignment / npm packaging /
   `skills/` polish). Publishing stays parked until the maintainer explicitly reintroduces it.
3. **Do NOT start any trigger-gated DEF row or `wip/` promotion unprompted.** The standing rule holds:
   no trigger-gated work without a concrete product need; no `wip/` promotion until the maintainer
   picks one off the resolution-plan order.

## The WIP queue (DOC-033 order — when the maintainer picks one)

1. **`native-animation-api-extraction.md`** — promote *first*, after the pending Android/Compose/
   Material extraction is source-backed. The cross-cutting animation grammar later feature specs
   depend on. Docs-only ratification (DOC-032-shaped), spawns DEF rows only when a consumer exists.
2. **`anchored-reveal-and-library-shape.md`** — recommendation-pass → feature spec, only when a real
   anchored-reveal screen appears. Stays Boundary A unless outside siblings must reflow.
3. **`interactive-content-distort.md`** (water-ripple) — parked; trigger-gated DEF only when a real
   water-ripple consumer exists. Android parametric ripple over live RN content; simulation is Lane 2.
4. **`native-slot-layout-transitions.md`** — parked; split reserved-size `FxFlow` (first) from
   measured-content Boundary L (later). Do not start with arbitrary layout animation.

## When the maintainer DOES pick the next capability

- **Force a recommendation-pass before spec** for anything with a real public-API or platform fork.
  Drive with prose + a recommendation + pushback (NOT AskUserQuestion), get the call, then spec.
  DEF-025 and DEF-026 are the worked templates: recommendation-pass → spec (`tasks/<id>/README.md`) →
  paste-ready executor prompt → executor to headless-done → planner review (re-run gates independently)
  → maintainer device gate → docs-closed → merge.
- **Reuse the shipped Android patterns** for any Android-realization work: plain `View` (no Compose,
  DOC-017); compose-don't-subclass for an **optional-peer** view (Fabric preallocates before the JS
  selector — DEF-025's Lottie `FrameLayout` host), but a **core** view is safe to subclass (DEF-026's
  `ScrollView`); `registerShader`/`registerSymbol` for app-supplied assets (payload crosses once,
  keyed by name); the `Class.forName` → `Constant("features")` → `ctx.features` peer-detection path;
  the two-phase prop stash → `applyResolvedConfig()`; off-window pause via each view's own
  attach/focus, no competing `Choreographer` loop. The repo test gate is `bun run test` (Jest), not
  `bun test`. A new iOS Swift file needs `pod install` before iOS truly builds.
- Role unchanged: planner / reviewer / investigator / housekeeper. Specs + paste-ready prompts +
  independent gate re-runs + bookkeeping; subagents/human execute; device gates + the
  `device-verified`/`merged` ticks are the maintainer's (tick only when delegated). Commits
  human-directed, on `integration/0.1.x`, Conventional Commits, no AI co-author trailer.
</content>
