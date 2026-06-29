# DEF-027 — reveal-host rework (app-placed host; cross-platform)

Type: rework (iOS + Android native + JS + example). Supersedes the round-1 Android-only attempt.
Maintainer-ratified into canon 2026-06-29: `54 §Placement & portal coexistence` (the reveal-host
requirement) + `50 §Props by default` (the anchored-reveal direction).

## Why a second rework

Round 1 made `FxRevealView` implement `ReactPointerEventsView` (`AUTO`) and resized the expanded
layer in place. The device re-gate showed: the **collapsed-card tap now opens the camera** (good),
but the **expanded Shutter is still not touchable on Android** — the executor resized
`expandedContainer` inside a still-collapsed-sized `FxRevealView`, and RN's `TouchTargetHelper` does
not descend into a parent for points outside its own bounds. An fx-created overlay window would
reopen DEF-003. So the ratified direction is:

**The app owns the bounds-containing placement host; fx owns the reveal animation inside it.**

## The contract (ratified — `54`/`50`)

- The **app lays out a bounds-containing host** — a root-level overlay, the app's own portal, or RN
  `Modal` — whose bounds span the collapsed slot *and* the expanded target. fx creates no host of
  its own (DEF-003 intact; rule #9 — fx reads layout, never owns tree placement). Do **not** phrase
  this as "fx owns placement."
- **`FxReveal` fills that host.** Its native view is sized by the host (match-parent), not by the
  collapsed content. So the reveal view is the touch-receiving parent across the whole region, and
  the revealed panel sits *inside* its bounds → touch-reachable on Android.
- **fx reads the collapsed *slot* frame inside that host** — the one collapsed slot/wrapper view's
  laid-out frame (a self-read). NOT a descendant search, NOT a foreign ref, NOT the shell bounds.
  This is `fromRect`. The expanded target resolves inside the host.
- The reveal animation fx owns is unchanged: inverse transform, cross-fade, interruption,
  completion. Boundary A holds (own frame only; no foreign rect; no Yoga write — the host is an
  overlay, so no sibling reflow).

## What changes

**JS (`src/surface/FxReveal.tsx`):**
- `FxReveal` fills its host (e.g. defaults to filling, or documents that the host sizes it). The two
  slots render as before (collapsed slot first, expanded slot second), positioned *within* the
  full-bounds shell. The expanded slot stays out-of-flow/absolute at the target.
- Document the **reveal-host requirement** in the component docblock: for interactive expanded
  content, mount `<FxReveal>` inside a bounds-containing host (root overlay / app portal / Modal).
- No new prop. `placement` stays removed; no `anchor`/`from`.

**Native — both `FxRevealView.{swift,kt}` + `FxRevealCoordinator.{swift,kt}`:**
- The reveal view **fills the host** instead of `setMeasuredDimension` to the collapsed/spec size.
- `fromRect` (the collapsed frame) reads the **collapsed slot/wrapper child's** laid-out frame
  within the shell, NOT `Rect(0,0,width,height)`/shell bounds. One slot frame, no descendant search.
- The expanded layer is positioned at the target **inside the now-full-bounds shell**, so it is
  within the touch-receiving parent's bounds.

**Android touch (`FxRevealView.kt`):**
- Revert the host to **`BOX_NONE`** (round 1 set `AUTO`): a full-bounds reveal view must let
  non-content taps fall through to the app behind it. Keep each internal full-bounds layer
  (`FxRevealLayer`) `BOX_NONE` so only real RN content (the collapsed card, the expanded
  panel/shutter) becomes the `TouchTargetHelper` target.
- Keep the **phase-gated expanded interactivity** (`setExpandedInteractive`: `INVISIBLE`/hidden +
  excluded from the flattened child walk while collapsed) so the hidden panel never intercepts taps.

**iOS (`FxRevealView.swift`):** apply the same fill-host + collapsed-slot-frame model. iOS already
delivered touch via the `hitTest` extension; under a bounds-containing host that extension becomes
belt-and-suspenders — keep it harmless. Do not regress the passing iOS rows.

**Example (`example/screens/reveal.tsx`):**
- Mount the reveal inside a **bounds-containing host** — the simplest is a root-level
  `StyleSheet.absoluteFill` `pointerEvents="box-none"` overlay (or RN `Modal`); place the collapsed
  chat-input within it; reveal the bottom-half panel within the same host.
- This is the canonical "app-placed host" demonstration the device gate exercises.

## Out of scope

No FxAnchor, no foreign-rect read, no shared-element retention. No layout reflow (the host is an
overlay). No radius/clip/chrome (step 2). **No fx-created overlay window / portal primitive** (the
whole point — placement is the app's). No new public prop.

## Device re-gate (the bar; iOS must not regress)

With the example's app-placed host bounds covering the bottom-half panel:
- **Collapsed-card tap opens the camera** (both platforms).
- **Expanded Shutter tap increments** the counter through the reveal — the headline Android fix.
- **Shutter sits above the tab bar** (within the host bounds, not under it).
- Closed-state: tapping the bottom-half region while collapsed does nothing (hidden panel inert).
- Prior rows unregressed (geometry, no-reflow, cross-fade, interruption ordering, background,
  reduce-motion) on both platforms; iOS card-tap + Shutter still work.

## Pre-merge tightening (maintainer-approved, 2026-06-29) — bounded, both platforms

The reveal-host rework passed the device gate (W1–W7), but `FxReveal` still uses window dims as the
pre-layout fallback, so a **non-full-window host mounted `open=true`** can show a one-frame
wrong-size flash of the expanded subtree before `onLayout` supplies host size. Close it:

- **JS (`src/surface/FxReveal.tsx`):** remove the window-size fallback for the expanded content.
  Until `hostSize` exists, render the expanded wrapper at **`0×0`, non-visible/non-interactive**.
  Once `onLayout` fires, size it to `{ width: hostSize.width, height: hostSize.height / 2 }`.
- **Coordinators (`FxRevealCoordinator.{swift,kt}`) — `seatInitial(open: true)`:** if layout is not
  yet resolved, set `phase = expanded`, **keep the expanded layer non-interactive/hidden**, snap the
  collapsed opacity appropriately, set `pendingTarget = true`, and return. Only make the expanded
  layer visible after **real host geometry exists** (the deferred re-seat on the first layout pass).
  (Today `seatInitial` calls `setExpandedInteractive(true)` + snaps the geometry *before* the
  resolved-size check — reorder so visibility waits for resolved size.)
- **Evidence:** add row **W8** (`evidence/headless.md`) — non-full-window host + initial `open=true`
  shows no wrong-size flash, then the expanded content becomes correctly sized **and touchable**
  after layout.

Keep DEF-027 `device-pending` until the bounded W8 re-gate passes (W1–W7 already passed). No other
behavior changes; do not touch the passing touch/geometry paths beyond this initial-seat reorder.

## Gates (headless, executor)

`bun run lint`, `bun run build`, `bun run test` (Jest); Android
`:react-native-fx:compileDebugKotlin` + `:app:assembleDebug`; iOS `pod install` + example
`xcodebuild`; example tsc. Update `evidence/headless.md` with the re-gate rows; write the rework into
`notes.md`. Do not close the device gate or docs-closed.
