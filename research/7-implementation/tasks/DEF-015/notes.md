# DEF-015 — notes

## Changed (2026-06-13)

- Specced the task (`README.md`) — four sub-decisions framed (the `<Fx effect={fx.effect.*}>`
  stutter, `interactionMode` vocabulary, `hosted`/`expo-view` leakage, the package name).
- Drove the decision as a prose dialogue; the maintainer ratified all four (see README §Decision).
- Recorded the decisions in the owning research docs:
  - `1-surface/50-api-and-presets.md` — Decision 8 (the umbrella surface-freeze record: all four calls).
  - `1-surface/55-composition-chain.md` — Decision 7 (`fx.effect.*` accepted; no bare `effect` export in V1).
  - `4-runtime/30-interaction-and-gestures.md` — Decision 7 (V1 public `none|passive|active`;
    `controlled` deferred to DEF-020) + a `(defined, deferred — DEF-020)` marker on the `controlled`
    contract-table row.
  - `0-spine/01-substrates-and-hosting.md` — guard after §The two substrates (substrate names internal-only).
  - `0-spine/02-capability-ir-and-lowering.md` — guard after §Canonical IR node vocabulary (same rule as `swiftui*`/`compose*`).
  - `6-ship/52-standards-and-publishing.md` — Decision 10 reconciled. **Found by the test-plan
    sweep:** #10 read "Do not scope-split into `@react-native-fx/*` packages yet," which
    contradicted the `@react-native-fx/core` name. Resolved by clarifying #10 is about *multiple*
    packages (core/compiler/lab); the single core package publishing under the scope is a name,
    not a split, and reserves the namespace. Decision-level, so closed here (not DEF-016).
- Tracker (`progress.md`):
  - DEF-015 → `ready-to-merge` (docs-closed; merge tick is the maintainer's).
  - DEF-016 row made concrete — name `@react-native-fx/core`, the scope-claim gate, the
    stop-and-reopen condition (no silent `react-native-fxkit` fallback).
  - Housekeeping (maintainer-confirmed): U8-002 → `merged` (`9a874ea`), U8-003 → `merged` (`f9af1bc`).

## Verification

- Docs-only ratification; no headless/device gate.
- Cross-checked `9a874ea` (U8-002 finishing — harness + RT-001 close) and `f9af1bc` (U8-003
  finishing — the probe fix) are on `integration/0.1.x` before flipping the two `merged` cells.

Next: maintainer ticks DEF-015 `merged` (a docs-only commit), then DEF-016 runs once the npm
`@react-native-fx` scope is claimed.
