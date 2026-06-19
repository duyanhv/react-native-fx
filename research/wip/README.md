# research/wip — work-in-progress exploration

A scratch area for design explorations that are **not yet decided**. Nothing here is
authoritative. The canonical source of truth stays the numbered folders (`0-spine` … `6-ship`)
and the decision ledger; docs in `wip/` carry no weight until a `ratify` task promotes them.

Keep undecided drafts here so they don't pollute the canonical docs. When a direction is
accepted, move/fold it into the owning numbered folder and close it through the normal
ledger process; when it's abandoned, delete it.

## Current

- [`native-animation-api-extraction.md`](./native-animation-api-extraction.md) — post-v2
  exploration for extracting native animation concepts and concrete APIs from SwiftUI and Android.
  Frames the research as two tables — concept extraction and native API extraction — then compares
  two directions: platform-first surfaces with a universal layer above them, or a combined fx
  vocabulary first. The provisional answer is hybrid: combined defaults, platform-specific expert
  timing blocks, and raw native framework APIs private to the resolver.
- [`anchored-reveal-and-library-shape.md`](./anchored-reveal-and-library-shape.md) — post-v2
  exploration for a camera-style anchored reveal: read an RN/Yoga anchor rect, animate an fx-owned
  shell and chrome into a target panel, and keep the feature Boundary A unless outside siblings
  must reflow. Also frames the library shape as value builders (`fx.effect.*`, `fx.motion.*`,
  `transition`), native wrappers (`Fx`, `FxPresence`, `FxView`), and geometry orchestration
  (`FxAnchor`, `FxReveal`, future `FxFlow`).
- [`interactive-content-distort.md`](./interactive-content-distort.md) — a named **feature**
  exploration (water-ripple): make DEF-009's stateless Android content-distort *interactive* — a
  ripple that follows touch, and an `(x,y)` impulse like a rock dropped in water. Classified
  against the frameworks above as a **Lane 1, Boundary-B `source` → effect-uniform** case
  (parametric multi-source = additive; height-field simulation = gated regime C). Android-only over
  live content; iOS only over fx-owned content. Enabled by DEF-020 (imperative handle) / DEF-011
  (gesture) / DEF-006 (UI-thread channel); its animation composes through the chaining API in
  `native-animation-api-extraction.md` — so it is **post-v2**. Findings + placement only — no
  decision, no ledger row.
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
- [`native-slot-layout-transitions.md`](./native-slot-layout-transitions.md) — post-v2/v3
  exploration for native layout-continuity transitions without copying Reanimated's full
  Fabric mutation proxy. Compares a Fabric-aware observer path with a narrower native slot
  container (`FxFlow`/`FxFlow.Slot`). Reconciled to the classifier (see the top-of-doc note):
  `FxFlow` is a flow policy/coordinator over the multi-child `FxGroupView` substrate, not a new
  native view; reserved-size flow is a mechanics proving ground (depth-1 Boundary A) and
  measured-content flow is the headline gate (depth-3 Boundary L). Includes React Native
  renderer/platform findings for commit timing, mutation override, layout application, child
  mounting, prop clobbering, and hit testing. Findings only — no architecture decision.
## Retired / historical (not active explorations — kept for derivation history)

- [`capability-boundary-classifier.md`](./capability-boundary-classifier.md) — **promoted to canon
  (DOC-026).** The A/B/L boundary taxonomy, the source-channel + substrate-depth axes, the
  escalation regimes, the two-lane model, the sorting rule, and the nine-question gate now live in
  `0-spine/04 §The presentation boundaries (A / B / L)` and `0-spine/05 §Capability mechanism`.
  Retained for derivation history (the bottom-up shipped-primitive table, the descriptor schema,
  and the stress cases were not promoted). Cite `04`/`05`.
- [`interactive-glass-touch-delivery.md`](./interactive-glass-touch-delivery.md) — **retired
  (DOC-030).** The sweep-A2-4 device spike behind the interactive-glass rung: `.glassEffect(.interactive)`
  over a `.fill(.clear)` shape never installs the system `UIPlatformGlassInteractionView`, so no
  press fires. Findings + the UIKit-rung fix direction (`UIVisualEffectView` + `UIGlassEffect`)
  folded into `5-realization/structure.ios.md` §material and `0-spine/01` (decision 6) by the
  U3-002 rework. Retained as the device-spike evidence record those docs cite.
- [`critique-2026-06-10.md`](./critique-2026-06-10.md) — **retired (DOC-030).** The 2026-06-10
  architecture / API / adoption critique; every finding dispositioned into task rows (its §Triage),
  the live typed-config / palette thread now in U15-001 / U3-009 / DOC-029. Retained as the
  evidence record; dispositions tracked in `7-implementation/progress.md`.

Promoted (DOC-009, 2026-06-10): the motion driver-model rethink (`target`/`clock`/`source`,
maintainer-accepted) folded into `0-spine/02`, `3-motion/40`–`42`, `4-runtime/34`, and
`5-realization/structure.{ios,android}.md`; the U6-001 iOS spring preflight moved to
`7-implementation/tasks/U6-001/preflight.md`.
