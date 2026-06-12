# U7-002 — notes

## Unverified claims (need device proof)

- **First-mount translate fix** — held-enter-until-layout is reasoned from the iOS/Android
  layout-vs-prop-batch ordering, not yet device-proven. The fix is order-independent by
  construction (it acts on whichever of `applyResolvedConfig` / first-layout runs second, gated
  on `hasResolvedContentSize`), but the visible "first enter slides, not just fades" outcome is
  a device row (catalog.md Part 3, both platforms).
- **The five React-semantics rows** (StrictMode, Fast Refresh mid-exit, Suspense/offscreen hide,
  re-render mid-exit, list eviction) are source-grounded (`35`) and now harness-runnable, but
  remain device-pending (catalog.md Part 2).
- **The `transient` catalog values** are still the provisional `data-layer §Presence presets`
  targets — the law-test/parity comparison against the real system banner / Material snackbar is
  the device deliverable (catalog.md Part 1). Any spring-param plumbing the comparison demands is
  a bounded follow-up, not done headless (the device pass reveals whether it is needed).
- Harness log-key fix is headless-reasoned; confirm no duplicate-key LogBox past 8 entries on
  device (catalog.md Part 4).

## 2026-06-12 — implemented to headless-done (agent)

Drove the agent-ownable scope to `headless-done`: the two bounded carried fixes + the device
runbook. State `todo` → `headless-done`. The catalog VALUES, the five rows, and parity are the
device gate (human); spring-param plumbing is a post-device follow-up if the law test demands it.

### Fix 1 — first-mount translate (coordinator/surface seam, both platforms)
- Root cause: the first prop batch can run before layout, so `contentHeight`/measured travel
  resolves 0 and a fresh enter only fades (no slide); later toggles slide correctly.
- `FxPresenceCoordinator.{swift,kt}` — added `enterAwaitingLayout`. A fresh `beginEnter` still
  seats the hidden start (opacity 0, so no flash), but if the surface has no measured size yet it
  **holds** the animation and returns; cleared on `beginExit`/`snapToPresent`. New
  `handleContentLayout()` re-seats the now-measured away vector and runs the enter once layout
  lands. Re-enter-mid-exit and `appear=false` paths unchanged.
- `FxSurfaceView.{swift,kt}` — added `hasResolvedContentSize` (observed frame height > 0 || live
  bounds/height > 0) and a layout hook: iOS `layoutSubviews()` override, Android the existing
  `onLayout` override, each calling `presenceCoordinator.handleContentLayout()`. Order-independent:
  whichever of the prop batch / first layout runs second triggers the enter.
- **No `FxAnimationDriver` internals touched** — the U6-001/U6-002 retarget mechanics are intact
  (the fix only changes when `animate`/`snap` are called, via the seam).

### Fix 2 — harness log key (example-only)
- `example/screens/presence.tsx` — log lines now key off a monotonic `nextLogId` ref instead of
  `id: lines.length` (which collided once the list caps at 8 → LogBox duplicate-key warning).

### Harness affordances for the device rows (example-only)
- Added an **offscreen=…** toggle (stage `display:none` while `visible` stays true) for the
  Suspense/offscreen-hide row, and an **eviction `FlatList`** of 12 `visible appear={false}`
  `transient` cells with its own events log (clean run = `eviction events: none`) for the
  list-eviction row. StrictMode / Fast Refresh / re-render-mid-exit run on existing controls.

### Evidence
- `evidence/catalog.md` (new) — the device runbook: Part 1 catalog fill + law-test procedure
  (compare against the real banner/snackbar) with the shipped-envelope starting point and a
  fill-on-device table; Part 2 the five rows (procedure + PASS/FAIL slots); Part 3 first-mount
  translate proof; Part 4 harness key; Part 5 parity. Tooling carryover from the U7-001 run.

### Gates (all green)
- `packages/`: tsc, build, lint (27 files), test (58 pass), `swift:lint`, `git diff --check`.
- `example/` tsc green. Android `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL. iOS
  example `xcodebuild` (iPhone 17 Pro sim, Debug) BUILD SUCCEEDED (edits to existing Swift files
  only — no `pod install` needed).

### Not done / not ticked
- Did not tick `device-verified`/`reviewed`/`docs-closed`/`merged`. Did not touch the ledger
  (MOT-001 closes on the planner's review after the maintainer ratifies; its sheet/modal rider
  stays deferred). Catalog value propagation to `data-layer`/`42`/`41`/`structure.*` is the
  planner's at docs-closed — `evidence/catalog.md` is the input.

Next: human runs `evidence/catalog.md` on iPhone + physical Android — fill the Part-1 catalog
(law-tested/parity-checked), prove the five Part-2 rows, confirm the Part-3 first-mount translate
+ Part-4 key fix. Then review → planner closes MOT-001 + propagates the catalog values at
docs-closed.
