# U5-001 — notes

## Unverified claims — settled on device (2026-06-11)

The device run (both platforms, agent-device; full writeup in `evidence/device.md`
§Results) confirmed every claim below. The maintainer still owns the `device-verified` tick
and RT-013 closure — these are evidence, not the gate.

- **CONFIRMED** — The iOS bounds-KVO capture fires at mount and on every RN-applied layout
  change, including origin-only moves. Mount: `(101,383,200,200)`. Origin-only (spacer):
  one capture, only origin-y shifted 353→440.67, size held at 300×260. Resize and rotation
  each fired exactly one capture; an intensity prop batch fired zero (event-driven, no poll).
- **CONFIRMED** — The Android `OnLayoutChangeListener` fires from `View.layout()`
  independently of `FxSurfaceView`'s no-super `onLayout` override. Origin-only (spacer): one
  capture `128,878,953,1593 (825x715)`, only y shifted; resize and forced rotation each one
  capture.
- **CONFIRMED** — The observer writes nothing: child layout byte-identical with and without
  the observer (Scenario 4 variant build) — iOS `{101,383,200,200}`, Android
  `{265,958,550,550}` + both TextViews, normalized rect sets identical.
- **CONFIRMED** — Zero JS round-trip per layout event (Scenario 3): no `onLayout` prop, no
  observer JS surface; native-only captures/reads, no JS layout dispatch.
- **CONFIRMED** — RT-013's two halves: strictly-`expo-view` reachability (every read on
  `FxSurfaceView`, no hosted-substrate involvement) + New-Arch-only stance (runtime
  `"fabric":true`, `newArchEnabled=true`). Recordings `evidence/{ios,android}/rt013-*.mp4`.

Instrumentation was log-only (`NSLog`/`Log.i`) and **fully reverted**; working tree is
diff-clean except `evidence/` and this note; `swift:lint` + Biome green post-revert.

## Changes (2026-06-11)

- **`research/5-realization/structure.ios.md`** — new §Layout read (the post-layout frame),
  pinned BEFORE code per the spec: RN applies the frame in `updateLayoutMetrics` via
  `center` then `bounds` (`UIView+ComponentViewProtocol.mm:84-110`; parent-space points,
  `LayoutMetrics.h:24`); the adopted read point is KVO on `\.bounds` — the expo-modules-core
  in-house template (`SwiftUIViewFrameObserver.swift:16-31`). **The references-preflight
  fan-out corrected the obvious path:** overriding `updateLayoutMetrics` is impossible from
  Swift (C++ `facebook::react::LayoutMetrics &` signature) and an ObjC++ shim is rejected
  per rule #7; `layoutSubviews` is rejected (misses origin-only relayouts). Window-space
  reads are live, not captured (ancestor scroll moves the view without a local layout
  event).
- **`research/5-realization/structure.android.md`** — new §Layout read: RN assigns the
  frame at `SurfaceMountingManager.kt:829-859` (`measure(EXACTLY)` + `layout(x,y,…)`,
  parent-space px); adopted read point `View.OnLayoutChangeListener` (fires independent of
  the `onLayout` body — load-bearing because `FxSurfaceView` overrides `onLayout` without
  super; Expo precedent `RNHostView.kt:131-135`); insets via `ViewCompat.getRootWindowInsets`
  (RN's own `ReactSurfaceView.kt:50-70` pattern).
- **`packages/ios/FxLayoutObserver.swift`** (new) — `FxEdge` + `FxLayoutObserver`: bounds
  KVO capturing the parent-space frame; synchronous reads `readFrameInParent()`,
  `readOriginInWindow()`, `readTravelDistance(to:)` (distance to fully clear a window
  edge), `readSafeAreaInsets()`; `invalidate()` stops observing; unowned view + weak-self
  handler (no retain cycle).
- **`packages/ios/FxSurfaceView.swift`** — owns the observer: created in `init`,
  `invalidate()` in `deinit`. Internal only — not bridged, no Expo `Prop`/`Events` touched.
- **`packages/android/.../FxLayoutObserver.kt`** (new) — `FxEdge` + `FxLayoutObserver`:
  layout-change listener capturing the parent-space frame (seeded from `isLaidOut` at
  attach); reads mirror iOS (`getLocationInWindow` for window origin/travel, root view for
  window size, `ViewCompat.getRootWindowInsets` for insets); `detach()` for explicit
  teardown (lifetime is otherwise view-bound — the view holds the listener on itself).
- **`packages/android/.../FxSurfaceView.kt`** — owns the observer as an internal property.
- **`research/7-implementation/tasks/U5-001/evidence/device.md`** (new) — the 5-scenario
  device run (mount frame, event-path refresh incl. origin-only, zero JS, observer writes
  nothing, a11y) + the RT-013 two-halves recording plan.
- No TS file changes — the observer has no JS tier (per the spec's proof field).
- U4 child-routing and U4-003 Metal paths untouched beyond the two ownership lines above.

## Proof run (2026-06-11)

- From `packages/`: `bunx tsc --noEmit` · `bun run build` · `bun run lint` (Biome, 19 files)
  · `bun run swift:lint` · `bun run test` (34 pass) — all green; `git diff --check` clean.
- `pod install` in `example/ios` (new Swift file), then `xcodebuild` (Debug,
  iphonesimulator) → **BUILD SUCCEEDED**; `gradlew :app:assembleDebug` → **BUILD
  SUCCESSFUL**.

## RT-013 closure plan (the cardinal rule)

RT-013 is device-pending: it closes ONLY after the maintainer ticks `device-verified` on
the `evidence/device.md` run (the U3-003/FX-003 precedent) — never at headless-done. On
that pass: strike the two answered research questions in `33` (post-layout availability /
native read) and resolve the `33` §Open questions hosted-reachability + New-Arch bullets to
the recorded stance (strictly `expo-view`, New Arch only, SDK 56 floor); flip the RT-013
ledger row to resolved pointing at `33`. `docs-closed` follows, not precedes, the device
gate.

## Closure executed (2026-06-11, post-ratification)

The maintainer ratified `device-verified` on the 5/5 PASS evidence. Per the plan above:
`33`'s post-layout research question struck and answered; the two §Open questions bullets
resolved (strictly `expo-view`; New Arch only, SDK 56 floor); the falsification test's
layout-read half marked device-proven (identity half stays with U9-002); ledger RT-013
flipped to resolved citing `33`, the structure pins, and the evidence. Reviewed
(`../../reviews/U5-001.md`, approved — evidence verified against the tree, gates re-run
post-revert) and docs-closed. State: **ready-to-merge**.

Next: maintainer merges on integration/0.1.x (everything is uncommitted in the working
tree — code, pins, evidence, closure edits); U6-001 (FxAnimationDriver) unblocks on merge
and needs spec'ing first (state `todo`, spring dispositions pre-ratified in its preflight).
