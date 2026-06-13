# research/wip — work-in-progress exploration

A scratch area for design explorations that are **not yet decided**. Nothing here is
authoritative. The canonical source of truth stays the numbered folders (`0-spine` … `6-ship`)
and the decision ledger; docs in `wip/` carry no weight until a `ratify` task promotes them.

Keep undecided drafts here so they don't pollute the canonical docs. When a direction is
accepted, move/fold it into the owning numbered folder and close it through the normal
ledger process; when it's abandoned, delete it.

## Current

- [`lane1-declarative-surface.md`](./lane1-declarative-surface.md) — the JS surface for Lane 1
  interactions, deciding how much of the signal graph to expose. Lands on **preset-first with the
  descriptor as lowered IR**, grounded in the shipped `FxPresence` preset/motion/transition idiom:
  three layers — preset surface (`interaction={{ type: "dragDismiss", … }}`), signal descriptor
  (`source → mapping → settle → target`, inspect/tooling only), and an override policy. The
  load-bearing answer: **zero graph authoring** — overrides are typed prop sets per preset (not a
  descriptor patch), tuning leaf values only while the IR's structure, lifecycle target, retention,
  layout participation, and any new semantic state (detents) stay frozen — the last keeping
  `dragDismiss` from becoming a sheet state machine, under an operational guardrail (does it add a
  React-unowned outcome? then it's a new preset / Boundary L / Lane 2, not an override). Also
  resolves where
  `interaction` attaches (the target's owner, not only `FxPresence`), how it coexists with discrete
  `visible` (temporal non-overlap), and that `"self"`/`"platform"` references resolve via fx
  (layout read / native defaults), not authored values. Pins the **lifecycle handoff**: for
  lifecycle-committing presets the interaction settle *becomes* the exit envelope and the following
  discrete prop is an acknowledgement, not a second envelope — extending the presence machine with
  a committed/pending-ack target, releasing retention on the signal `commit` event, treating the
  interaction as a controlled component, and keeping `onFxTransitionEnd` from firing for the same
  motion. Companion to the signal grammar. Findings + surface only — no architecture decision.
- [`lane1-signal-grammar.md`](./lane1-signal-grammar.md) — the native signal grammar for Lane 1
  (additive, depth-1 Boundary A/B; no rule-break). Hard-boxes Lane 1 as a small native
  source → mapping → fx-owned-target grammar, not a general animation language, and makes it
  phase-structured: **track** (always on — `follow` is the spine, not an operator) → **settle**
  (optional release operator). Pieces: `smooth` conditioning (proven by the shipped `pressDepth`
  lerp), stateless track transforms (range-map, curve, deadzone), an `extrapolate`
  (clamp/rubberBand) bounds policy, source-side-only `smooth`, and the fixed stateful settle
  operators (threshold, hysteresis, snap/detent, spring-to, velocity-settle); all state lives in
  the settle phase. Events derive from the lifecycle as one discriminated `onFxSignalEvent`
  (kind: enterRange/exitRange/commit/settle/interrupt) alongside `onFxTransitionEnd`, under a
  non-overlap rule (an owner is discrete-driven or source-driven, never both). Stress-tests ten
  real interactions to fix the
  expressiveness ceiling — where a case routes to Boundary L (sibling reflow), the cross-tree
  frontier (reorder commit), or Lane 2 (authored per-frame math). Companion to the classifier.
  Findings + grammar only — no architecture decision.
- [`capability-boundary-classifier.md`](./capability-boundary-classifier.md) — the architecture
  tool for "expanding the lib": given a proposed native presentation capability, decides whether
  fx can add it inside an existing boundary or must move one. Derives the shared async contract
  and three ownership boundaries (A content-motion, B effect, L layout-participation) bottom-up
  from the shipped primitives, separates the orthogonal source-channel axis (discrete target vs
  native continuous source; per-frame JS rejected), classifies every shipped/provisioned
  primitive, and gives a nine-question classifier plus a memory-policy descriptor. Adds a third
  axis (substrate depth: Expo Modules → component-view shim → custom Fabric component →
  JSI/worklets) and the escalation regimes for crossing a boundary — measured-content flow as the
  Boundary-L write gate, pushed-layout read as a substrate-only optimization, and a two-lane model
  for continuous interaction (native-source = additive; authored worklet mapping = gated regime C)
  with a concrete falsifying test. Companion to the flow draft. Findings + tool only — no
  architecture decision.
- [`native-slot-layout-transitions.md`](./native-slot-layout-transitions.md) — post-v2/v3
  exploration for native layout-continuity transitions without copying Reanimated's full
  Fabric mutation proxy. Compares a Fabric-aware observer path with a narrower native slot
  container (`FxFlow`/`FxFlow.Slot`). Reconciled to the classifier (see the top-of-doc note):
  `FxFlow` is a flow policy/coordinator over the multi-child `FxGroupView` substrate, not a new
  native view; reserved-size flow is a mechanics proving ground (depth-1 Boundary A) and
  measured-content flow is the headline gate (depth-3 Boundary L). Includes React Native
  renderer/platform findings for commit timing, mutation override, layout application, child
  mounting, prop clobbering, and hit testing. Findings only — no architecture decision.
- [`interactive-glass-touch-delivery.md`](./interactive-glass-touch-delivery.md) — spike for
  sweep A2-4: why the hosted interactive-glass press response does not fire. Root-caused on
  device via an A/B build: `.glassEffect(.interactive)` over a `.fill(.clear)` shape never
  installs the system `UIPlatformGlassInteractionView`, so touch reaches SwiftUI but no press
  fires (A2-1's clear-fill and A2-4's press are in direct conflict on the SwiftUI rung). Also
  answers the `01`/SPINE-012 "self-gesturing inside a scroller" question: press and scroll
  coexist except drags that start on the glass (captured by it). Recommends moving the rung to
  `UIVisualEffectView` + `UIGlassEffect`. Findings + direction only — no fix landed.

Promoted (DOC-009, 2026-06-10): the motion driver-model rethink (`target`/`clock`/`source`,
maintainer-accepted) folded into `0-spine/02`, `3-motion/40`–`42`, `4-runtime/34`, and
`5-realization/structure.{ios,android}.md`; the U6-001 iOS spring preflight moved to
`7-implementation/tasks/U6-001/preflight.md`.
