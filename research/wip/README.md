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
  against the canonical Lane 1 framework as a **Lane 1, Boundary-B `source` → effect-uniform** case
  (parametric multi-source = additive; height-field simulation = gated regime C). Android-only over
  live content; iOS only over fx-owned content. Enabled by DEF-020 (imperative handle) / DEF-011
  (gesture) / DEF-006 (UI-thread channel); its animation composes through the chaining API in
  `native-animation-api-extraction.md` — so it is **post-v2**. Findings + placement only — no
  decision, no ledger row.
- [`native-slot-layout-transitions.md`](./native-slot-layout-transitions.md) — post-v2/v3
  exploration for native layout-continuity transitions without copying Reanimated's full
  Fabric mutation proxy. Compares a Fabric-aware observer path with a narrower native slot
  container (`FxFlow`/`FxFlow.Slot`). Reconciled to the classifier (see the top-of-doc note):
  `FxFlow` is a flow policy/coordinator over the multi-child `FxGroupView` substrate, not a new
  native view; reserved-size flow is a mechanics proving ground (depth-1 Boundary A) and
  measured-content flow is the headline gate (depth-3 Boundary L). Includes React Native
  renderer/platform findings for commit timing, mutation override, layout application, child
  mounting, prop clobbering, and hit testing. Findings only — no architecture decision.

## Resolution plan

Use this order when you take `wip/` work back into canon. Do not clear the deferred DEF backlog
first. The only prerequisite that matters is the concrete product need or architecture fork named
by each row.

| WIP | Resolution | Canonical owner | Next task shape |
|---|---|---|---|
| [`native-animation-api-extraction.md`](./native-animation-api-extraction.md) | Promote first, after the pending Android/Compose/Material extraction is source-backed. This is the cross-cutting grammar that later feature specs should depend on. Ratify the hybrid timing direction, the `target` → `state` → `clock.phase` → `clock.keyframes` → `source` sequencing, and the rule that raw SwiftUI, UIKit, Compose, and Android class names stay private to lowering. | `0-spine/02`, `3-motion/40`, `3-motion/41`, `4-runtime/34`, `5-realization/structure.{ios,android}.md` | Docs-only ratification. It may spawn later DEF rows for `transition` expansion, `FxView state`, `clock.phase`, `clock.keyframes`, or Lane 1 `source` features only when a consumer exists. |
| [`anchored-reveal-and-library-shape.md`](./anchored-reveal-and-library-shape.md) | Promote only the boundary and surface direction next: `FxAnchor`/`FxReveal` read RN geometry, animate an fx-owned shell/chrome, and stay Boundary A unless outside siblings must reflow. Do not build camera reveal until a product screen needs it. | `0-spine/04`, `0-spine/05`, `1-surface/50`, `3-motion/40`, `5-realization/structure.{ios,android}.md` | Recommendation-pass, then a feature spec if triggered. The first spike is anchor rect → bottom-half panel, non-uniform shell transform, radius/chrome morph, content handoff, and interruption proof. Boundary L stays out. |
| [`interactive-content-distort.md`](./interactive-content-distort.md) | Keep parked as a named post-v2 feature. The additive path is Android parametric ripple over live RN content: native touch/source state maps into content-distort uniforms. The height-field simulation stays Lane 2 / regime C until the Lane 1 falsifying test proves it necessary. | `2-effects/23-filters.md`, `3-motion/40`, `5-realization/structure.android.md`, plus the Lane 1 sections in `0-spine/04` and `0-spine/05` | Trigger-gated DEF only when a real water-ripple consumer exists. Resolve impulse surface, source budget, and decay-envelope home in that spec. iOS live-content ripple remains out-of-scope by rule #4. |
| [`native-slot-layout-transitions.md`](./native-slot-layout-transitions.md) | Keep parked and split the problem. First ratify reserved-size `FxFlow` as a bounded slot island over `FxGroupView`; later run a separate measured-content sizing spike if a product needs outside siblings to reflow. Do not start with arbitrary layout animation or a Fabric mutation proxy. | `0-spine/05`, `4-runtime/33-shadow-nodes-and-layout.md`, `4-runtime/35-view-state.md`, `5-realization/structure.{ios,android}.md` | Two possible future tasks: a reserved-size `FxFlow` recommendation-pass/spec, then a measured-content Boundary L spike. The measured-content spike is the only place to reconsider raw Fabric/shadow-node mechanics. |

Historical WIP files stay retained for derivation history. They need no resolution task unless a
canonical doc still cites stale wording.

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
- [`lane1-signal-grammar.md`](./lane1-signal-grammar.md) and
  [`lane1-declarative-surface.md`](./lane1-declarative-surface.md) — **architecture promoted
  (DOC-032).** The durable Lane 1 contract now lives in `0-spine/04` (boundary invariant),
  `0-spine/05` (native signal grammar), `3-motion/40` (source-driven events), `1-surface/50`
  (preset-first surface direction), and `7-implementation/architecture.md §12`. Retained for
  derivation history, stress tests, and detailed rationale.

Promoted (DOC-009, 2026-06-10): the motion driver-model rethink (`target`/`clock`/`source`,
maintainer-accepted) folded into `0-spine/02`, `3-motion/40`–`42`, `4-runtime/34`, and
`5-realization/structure.{ios,android}.md`; the U6-001 iOS spring preflight moved to
`7-implementation/tasks/U6-001/preflight.md`.
