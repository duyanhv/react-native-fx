# DEF-028 — FxReveal chrome: scale-free radius morph + clip (step 2)

Type: implement (code) + paired docs-closed ratification. Device-gated.
Trigger: maintainer picked FxReveal step 2 (2026-06-29), after the recommendation-pass on the
chrome mechanic (scope + API + the scale-free-channel pivot). Builds on DEF-027 (step 1, the
geometric spine, merged `f5c3662`). Ledger row minted at docs-closed.

This is **step 2 of the reveal**: it adds a morphing **corner radius + clip** to the shipped
geometric spine. **Border and background are explicitly out of scope** — a later step 3 row, only
when a real consumer needs them.

## Goal

Round and clip the reveal. Today (step 1) the expanded panel reveals with **square, unclipped**
corners. Step 2 makes the reveal's visual boundary a rounded rect whose **corner radius morphs**
from a collapsed-state radius to the expanded-panel radius across the open/close, and **clips the
expanded content** to that boundary — without distorting the radius and without re-introducing
content blur. The radius stays visually circular throughout the non-uniform morph; content stays
sharp (the step-1 guarantee is preserved).

## The hard constraint — chrome is a separate scale-free channel (maintainer, 2026-06-29)

Corner radius **must not** live on the inverse-transformed content layer. Step 1 reveals by laying
the expanded layer at **target size** and applying a **non-uniform** `scaleX`/`scaleY` + pinned
`origin` so it visually starts on the collapsed frame, animating to identity (`structure.ios.md`
/`structure.android.md` § reveal; `41` d16). A `cornerRadius` on that same layer is applied in the
layer's own space and **then** scaled — with `scaleX ≠ scaleY` a round corner becomes an ellipse
and the radius is the wrong size for the whole flight, only correct at identity. This is the bug to
design out from the start.

**The correct mechanic (decided, executor pins exact form):**

- The **inner content-motion layer** keeps the existing inverse transform and hosts the expanded RN
  content. Today that is `expandedContainer` (it both carries the `geometryDriver` transform **and**
  hosts the expanded child — `FxRevealView.swift:45,197`; the Android `FxRevealLayer` mirror).
- A **new outer chrome/clip boundary** wraps that inner layer and is **never scaled**. Its
  rounded-rect **mask/outline path** animates in **host coordinates**: the clip rect from the
  collapsed slot frame → the target placement rect, and the radius from source → target — both as
  plain scalar/path animations on an **untransformed** boundary. The inner layer (target-sized,
  inverse-transformed to visually occupy the collapsed frame mid-flight) is clipped by this outer
  boundary, which is collapsed-sized mid-flight growing to target — so content and clip stay
  coherent, and the radius never sees the non-uniform scale.

This keeps the corners round, keeps content sharp, and adds **no per-frame layout** (the boundary
re-rasterizes nothing — only its mask/outline path animates).

Restated as the rule the executor must not drift from: **transformed layer = inner content-motion
layer; chrome/clip boundary = outer, unscaled.** Putting radius on the transformed layer is the
distorted-corner regression — reject it in review.

### Platform realization (executor pins exact form; docs-closed records it)

- **iOS:** a `CAShapeLayer` mask on the outer boundary whose `path` animates between two
  rounded-rect paths (same control-point count), **or** a `masksToBounds` mask layer with animated
  `bounds` + `cornerRadius`. Driven off the same collapsed/target frames the coordinator already
  resolves (`prepareExpandedPlacement` / `resolvedPlacementRect`, `FxRevealView.swift:163-169`). The
  mask layer is **not** in the `geometryDriver`'s transformed subtree.
- **Android:** a chrome/clip container `View` with a `ViewOutlineProvider` returning an animated
  rounded rect + `clipToOutline = true`, calling `invalidateOutline()` per frame — the container
  **never re-layouts**; only its outline animates. Driven off the resolved collapsed/target rects.

The exact mask-vs-bounds (iOS) and outline-vs-`Path`-clip (Android) choice is the open mechanic the
executor proves on device and `structure.{ios,android} § reveal` records at docs-closed.

## Public API — zero new props (maintainer, 2026-06-29)

`preset="anchoredMorph"` **gains** native radius morph + clipping. **No new public props.** No
`radius`, `clip`, `chrome`, `border`, `background`, or any source-style read. The preset owns the
source and target radii with **platform-native** values, the same way step 1 made the preset own the
bottom-half target. fx owns the chrome from the collapsed state, so it owns the radius at **both**
ends — **no foreign chrome read** (that keeps the row Boundary-A-by-construction). A custom-radius /
chrome override is a **future escape hatch**, added only when a second real consumer exists — do not
ship it here and do not freeze its type.

The chrome channel is **IR / private to the reveal coordinator**, never a public `fx.motion`
authoring field — exactly as `41` d16 kept `scaleX`/`scaleY` IR-only. The WIP non-goal "do not make
`fx.motion` the universal shape for chrome, radius, clipping" (`anchored-reveal-and-library-shape.md`)
binds here.

## Boundary call — still A by construction

fx draws the chrome it clips to and owns the radius at both ends. It reads **no** foreign chrome
(no source radius/border-style read — that pressure is exactly what border/background would add, and
why they are deferred). Own frame only; no Yoga write; the host is the app's overlay (unchanged from
step 1). The cross-tree frontier (`04 §The cross-tree frontier`, Decision 8) and `FxAnchor` remain
deferred to their `05` gate.

## Reuse vs build (grounded)

**Reuse (shipped — do not rebuild):**
- The whole step-1 spine: `FxRevealView`/`FxRevealCoordinator.{swift,kt}`, the geometry + counter-fade
  drivers, the FSM, the reveal-host model, the `BOX_NONE` + phase-gated touch contract, the
  initial-`open=true` deferral. Step 2 adds a channel; it does not re-architect the spine.
- The resolved collapsed/target frames the coordinator already computes (the clip rect + radius
  endpoints derive from these — no new geometry source).
- The retarget/interruption path (`FxSpring` / `SpringAnimation.animateToFinalPosition`): the chrome
  channel rides the **same** driver/clock so radius + clip retarget in lockstep with the transform.

**Build (new, both platforms):**
1. **The layer split** — introduce the outer scale-free chrome/clip boundary wrapping the inner
   (transformed) content-motion layer on the expanded side. Re-route the expanded child mount and the
   `geometryDriver` target so the transform stays on the inner layer and the mask/outline on the
   outer (today both are `expandedContainer` — `FxRevealView.swift:45,197`; Android mirror).
2. **The chrome channel** — a `cornerRadius` (+ clip-rect) animation track in the coordinator, run on
   the same driver as the transform so it shares the clock, completion, and retarget. Manifest
   `motion.properties` gains a `cornerRadius` IR channel (range/units the executor pins), kept
   **IR-only** like `scaleX`/`scaleY`. **Do not** add a public `fx.motion` radius field.
3. **The clip** — apply the mask/outline to the outer boundary so the expanded content is clipped to
   the rounded rect throughout, with no overflow at the corners during open/close.

## Out of scope (explicit)

- **No border. No background.** No color/style handoff, no border-width morph. (Step 3, later row.)
- **No source-chrome read** — fx does not read the collapsed slot's radius/border style. The preset
  owns both radii.
- **No new public props** (`radius`/`clip`/`chrome`/`border`/`background`/`target` override all out).
- **No public `fx.motion` radius/clip field** — IR/coordinator-private only.
- **No FxAnchor, no foreign-rect, no shared-element.** No Yoga write / reflow. No iOS content
  sampling. No per-frame geometry/progress to JS. No re-architecture of the step-1 spine.

## Per-platform degradation

- **iOS < 17 / reduce-motion:** instant cut (per step 1) — the radius + clip snap to the **target**
  chrome together with the transform (no half-morphed radius). Below iOS 17 the motion ladder is
  empty; the final clipped/rounded state still applies.
- **Android API 21+:** the outline clip is API-21-safe (`ViewOutlineProvider`/`clipToOutline` since
  API 21); reduce-motion (`areAnimatorsEnabled()` false) → snap transform + chrome to target together.
- Absent the chrome channel the reveal degrades to step-1 (square/unclipped) — never to a distorted
  radius.

## Authority sources

- DEF-027 (the spine this extends): `tasks/DEF-027/README.md`, `reviews/DEF-027.md`,
  `structure.{ios,android}.md § reveal`.
- `research/wip/anchored-reveal-and-library-shape.md` (chrome scope + the `fx.motion`-not-universal
  non-goal; this row promotes the radius+clip slice of its derivation history).
- `0-spine/04` (Boundary A), CLAUDE.md rules #2 (preset-first / shape-native), #5 (preset front
  door, no shader authoring), #9 (read layout, never write).
- `1-surface/50` (preset-first surface), `3-motion/41` (d16 IR-channel precedent + the new chrome
  channel decision at docs-closed).
- `manifest.ts` (`motion.properties` — the new `cornerRadius` IR channel).
- The guides (Code Style, Code Comments, Testing, Device Verification, Contributing) — binding.

## Lifecycle + gates

1. **implement → headless-done (executor).** Build step 2 to this spec. Honor the scale-free-channel
   constraint and the out-of-scope list. Run all headless gates: `bun run lint`, `bun run build`,
   `bun run test` (Jest), example tsc, Android `:react-native-fx:compileDebugKotlin` +
   `:app:assembleDebug`, iOS `pod install` + example `xcodebuild`. Extend the `reveal` example screen
   so the corner radius morph + clip is visible (e.g. a clearly-rounded collapsed card → rounded
   panel; clip-overflow visible if broken). Extend `reveal-conformance.test.ts` (guard: the
   `cornerRadius` IR channel exists + stays IR-only / no public `fx.motion` radius field; no new
   public reveal props). Write `evidence/headless.md` (device runbook with the gate rows below) +
   `notes.md` (unverified claims: round-corner fidelity under non-uniform morph, clip-overflow,
   Android clipped-content touch, chrome/transform retarget sync — all device-only). The executor
   does **not** close the device gate.
2. **device gate (maintainer).** On iPhone 17 Pro / iOS 26.5 + POCO F1 / Android API 35:
   - **G1 — round under morph:** the corner radius stays visually **circular** (not elliptical/
     squashed) throughout the non-uniform open and close, both platforms. (The distorted-radius bug.)
   - **G2 — no clip overflow:** expanded content does **not** visibly overflow the rounded boundary
     at any point during open/close, both platforms.
   - **G3 — clipped touch survives (Android especially):** expanded content (e.g. the shutter, incl.
     near a clipped corner) still takes touch after clipping — the step-1 `BOX_NONE`/phase-gated
     contract is not broken by `clipToOutline`/mask.
   - **G4 — interruption sync:** rapid open↔close mid-flight retargets transform **and** radius
     **and** clip in lockstep — one semantic completion per phase, correct phase, no radius snap.
   - **G5 — reduce-motion:** transform + chrome snap to the **target** together (no half-morphed
     radius), both platforms.
   - **G6 — no step-1 regression:** square-era hit testing / non-content fall-through is unchanged
     (empty-space taps still pass through; collapsed-card tap still opens; no-reflow holds); content
     still sharp at target size.
   - iOS < 17 degradation code-reasoned if no sub-17 device.
3. **docs-closed (planner) — the paired ratification.** `3-motion/41` — new decision (chrome
   channel: `cornerRadius` + clip rect, IR-only, consumed by FxReveal not a `motion` map).
   `structure.{ios,android}.md § reveal` — the proven chrome mechanic (the layer split: outer
   scale-free chrome/clip boundary + inner transformed content layer; the mask/outline form; radius
   source→target; the clip; the clipped-touch result; degradation). `manifest.ts` — `motion.properties`
   gains `cornerRadius`. Flip the step-1 "Step 2 (chrome) is deferred" lines in both structure docs
   to shipped. `1-surface/50` — note radius+clip is preset-owned, zero new props (border/background
   still future). Promote the radius+clip slice of `anchored-reveal-and-library-shape.md` to
   derivation history (banner update; border/background + FxAnchor + FxFlow + Boundary L stay future).
   Mint the ledger row. Write `reviews/DEF-028.md`.
4. **merge** on `integration/0.1.x` (maintainer tick).

Border + background (color/style handoff) are a **future step 3 DEF row**, spec'd only when a real
consumer needs them.
