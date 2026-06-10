# research/wip — work-in-progress exploration

A scratch area for design explorations that are **not yet decided**. Nothing here is
authoritative. The canonical source of truth stays the numbered folders (`0-spine` … `6-ship`)
and the decision ledger; docs in `wip/` carry no weight until a `ratify` task promotes them.

Keep undecided drafts here so they don't pollute the canonical docs. When a direction is
accepted, move/fold it into the owning numbered folder and close it through the normal
ledger process; when it's abandoned, delete it.

## Current

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
