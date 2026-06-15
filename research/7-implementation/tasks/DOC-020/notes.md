# DOC-020 — notes

## Decision
Pin the native↔public event-name mapping as **one canonical table** in `40` §native → JS.
Convention: native `Events` are **prefixed** to dodge RN's reserved event props — **press**
events `onShader*` (on `FxSurfaceView`), **lifecycle/load** events `onFx*` (every view); the
thin `src/surface/` components own the remap to the public unprefixed contract. No rename of
shipped native events (that is a code change, out of scope for a doc ratify).

## Grounding (names from shipped code, not memory)
- `packages/ios/FxModule.swift:13,38,60` + `FxSurfaceView.swift:26-32`; Kotlin twins
  `FxModule.kt:20,42,64` + `FxSurfaceView.kt:33-39`. Registered events: `onShaderPress`,
  `onShaderPressIn`, `onShaderPressOut`, `onFxTransitionEnd`, `onFxLoad`, `onFxError`.
- `onFx*` also on `FxHostedView` / `FxGroupView` (every view).
- `onStateChange` (`40`/`50`) and `onLongPress` (`30`) are contract-declared but **native-unwired**
  — marked as such in the table with their future prefixed names (`onFxStateChange` /
  `onShaderLongPress`).

## Changed
- `3-motion/40` — new `### Native ↔ public event-name mapping (the one canonical table)` under
  §native → JS: the 8-row table (6 wired + 2 unwired) + the convention + the "consumers point
  here, never restate" rule.
- `architecture.md` (`:228`) — replaced the vague "may be prefixed, for example `onFxLoad`"
  note with the concrete `onShader*`/`onFx*` convention + a pointer to `40`'s canonical table.
- `1-surface/50` (`:56`) — the public event list now notes the native prefixed names + points
  at `40`'s table.

## Watch-item (not actioned — surface freeze / DEF-015)
The two native prefixes are inconsistent (`onShaderPress` vs `onFxTransitionEnd`). Pinned as-is
(both shipped); the convention is documented. Whether to unify under a single `onFx*` prefix is
a code rename for the surface-component work / DEF-015's naming pass, not this doc ratify.

## Lifecycle
- spec'd → rules-gated (docs-only; pins a boundary convention, no rule touched) → mapping pinned
  + consumers pointed. State: `ready-to-merge`. `reviewed`/`merged` are the maintainer's.

## Proof
- headless: N/A — docs-only.
- device:   N/A.
- docs:     `40` (canonical table), `architecture.md`, `50`. No `Closes:` row.

## Unverified claims
- None — the table is transcribed from the shipped `Events(...)` registrations cited above.
  The unwired rows are marked unwired (not claimed to fire).

Next: maintainer review of all five doc tasks (DOC-016..020). The U2-003 carry-in (actually
*wiring* `onFxLoad`/`onFxError` to dispatch) remains its own code task — DOC-020 only pins names.
