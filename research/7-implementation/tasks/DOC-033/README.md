# DOC-033 — WIP resolution plan

Type: `doc-cleanup` · State: `ready-to-merge` · Device: no · Consumes: — · Closes: —

Record how the remaining current WIP explorations should resolve without starting feature work.
This is a queue-shaping pass, not a promotion pass: it tells the next session which WIP doc to
promote, which ones stay parked, and which ones become trigger-gated DEF specs only after a real
consumer appears.

## Scope

Lay out the resolution plan for the four current WIP explorations:

- `native-animation-api-extraction.md`
- `anchored-reveal-and-library-shape.md`
- `interactive-content-distort.md`
- `native-slot-layout-transitions.md`

Keep historical WIP records retained as derivation history. Do not delete files, spawn feature
DEF rows, or run implementation work.

## Authority links

```
Subtask: WIP resolution plan
- Contract anchors:  research/wip/README.md,
                     7-implementation/HOW-TO-CONTINUE.md,
                     7-implementation/v2-capability-baseline.md,
                     7-implementation/progress.md.
- Decision:          do not resolve the DEF backlog first. WIP promotion is product-value-driven
                     and architecture-fork-driven. The current order is:
                     native animation grammar, anchored reveal, interactive content-distort,
                     then native slot layout transitions.
- Reference (HOW):   none new — docs-only planning.
- Guides:            Writing Style Guide; session protocol.
- Rules gate:        #1 native owns frames; #2 platform-native defaults; #4 no iOS RN-content
                     sampling; #7 Expo Modules/Fabric default; #8 semantic events only;
                     #9 read layout, never write it unless a Boundary L task proves the need.
- Device-verify:     none for this task. Device proof belongs to future feature specs.
- Done when:         WIP index carries the per-file resolution plan; handoff docs say the
                     cleanup session is wrapped and no feature is queued.
```

## Resolution order

1. Promote `native-animation-api-extraction.md` first, after the pending Android/Compose/Material
   extraction is source-backed. This becomes the shared grammar for target timing, state, phase,
   keyframes, and Lane 1 source interactions.
2. Promote the boundary and surface direction from `anchored-reveal-and-library-shape.md` only when
   a concrete anchored reveal use case appears. The implementation path stays Boundary A unless
   outside siblings must reflow.
3. Keep `interactive-content-distort.md` parked until a water-ripple consumer appears. The
   additive path is Android parametric ripple over live RN content; simulation is Lane 2 / regime C.
4. Keep `native-slot-layout-transitions.md` parked and split it into reserved-size `FxFlow` first,
   measured-content Boundary L later. Do not start with arbitrary layout animation or a Fabric
   mutation proxy.

## Non-goals

- Do not resolve every deferred DEF before promoting WIP.
- Do not start publishing, package rename, or skills polish.
- Do not build `FxReveal`, interactive ripple, or `FxFlow`.
- Do not promote raw platform API names into public JS.
- Do not claim device proof.

## Canonical changes

- `research/wip/README.md` owns the current per-file resolution plan.
- `v2-capability-baseline.md` points future work at the WIP plan and preserves the
  recommendation-pass-before-spec rule.
- `HOW-TO-CONTINUE.md` says the cleanup session is wrapped and no feature is queued.
- `progress.md` records this task as a completed docs-only planning pass.

## Proof

- headless: N/A — docs-only.
- device: N/A — no runtime behavior changed.
- docs: `git diff --check`.

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
