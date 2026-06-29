# DEF-027 — implementation notes (executor)

Step 1, the geometric spine. Headless-done. The device gate + docs-closed are the maintainer's /
planner's, not closed here.

## Unverified claims (need the device gate)

- **Android collapsed-card tap opens.** `FxRevealView` now implements `ReactPointerEventsView`
  (`AUTO`), with each reveal layer still `BOX_NONE`, so Android should descend into the hosted
  collapsed `Pressable`. This is compile-proven only; device must confirm the in-bounds card tap
  opens the reveal.
- **Android expanded Shutter touch survives.** The expanded child is now laid out in host-local
  placement coordinates and exposed to the flattened touch walk only while the reveal is active.
  Device must confirm the Shutter increments in the overflow region.
- **Android Shutter sits above the tab bar.** The Android native target now uses the laid-out
  expanded child size when available. Device must confirm this lifts the Shutter out from under the
  tab bar.
- **iOS card-tap + Shutter still work.** No iOS source changed in the rework, and the iOS example
  build still passes, but the maintainer must smoke the already-passing card-tap and Shutter rows.
- **No public `placement` prop.** `FxRevealProps` no longer exposes `placement`, and package +
  example TypeScript compile. Device/docs review should still confirm examples and docs do not
  teach the prop.
- **Sharp expanded content at target size.** The inverse-transform path rasterizes the expanded
  layer at the placement size and only scales the *transform* down to the collapsed frame. Proven
  by construction (non-uniform `scaleX`/`scaleY` + corner pivot); not yet seen on a device.
  - **Content-size hybrid (executor pin, for docs-closed).** Yoga would size the expanded RN
    subtree to the *collapsed* shell, defeating sharpness. So `FxReveal` sizes the expanded slot via
    an **out-of-flow absolute wrapper** whose dimensions come from `useWindowDimensions`
    (`bottom-half` → `width, height/2`), while the **native** side computes the matching placement
    *position + inverse transform* from the same window bounds. Out-of-flow ⇒ no sibling reflow, no
    Yoga host-write — consistent with rule #9. The two derivations agree by construction for
    `bottom-half`; confirm on device they stay aligned (and that a *deep* subtree like a real
    `CameraView` fills it sharp — the stand-in is a plain panel).
- **The overlay hosting / sizing mechanic.** The expanded layer is a subview of the shell sized
  natively to `toRect` (bottom-half of the window, converted to shell-local), with clipping
  disabled so it overflows the collapsed shell. This is the open mechanic the spec defers to device
  proof. Two residual risks, both device-only:
  - **Android touch + clipping in the overflow region.** Android does not dispatch touches outside
    a parent view's own bounds to its children, and ancestor `ViewGroup`s may clip. The expanded
    panel overflows the collapsed shell, so camera-stand-in taps *outside* the shell bounds may not
    land, and the panel may be clipped by an ancestor. `clipChildren=false`/`clipToPadding=false`
    are set on `FxRevealView` and both layers, but ancestor clipping is outside our control. If the
    gate shows clipping/lost touch, the fix is hosting the expanded layer higher (a root/overlay
    view) — a larger mechanic, deliberately out of step-1 scope.
  - **iOS overflow touch** is handled by the `hitTest` override that routes points missing the
    shell into the expanded layer while expanded/expanding; confirm on device.
- **Interruption ordering.** Open↔close mid-flight emits the cut-short phase `interrupted=true`
  *then* retargets (mirrors the presence FSM); confirm one completion event per settled phase with
  the correct phase under rapid toggles.
- **Reduce-motion / off-window pause / iOS<17.** Inherited from `FxAnimationDriver` (reduce-motion
  → instant via `snap`; off-window → seat final value, no loop; iOS<17 → no `SwiftUI.Spring`, instant
  cut). Not re-verified for the reveal specifically.

## What changed + why

### Non-uniform scale + origin/pivot (the driver stack)

- `ios/FxSpring.swift` — `FxAnimationVector` now carries `scaleX`/`scaleY` + normalized
  `originX`/`originY` (default 0.5 = center, the legacy behavior). Kept a uniform-`scale`
  convenience init + computed property so every pre-reveal caller (presence, state) compiles
  unchanged and stays uniform. The spring integrates both axes; origin is static (never integrated).
- `ios/FxAnimationDriver.swift` — replaced the polar `sqrt(a²+c²)` scale read-back (which collapsed
  non-uniform scale to one wrong value) with independent `fxScaleX = √(a²+b²)` / `fxScaleY =
  √(c²+d²)`. Added `applyAnchorPoint` — pins the layer anchor to the envelope origin, preserving the
  visual frame; a no-op for the center default.
- `android/.../FxAnimationDriver.kt` — `FxAnimationVector` gains `scaleX`/`scaleY` +
  `originX`/`originY`; a secondary `scale` constructor keeps every named-arg caller working. Drives
  `SCALE_X`/`SCALE_Y` independently; `seatPivot` sets `pivotX/Y` per envelope.
- `src/manifest/manifest.ts` — `motion.properties` gains `scaleX`/`scaleY` (uniform `scale` kept as
  the shorthand). `manifest/config.ts` derives types from this with no manual edit.

### The reveal (new, both platforms + JS)

- `ios/FxRevealCoordinator.swift`, `android/.../FxRevealCoordinator.kt` — the FSM
  (collapsed/expanding/expanded/collapsing) over the discrete `open` target, modeled on
  `FxPresenceCoordinator`. Resolves `fromRect` (self-read) + `toRect` (native placement) and emits
  one `onTransitionEnd` per settled/cut-short phase. v1 Boundary A by construction (owns both
  endpoints; no foreign-rect read).
- `ios/FxRevealView.swift`, `android/.../FxRevealView.kt` — a dedicated expo-view shell. Two
  fx-owned layers (collapsed fills the shell; expanded sized to the placement, geometry-driven),
  two `FxAnimationDriver`s (geometry + counter-fade), symmetric child mount/unmount routed by slot
  index. **Decision:** a dedicated view rather than overloading `FxSurfaceView`, to isolate the
  two-layer routing from the central surface (overloading would need racy index-conditional routing
  on the shared view). It reuses the shipped mechanisms the spec names (driver/vector/spring + the
  intermediate-container hosting pattern). Flagged for the planner to confirm at docs-closed.
  **Self-read:** the collapsed `fromRect` is read directly from `bounds` and the expanded `toRect`
  from the live window position (shell-local) — no `FxLayoutObserver` instance, because shell-local
  geometry read synchronously at phase start needs no captured parent frame (the spec named the
  observer as the reuse vehicle; the direct read is the simpler self-read, no Yoga write either way).
- `src/runtime/FxRevealView.{tsx,web.tsx,types.ts}` — the native binding (+ web no-op stub).
- `src/surface/FxReveal.tsx` — the public surface. Current API:
  `open`/`collapsed`/`expanded`/`preset`/`transition`/`onTransitionEnd`. **No public
  `placement`, `from`, or `anchor` prop** (the hard surface constraint). `preset` owns the
  bottom-half target. `preset`/`transition` accepted for API stability; v1 honors the
  platform-default spring (no transition type frozen, per the DOC-034 hybrid principle).
- Exports wired through `src/surface/index.ts` + `src/index.ts`; native views registered in both
  `FxModule.{swift,kt}` (`open`, private/defaulted native placement plumbing,
  `onFxTransitionEnd`).

### Tests + example

- `src/__tests__/reveal-conformance.test.ts` — guards the manifest channels, the native driver
  drift (independent axes + pivot, no polar read-back), the native registration, and the
  **no-anchor-prop** surface constraint. +6 tests (180 → 186).
- `example/screens/reveal.tsx` + nav wiring (`data/tasks.ts`, `app/(tasks)/[taskId].tsx`):
  collapsed card → bottom-half panel with a labelled camera stand-in (no camera peer is wired);
  toggles `open`, logs `onTransitionEnd`, has a sibling row to eyeball no-reflow.

## Review fixes (post-headless review, 2026-06-29)

- **Android hidden expanded content was touchable while collapsed** (finding 1). The expanded layer
  is `BOX_NONE`, and Android hit-testing does not skip an alpha-0 child, so invisible expanded
  content could intercept taps while closed. Added `setExpandedInteractive` — gated on phase by the
  coordinator: `INVISIBLE` (Android) / `isHidden` (iOS) at collapsed rest, visible across
  expanding/expanded/collapsing. iOS was already safe (phase-gated `hitTest` + alpha-skip); the gate
  is applied both platforms for parity. New device row 4b covers the closed-state check.
- **Collapsed content now sizes the shell** (finding 2). The collapsed slot is in normal Yoga flow
  (the expanded slot stays absolute/out-of-flow), so the self-read collapsed frame is the collapsed
  content's own size — no explicit shell size required. Example updated to drop its explicit shell
  height.
- **Deferred-initial flash fixed** (found while applying finding 1). The initial seat now snaps the
  resting state immediately (even before layout — a collapsed seat hides the expanded layer at once)
  and re-seats by *snap* on the first layout, instead of resuming through the animated begin*; this
  removes a one-frame flash of the expanded layer at mount when `open=false`.
- **Size-authority divergence** (finding 3) — *not* refactored (would disturb the verified
  geometry); device rows 9–10 (safe-area, rotation/split-screen) added + the single-authority
  recommendation recorded in `evidence/headless.md` for the docs-closed decision.

## Android rework + public API change (2026-06-29)

- `android/.../FxRevealView.kt` — made the reveal host implement `ReactPointerEventsView` with
  `AUTO`, matching the Android touch contract for an interactive hosted surface. Kept each
  `FxRevealLayer` as `BOX_NONE`, so the layer itself never becomes the target.
- `android/.../FxRevealView.kt` — changed expanded-slot layout so the expanded child is measured
  from its laid-out target size when available and laid out in host-local placement coordinates.
  This gives `TouchTargetHelper` child bounds that match the bottom-half target instead of the
  collapsed origin.
- `android/.../FxRevealView.kt` — excluded the expanded child from the flattened child accessors
  while collapsed at rest, because Android hit-testing does not skip alpha-0 or hidden ancestors
  when the accessor flattens past them.
- `android/.../FxRevealCoordinator.kt` — adjusted the collapsed inverse-transform translation for
  the new host-local expanded child coordinates.
- `src/surface/FxReveal.tsx` — removed public `placement`; `preset="anchoredMorph"` owns the
  bottom-half target. The component still internally sizes the expanded slot to bottom-half for v1.
- `src/runtime/FxRevealView.types.ts`, `src/index.ts`, `src/surface/index.ts` — removed the public
  `FxRevealPlacement` type and stopped sending `placement` through the runtime binding. Native
  placement registration remains private/defaulted.
- `example/screens/reveal.tsx` — removed `placement="bottom-half"` from the harness.
- `src/__tests__/reveal-conformance.test.ts` — removed the public-surface placement token assertion
  and added a guard that `FxRevealProps` declares no public placement prop.

## Gates (headless)

lint (pinned biome) clean · `bun run build` ok · `bun run test` 187/187 · example `tsc` exit 0 ·
Android `:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL · Android `:app:assembleDebug`
BUILD SUCCESSFUL · iOS `pod install` + example `xcodebuild` BUILD SUCCEEDED — see
`evidence/headless.md` for the device runbook.

Next: maintainer runs the Android re-gate rows plus the iOS card-tap/Shutter smoke in
`evidence/headless.md`; leave DEF-027 device-pending and docs-closed open until that proof lands.

## Round-2 rework — reveal-host (2026-06-29)

The round-1 Android fix (AUTO + in-place expanded resize) passed the collapsed-card tap but not
the expanded Shutter: the expanded layer was still a child of a collapsed-sized `FxRevealView`, so
`TouchTargetHelper` would not descend for out-of-bounds points. The ratified direction: **the app
owns the bounds-containing placement host; fx owns the reveal animation inside it.**

### What changed per file

**`ios/FxRevealView.swift`**
- `collapsedFrameInShell()` — changed from returning `CGRect(origin: .zero, size: bounds.size)`
  (shell bounds) to returning `collapsedContainer.subviews.first?.frame ?? .zero` (the first
  Fabric-managed child's frame, which is the app-positioned collapsed slot within the full-bounds
  host). The zero fallback is corrected by the coordinator's pending-target re-seat on first layout.
- `layoutSubviews()` — removed the loop that overrode each collapsed container child's frame to
  `collapsedContainer.bounds`. The collapsed slot wrapper is a Fabric-managed child; its frame is
  set by the layout engine and must not be clobbered. The expanded container child loop is kept
  (the expanded content fills the placement-sized container, consistent with `seatExpandedFrame`).

**`android/.../FxRevealView.kt`**
- `pointerEvents` — reverted from `PointerEvents.AUTO` back to `PointerEvents.BOX_NONE`. With the
  host spanning the full bounds, a BOX_NONE shell lets non-content taps fall through while still
  routing into real RN content (collapsed card, expanded panel) through the BOX_NONE layers.
- `collapsedFrameInShell()` — changed from `Rect(0, 0, width, height)` to reading the first child
  of `collapsedContainer` (`child.left/top/right/bottom`), the same self-read as iOS. Falls back to
  an empty rect; corrected by the coordinator's pending-target re-seat.

**`src/surface/FxReveal.tsx`**
- `FxRevealView` now receives `style={StyleSheet.absoluteFill}` unconditionally — it fills the
  host. The user's `style` prop moves to the collapsed slot wrapper `<View>`, so the app can
  position the collapsed content within the full-bounds shell (its Fabric-computed frame is the
  `fromRect`).
- Component docblock updated with the reveal-host requirement (§ app-placed host, how to mount,
  why — Android TouchTargetHelper constraint, DEF-003 intact).
- `style` prop JSDoc updated: "positions the collapsed slot wrapper within the host."

**`example/screens/reveal.tsx`**
- Added a `StyleSheet.absoluteFill pointerEvents="box-none"` root-level overlay (the host).
- `FxReveal` is mounted inside the host; its `style` prop positions the collapsed card at
  `{position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16}`.
- Host comment documents the reveal-host contract for the device gate runner.

### Unverified claims (need device re-gate)

- **Android collapsed-card tap opens (BOX_NONE model).** `TouchTargetHelper` must descend through
  the BOX_NONE chain to the Pressable. Compile-proven only.
- **Android Shutter touch within host bounds.** The expanded layer is `VISIBLE`/`BOX_NONE` when
  expanded; its children are at native host-local coordinates. TouchTargetHelper must find the
  Shutter. Compile-proven only.
- **Non-content taps fall through.** The `BOX_NONE` shell must not swallow taps outside the
  collapsed card and expanded panel. The controls row above the overlay should remain tappable.
- **iOS collapsedFrameInShell() reads the slot correctly.** The first subview of
  `collapsedContainer` is the Fabric-managed collapsed slot wrapper. Its frame within the container
  must equal the Yoga-computed position of the slot in the shell. Device must confirm geometry and
  sharpness are not regressed (the `layoutSubviews` loop removal does not disturb the expanded
  content path).

### Next

Maintainer re-gates rows W1–W6 in `evidence/headless.md`; state stays device-pending.

## Review-fix pass (2026-06-29 — three findings)

### Finding 1 — iOS containers absorbed empty-space taps

`collapsedContainer` and `expandedContainer` are plain `UIView`s. `UIView.hitTest` returns `self`
when a point is in bounds but no subview claims it, so a tap in empty overlay space could land on a
container and never reach the app behind.

**Fix:** replaced the old `hitTest` override (which extended into the expanded layer for
out-of-bounds overflow, now moot) with a pass-through filter in `FxRevealView.hitTest`:
```swift
guard result !== self, result !== collapsedContainer, result !== expandedContainer else { return nil }
```
Empty-space hits return nil; only real RN descendants (a Pressable card, a Shutter button) are
returned. The `expandedContainer.isHidden` gate already prevents the expanded container from being
traversed while collapsed, so no phase guard is needed.

### Finding 2 — Placement resolved from window/root, not the host

Both platforms derived the `bottom-half` target rect from `window.bounds` (iOS) or
`rootView.height + getLocationInWindow` (Android). This only works when the host exactly equals the
window root. A portal or safe-area-inset host that is not full-window would put the target outside
host bounds.

**Fix:** both platforms now compute placement in the shell's own coordinate space:
- iOS: `CGRect(x: 0, y: bounds.height / 2, width: bounds.width, height: bounds.height / 2)` —
  no `window` or `convert` call
- Android: `Rect(0, height / 2, width, height)` — no `rootView`, no `getLocationInWindow`;
  `resolvedExpandedContentSize` (dead helper) removed; `onMeasure` passes the measured spec
  dimensions directly so the expanded container is measured at full target size on the first pass

### Finding 3 — Stale planning IDs in shipped code

Removed `(rule #9)` from `FxRevealView.swift` class docblock, `FxRevealView.kt` class docblock,
and `FxReveal.tsx` component docblock. Removed `DEF-027 rework` and the bare `DEF-027 ·` label
from `example/screens/reveal.tsx`.

### Gates (re-run after fixes)

lint clean · build ok · Jest 187/187 · example tsc · Android `compileDebugKotlin` +
`assembleDebug` BUILD SUCCESSFUL · iOS `xcodebuild` BUILD SUCCEEDED.

## Round-3 fix pass (2026-06-29 — two findings)

### Finding 1 — Expanded slot still sized from window, not the host

`FxReveal.tsx` used `useWindowDimensions()` exclusively for the expanded slot size. After the
host-local native fix, native resolves `toRect` in host coordinates, but the JS expanded slot was
still measured at window dimensions. For a full-window host these agree; for any non-full-window
host (portal, safe-area inset, modal) the JS content size would diverge from the native `toRect`.

**Fix:** added `onLayout` to `NativeFxRevealProps` (+ `LayoutChangeEvent` import); `FxReveal` now
tracks the host's actual laid-out dimensions via an `onLayout` handler on `FxRevealView`.
`expandedSize` uses `hostSize` when available and falls back to `useWindowDimensions()` for the
first render before `onLayout` fires — correct for full-window hosts where the two values agree.
The expanded slot is `INVISIBLE`/`isHidden` while collapsed, so the one-render fallback is
invisible to the user.

**Files changed:**
- `src/runtime/FxRevealView.types.ts` — added `LayoutChangeEvent` import; added
  `onLayout?: (event: LayoutChangeEvent) => void` to `NativeFxRevealProps`
- `src/surface/FxReveal.tsx` — added `useState`, `LayoutChangeEvent` imports; added `hostSize`
  state + `handleLayout` callback; `expandedSize` reads `hostSize ?? window` dimensions; passed
  `onLayout={handleLayout}` to `FxRevealView`

### Finding 2 — Evidence row 9 was stale

`evidence/headless.md` row 9 still said "JS uses `useWindowDimensions`, native computes from
window bounds" — native no longer uses window bounds after the host-local fix.

**Fix:** updated row 9 to describe the new host-local reality: native resolves from host bounds;
JS reads host dimensions from `FxRevealView`'s own `onLayout`; both agree for non-full-window
hosts.

### Gates (re-run after fixes)

lint clean · build ok · Jest 187/187 · example tsc · Android `compileDebugKotlin` +
`assembleDebug` BUILD SUCCESSFUL · iOS `xcodebuild` BUILD SUCCEEDED.

## Pre-merge tightening (2026-06-29)

### What changed

**`src/surface/FxReveal.tsx`** — removed `useWindowDimensions` and the window-size fallback for
the expanded slot. Before `hostSize` (from `FxRevealView onLayout`) resolves, the expanded wrapper
is `{ width: 0, height: 0, opacity: 0 }` — not visible and not interactive. Once `onLayout` fires,
it sizes to `{ width: hostSize.width, height: hostSize.height / 2 }`. No window-dimension fallback.

**`ios/FxRevealCoordinator.swift` + `android/.../FxRevealCoordinator.kt`** — `seatInitial(open:
true)` reordered: when `!hasResolvedContentSize`, now sets `phase = expanded`, snaps collapsed
opacity to 0, keeps the expanded layer hidden (`setExpandedInteractive(false)`), sets
`pendingTarget = true`, and returns early. `setExpandedInteractive(true)` and
`snapExpanded(expandedGeometry())` are deferred until the first layout pass triggers
`handleContentLayout` → `seatInitial` re-entry with resolved size. Both platforms mirror
each other symmetrically for the initial-open path.

**`example/screens/reveal.tsx`** — added a W8 affordance: a "W8: OFF/ON" toggle in the controls
row. When W8 mode is active, the full-window host is replaced by a fixed-height (`height: 420`)
non-full-window host and `FxReveal` starts with `open=true` (`w8Open` state, initialized to
`true`). The W8 host uses its own `w8Open` state so the default W1–W7 demo (`open`) remains
independent. Toggling W8 resets `w8Open` to `true`.

### Unverified claims (W8 device gate)

- **No wrong-size flash on initial open=true in a non-full-window host.** The JS expanded wrapper
  starts 0×0/opacity 0 and the native expanded layer is hidden until `onLayout` fires. On device,
  verify there is no first-frame flash of the expanded subtree at the wrong size before the layout
  pass; then confirm the expanded content is correctly sized and touchable after layout.
- **W8 expanded content touchable after layout.** After `onLayout` fires and the expanded layer
  becomes interactive, tapping the Shutter in the W8 panel must increment the counter (proves
  `setExpandedInteractive(true)` + `snapExpanded` complete correctly after the deferred re-seat).

### Gates (re-run after tightening)

lint clean · build ok · Jest 187/187 · example tsc exit 0 · Android
`:react-native-fx:compileDebugKotlin` BUILD SUCCESSFUL · `:app:assembleDebug` BUILD SUCCESSFUL ·
iOS `xcodebuild` BUILD SUCCEEDED.

### Next

Maintainer runs the bounded W8 re-gate in `evidence/headless.md` (row W8 — non-full-window host +
initial open=true → no flash, then correctly sized + touchable). State stays `device-pending`.
