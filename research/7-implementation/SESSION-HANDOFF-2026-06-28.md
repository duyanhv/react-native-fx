# Session handoff — 2026-06-28 (HOLDING PATTERN: V1 surface complete, V2 at a coherent resting state, publishing parked. U10-002 `fx.effect.symbol` MERGED — the last unbuilt surface unit. No feature work queued; do not start anything trigger-gated unprompted. Supersedes SESSION-HANDOFF-2026-06-22.md.)

This is a deliberate stopping point, not a mid-task handoff. The repo has a coherent baseline:
shipped engine, shipped surface, explicit cross-platform peer gaps, and no hidden "publish next"
pressure. There is nothing to pick up — the next session starts work only when the maintainer
names a concrete product need.

## State of the world

- **V1 surface contract complete + merged** on `integration/0.1.x`. All eight `52 §Public exports`
  symbols (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`) + `fx.effect.*`
  ship and are device-verified. U10-002 (`fx.effect.symbol`, builder-only) was the last surface
  unit — merged `dc1a021` (iOS 18.5 parity gate PASS).
- **V2 engine (Units 4–9) + addenda (DEF-014/020/011/008/009)** all merged + device-ratified.
- **The current product map is [`v2-capability-baseline.md`](./v2-capability-baseline.md)** —
  shipped matrix, iOS-only/Android-only peer gaps, trigger-gated work, ratified rejections
  (committed `78f6238` / DOC-031). Treat it as the source of truth for "what ships today."

## Holding-pattern entry — for the next session

1. **Start from [`HOW-TO-CONTINUE.md`](./HOW-TO-CONTINUE.md).** Its "Where the project is" is current.
2. **Treat [`v2-capability-baseline.md`](./v2-capability-baseline.md) as the current product map.**
3. **Do NOT run DEF-016** (the `react-native-fxkit` rename / docs-install alignment / npm packaging
   / `skills/` polish). Publishing stays parked until the maintainer explicitly reintroduces it.
4. **Do NOT start Android `symbol` / `source`** (or any trigger-gated DEF row) unless a concrete
   app need triggers one. The standing rule holds: no trigger-gated work unprompted.

## When the maintainer DOES pick the next capability

- **Force a recommendation-pass before spec** — especially for Android `symbol` / `source`. Both
  involve real public-API-shape choices (the Android symbol asset contract / Lottie-vs-AVD
  vocabulary; the Android/ambient `source` rung's surface + degradation story), not just filling in
  a backend. Drive with prose + a recommendation + pushback (NOT AskUserQuestion), get the call,
  then spec. See `v2-capability-baseline.md §How to extend`.
- Role unchanged: planner / reviewer / investigator / housekeeper. Specs + paste-ready prompts +
  independent gate re-runs + bookkeeping; subagents/human execute; device gates + the
  `device-verified`/`merged` ticks are the maintainer's (tick only when delegated). Commits
  human-directed, on `integration/0.1.x`, Conventional Commits, no AI co-author trailer.
