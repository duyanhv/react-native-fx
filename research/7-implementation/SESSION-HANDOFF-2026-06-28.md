# Session handoff — 2026-06-28 (HOLDING PATTERN, refreshed: DEF-025 Android `symbol` MERGED — the `symbol` cross-platform peer gap is closed. Back to a coherent resting state, publishing still parked. No feature work queued; do not start anything trigger-gated unprompted. Supersedes the prior 2026-06-28 holding-pattern note and SESSION-HANDOFF-2026-06-22.md.)

This is a deliberate stopping point, not a mid-task handoff. The repo has a coherent baseline:
shipped engine, shipped surface, one remaining cross-platform peer gap (`source`/Android scroll),
and no hidden "publish next" pressure. There is nothing to pick up — the next session starts work
only when the maintainer names a concrete product need.

## State of the world

- **V1 surface contract complete + merged** on `integration/0.1.x`. All eight `52 §Public exports`
  symbols (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`) + `fx.effect.*`
  ship and are device-verified.
- **V2 engine (Units 4–9) + addenda (DEF-014/020/011/008/009)** all merged + device-ratified.
- **DEF-025 (Android `symbol`) MERGED 2026-06-28.** The `symbol` peer gap is closed: Android ships
  an app-supplied **Lottie** animation registered by name via `registerSymbol`, gated by the
  optional `feature:'lottie'` peer; AVD (`via:'native'`) deferred. Device-verified both platforms.
  Notable: DEF-025 made the manifest's `requires.feature` / `ctx.features` mechanism real for the
  first time (SPINE-005 feature-flag half) — reusable by `shape-morph`'s `m3-expressive` later.
  Closes ledger **FX-010**; supersedes FX-009's iOS-only stance. See `reviews/DEF-025.md`.
- **The current product map is [`v2-capability-baseline.md`](./v2-capability-baseline.md)** —
  shipped matrix, remaining peer gap, trigger-gated work, ratified rejections. Treat it as the
  source of truth for "what ships today." (`symbol` row now reads "both".)

## Holding-pattern entry — for the next session

1. **Start from [`HOW-TO-CONTINUE.md`](./HOW-TO-CONTINUE.md)** and treat
   [`v2-capability-baseline.md`](./v2-capability-baseline.md) as the current product map.
2. **Do NOT run DEF-016** (the `react-native-fxkit` rename / docs-install alignment / npm packaging
   / `skills/` polish). Publishing stays parked until the maintainer explicitly reintroduces it.
3. **Do NOT start Android `source`/scroll** (or any trigger-gated DEF row) unless a concrete app
   need triggers one. The standing rule holds: no trigger-gated work unprompted.

## Remaining cross-platform peer gap (the next candidate, when triggered)

- **`source`/scroll — iOS-only, hosted rung only.** Android scroll-linked presentation + the
  ambient-RN-scroll best-effort tier are deferred (DEF-014 scope; manifest Android ladder empty).
  Bigger and riskier than `symbol` was: it needs a real Android surface decision (Compose/View
  scroll mechanics) and the ambient-RN-scroll tier question — a genuine public-API-shape fork, not
  a backend fill.

## When the maintainer DOES pick the next capability

- **Force a recommendation-pass before spec** — especially for Android `source`. Drive with prose +
  a recommendation + pushback (NOT AskUserQuestion), get the call, then spec. See
  `v2-capability-baseline.md §How to extend`. DEF-025 is the worked template: recommendation-pass →
  spec (`tasks/<id>/README.md`) → executor to headless-done → planner review (re-run gates
  independently; the wrong-test-runner + the optional-peer-view class-load crash were both
  review-caught) → maintainer device gate → docs-closed → merge.
- **Reuse the DEF-025 patterns** for any optional-peer or Android-realization work: `registerShader`
  /`registerSymbol` for app-supplied assets (payload crosses once, keyed by name; per-view only the
  id/name); the `Class.forName` → module `Constant("features")` → `ctx.features` peer-detection path;
  and — load-bearing — **compose, never subclass, an optional-peer native view** (Fabric preallocates
  before the JS selector, so the selector can't be the sole guard; a subclass crashes at class-load
  when the peer is absent). The repo test gate is `bun run test` (Jest), not `bun test`.
- Role unchanged: planner / reviewer / investigator / housekeeper. Specs + paste-ready prompts +
  independent gate re-runs + bookkeeping; subagents/human execute; device gates + the
  `device-verified`/`merged` ticks are the maintainer's (tick only when delegated). Commits
  human-directed, on `integration/0.1.x`, Conventional Commits, no AI co-author trailer.
