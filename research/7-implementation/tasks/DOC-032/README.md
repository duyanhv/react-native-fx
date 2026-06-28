# DOC-032 — Lane 1 architecture promotion

Type: `ratify` + `doc-cleanup` · State: `ready-to-merge` · Device: no · Consumes: — · Closes: —

Promote the durable architecture from the Lane 1 WIP pair into canon without starting an
implementation task. This is a model-setting pass: it decides where source-driven interactions
belong in the architecture, what remains WIP, and what future feature specs must prove.

## Scope

Promote only the architectural slice:

- Lane 1 is a native source-channel mechanism inside Boundary A or Boundary B, not a new boundary.
- Lane 1 uses a fixed native signal grammar: native source → normalized signal → native mapping →
  fx-owned target.
- Lane 1 public direction is preset-first. The lowered descriptor is implementation IR, not an
  authored graph.
- Source-driven interactions have their own signal-event family and must not double-fire the
  discrete transition event for the same motion.

Do not promote implementation mechanics, device claims, or the flow/layout draft. Do not unblock
Lane 2, worklets, Boundary L, cross-tree transitions, or any trigger-gated DEF row.

## Authority links

```
Subtask: Lane 1 architecture promotion (cross-cutting doc ratification)
- Contract anchors:  0-spine/04 (ownership boundaries), 0-spine/05 (boundary mechanism),
                     3-motion/40 (source driver and event contract),
                     1-surface/50 (public surface direction),
                     research/wip/lane1-signal-grammar.md,
                     research/wip/lane1-declarative-surface.md.
- Decision:          fx-original architecture promotion. USE the Lane 1 WIP as derivation;
                     REJECT graph authoring, per-frame JS, layout writes, child reordering,
                     and cross-tree identity as Lane 1.
- Reference (HOW):   none new — docs-only ratification.
- Guides:            Writing Style Guide; subtask protocol.
- Rules gate:        #1 native owns frames; #2 platform-native defaults; #7 no JSI/worklets
                     for Lane 1; #8 semantic events only; #9 read layout, never write it.
- Device-verify:     none for this task. Device proof belongs to the first concrete Lane 1
                     feature.
- Done when:         canonical docs own the boundary invariant, signal grammar, event rule,
                     and preset-first surface direction; WIP files are marked historical.
```

## Canonical changes

- `0-spine/04` owns the Lane 1 boundary invariant.
- `0-spine/05` owns the native signal grammar and Lane 2 ceiling.
- `3-motion/40` owns source-driven signal events and the no-double-envelope rule.
- `1-surface/50` owns the preset-first interaction surface direction.
- `7-implementation/architecture.md §12` records Lane 1 as promoted future architecture.
- `research/wip/lane1-*.md` files are retained as derivation history.

## Open forks left for future specs

- The exact public signal-event prop name.
- The first concrete preset to build.
- Device proof for lifecycle handoff concurrency.
- Whether a feature stays Lane 1 or splits into Boundary L, cross-tree, or Lane 2 work.

## Proof

- headless: N/A — docs-only.
- device: N/A — no runtime behavior changed.
- docs: `git diff --check`; canonical docs and WIP index updated in place.

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (N/A)
- [x] reviewed
- [x] docs-closed
- [x] merged (maintainer-authorized, 2026-06-28 — on integration/0.1.x, this commit)
