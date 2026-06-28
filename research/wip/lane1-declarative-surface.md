# Lane 1 — declarative surface (preset, descriptor, override)

Status: historical — architecture promoted to canon (DOC-032); non-authoritative
Phase: additive (depth-1 Boundary A/B; no rule-break)
Feeds: `lane1-signal-grammar.md`, `0-spine/04`/`05` (capability-boundary taxonomy; `capability-boundary-classifier.md` historical), `0-spine/02-capability-ir-and-lowering.md`, `5-realization/structure.{ios,android}.md`
Scope: decide the JS surface a developer authors for a Lane 1 interaction — how much of the `source → mapping → settle → target` graph is exposed before the API stops feeling declarative and starts feeling like worklet programming without worklets.

> **Promoted (DOC-032, 2026-06-28).** The canonical surface direction now lives in
> `1-surface/50 §Lane 1 interaction surface direction`, with the event handoff in
> `3-motion/40 §Source-driven interaction events` and the mechanism in `0-spine/05`.
> This WIP remains derivation history and detailed rationale. Cite the canonical docs.

## The question

The signal grammar (`lane1-signal-grammar.md`) defines *what native pieces exist*. This note
decides *what a developer writes*. The whole risk lives in one question:

> How much graph do we expose before the API stops feeling declarative and starts feeling like
> assembling signal plumbing?

A graph-first surface — hand-author `{ source, map: [...], settle, target }` — is maximally
expressive and is exactly the native-flavored Reanimated clone fx must not become. A preset-first
surface — pick an interaction shape, tune a few named parameters — keeps the law: **platform-
agnostic names, platform-native defaults.** Developers should choose an *interaction*, not
assemble plumbing, unless they have genuinely outgrown Lane 1 (at which point the honest answer is
Lane 2, not a deeper graph API).

## The decision: preset-first, descriptor as lowered IR

This is not a new pattern — it is the one the library already ships. `FxPresence` exposes exactly
three layers today: `preset` (`'transient'`), `motion` (an explicit per-phase shape override), and
`transition` (an expert spring). Lane 1's surface is the same shape applied to source-driven
interaction:

1. **Preset surface** — the front door most developers touch: an agnostic interaction name plus a
   few named parameters.
2. **Signal descriptor** — the lowered IR (`source → mapping → settle → target`) a preset compiles
   to; stable enough for native implementation, exposed for inspection and tooling, *not* the
   authoring front door.
3. **Override policy** — which descriptor fields a developer may patch without turning Lane 1 into
   authored logic.

## Layer 1 — preset surface

The front door. An agnostic interaction name with platform-native defaults; the developer chooses
a *shape*, not a graph.

```tsx
<FxPresence
  visible={open}
  interaction={{
    type: "dragDismiss",
    axis: "y",
    distance: "self",        // normalize against the wrapper's own measured size
    detents: ["open", "dismissed"],
    rubberBand: true,
  }}
  onFxSignalEvent={handleBoundary}
/>
```

The preset vocabulary, and what each binds to:

| preset | source | target / owner | commits to a lifecycle? |
|---|---|---|---|
| `dragDismiss` | pan | transform on the `FxPresence` wrapper (A) | yes — commit → `visible: false` |
| `pullReveal` | overscroll / drag | transform on a reserved wrapper or `FxFlow` slot (A) | optional — commit → revealed |
| `scrollCollapse` | scroll | transform/opacity on a header wrapper (A) | no (visual); the reflow variant is Boundary L |
| `swipeActions` | pan | transform on a row wrapper (A) | commit → action trigger (an event; the action is app-owned) |
| `tilt` | device motion | transform (A) or effect uniform (B) | no |
| `overscrollGlow` | overscroll | edge-glow intensity (B) | no |

**`interaction` attaches to whatever owns the target — not only `FxPresence`.** Interactions that
*commit to a lifecycle* (`dragDismiss`, `pullReveal`) live on `FxPresence` or an `FxFlow` slot.
Interactions that are *pure continuous mapping* (`scrollCollapse` visual, `tilt`, `overscrollGlow`)
bind to a content-motion or effect target with no presence at all. The target decides the host.

## How `interaction` coexists with discrete targets

`FxPresence` has both a discrete `visible` target and a source-driven `interaction`. That does not
violate the non-overlap rule from `lane1-signal-grammar.md`, because the rule is **temporal**: an
`interaction` is an *alternate source-driven driver* of a target the component already owns
discretely, and at any instant exactly one driver runs.

- The user drags → the interaction drives (track → settle → commit), emitting `onFxSignalEvent`.
- `visible` changes programmatically with no active gesture → the discrete envelope drives,
  emitting `onFxTransitionEnd`.

Gesture-driven *or* programmatic, never both at once. The interaction is the source-driven way to
reach the same lifecycle target — it does not add a second simultaneous motion.

## The lifecycle handoff

For any interaction that commits to a lifecycle edge (`dragDismiss`, `pullReveal`):

> The interaction owns the motion through the committed lifecycle edge. The discrete prop update
> that follows is an *acknowledgement* of the committed target, not a request to start a second
> envelope.

The drag *is* the transition. Native must not settle to dismissed, emit commit, and then have JS
set `visible: false` and run a *second* `FxPresence` exit envelope — that double-animates, emits
conflicting events, and makes drag-dismiss feel like a gesture-fired button press rather than an
interactive transition. The sequence:

1. Gesture starts → `FxPresence` enters source-driven mode.
2. Track phase moves the existing presence wrapper (the same Fabric-invisible layer the discrete
   envelope animates).
3. Release → settle phase.
4. If settle resolves to the dismissed detent, **that settle is the exit envelope** — there is no
   separate one.
5. Native emits `onFxSignalEvent({ kind: "commit", target: "hidden" })` and releases retention
   through the presence machine once the source-driven exit completes.
6. JS updates its bound state to `false` in response.
7. When React later sends `visible={false}`, native recognises it as the already-realised
   committed target and treats it as acknowledgement — no new animation.

**What the presence machine needs.** Today it releases retention on the exit-completion event
(`onFxTransitionEnd`). The handoff adds a *committed / pending-ack target*: the discrete prop stays
the source of truth, but it may arrive *after* native has already completed the source-driven
transition. So:

- native sets the committed target **only when settle reaches the lifecycle detent** (never on
  settle start) — an `interrupt` before completion leaves no pending ack and does not release
  retention;
- retention releases through the same machine, but driven by the signal `commit` event rather than
  by `onFxTransitionEnd` (a new completion entry, not a new machine);
- the arriving discrete prop, when it matches the committed target, is an ack that clears the
  pending state with no motion.

**`commit` vs `settle`.** The ack machinery fires only on a true lifecycle crossing. Settle to the
*current* (non-lifecycle) detent — a drag released below `commitAt` that springs back to open — is
`kind: "settle"`: no lifecycle change, no ack, no discrete update. `kind: "commit"` fires only when
settle resolves to a detent that *changes* the discrete target.

**A lifecycle-committing interaction is controlled.** Exactly like a controlled `<TextInput>`, the
app must reflect the commit in its bound state (`open → false`) on `onFxSignalEvent`. If it does
not, native and JS desync — but the failure is recoverable: retention release does not unmount, so
React still owns the tree; if the app keeps `visible` true, the children stay mounted and native
re-enters. Ignoring commit is the same class of bug as ignoring `onChangeText`, with a snap-back
rather than a crash.

**Event separation falls out cleanly:**

- `onFxSignalEvent` (`commit` / `settle`) describes the source-driven interaction result.
- `onFxTransitionEnd` does **not** fire for that same motion.
- If `visible` later changes to a *different* target (a programmatic open/close with no gesture),
  the discrete envelope runs and `onFxTransitionEnd` applies again — the two never describe the
  same motion.

**Concurrency — a discrete change during an active gesture.** The active source driver wins
(temporal non-overlap). A `visible` change that arrives mid-gesture is deferred and reconciled at
settle: if the settle realises that target, the change is an ack; if the settle resolves the other
way, the deferred discrete target runs as an uncontested discrete transition *after* the gesture
ends. The precise mechanics across interrupt, re-grab, and rapid toggle need device proof — this
is the one corner of the handoff that is reasoned, not yet validated.

## Layer 2 — signal descriptor (lowered IR)

What a preset compiles to. Stable for native implementation, and exposable for inspection and
tooling — but it is the *lowered* form, not the front door. The `dragDismiss` preset above lowers
to:

```jsonc
{
  "source": { "type": "pan", "axis": "y" },
  "map": [
    { "type": "smooth", "timeConstant": "platform" },     // source-side conditioning, optional
    { "type": "range", "input": [0, "self"], "output": [0, 1], "extrapolate": "rubberBand" },
    { "type": "curve", "name": "platform" }
  ],
  "settle": {
    "type": "detent", "points": [0, 1],
    "velocity": "platform", "spring": "platform", "commitAt": 1
  },
  "target": { "property": "translateY", "output": [0, "self"] }
}
```

Two IR conventions make this honest rather than redundant:

- **The `map` normalizes to a `[0, 1]` progress; the `target` denormalizes** to the property's
  units. The middle of the pipeline is source-agnostic — detents, curve, commit, and events all
  reason in progress space — and only the target knows the property. That is why `input` and
  `target.output` can both be `"self"` without being circular: progress 0..1 means closed..
  dismissed, and the target re-expands it to translation.
- **`"self"`, `"platform"`, and named detents resolve natively, not from authored values.**
  `distance: "self"` resolves via an fx **layout read** of the wrapper (a Boundary-A read, never a
  write); `"platform"` resolves to the OS-native curve/spring/time-constant. The descriptor stays
  declarative because its references are resolved by fx, not computed by the developer.

The `map` is a **fixed pipeline per preset**, not a user-assembled array. Its presence in the IR
is for native lowering and inspection — seeing it is allowed; authoring it is not.

## Layer 3 — override policy

This layer decides the whole question, and it should be deliberately boring. Overrides are **typed
prop sets per preset, not a generic descriptor patch.** A validated descriptor patch would still
teach the developer that the descriptor is an authoring object — even if validation rejects
structure edits, the mental model becomes "I patch the IR," which undermines the
zero-graph-authoring rule. Typed preset props keep the surface semantic and let TypeScript carry
most of the boundary: an illegal override does not compile. This also matches the shipped
`FxPresence`, whose overrides are typed props (`preset`, `motion`, `transition`), not a descriptor.

The `interaction` prop is a discriminated union keyed by `type`; each preset owns its interface.
For `dragDismiss`:

```ts
type DragDismissInteraction = {
  type: "dragDismiss";
  direction?: "positive" | "negative" | "both";
  distance?: "self" | number;       // "self" resolves via an fx layout read
  commitAt?: number;                // fraction of distance
  rubberBand?: boolean;             // extrapolate: rubberBand vs clamp
  velocity?: "platform" | number;
  spring?: "platform" | FxSpringConfig;
  disabled?: boolean;
};
```

The per-preset interface is a small cost that buys compile-time enforcement, and the typed props
being deliberately *less* expressive than the descriptor is the guardrail, not a limitation:
**anything you cannot say here is something Lane 1 does not let you do.**

**The frozen IR.** Everything in the lowered descriptor except the leaf parameter *values* is
frozen. An override sets a leaf value; it never touches structure or semantics:

| may tune (leaf values) | may not touch (frozen IR) |
|---|---|
| thresholds (`commitAt`), distances (`distance`) | source *type* (pan stays pan) |
| bounds behaviour (`rubberBand`) | target property (`translateY` is intrinsic) |
| platform spring / velocity parameters | pipeline node set or order |
| enabled directions (`direction`), `disabled` | event kinds, lifecycle target, retention, layout participation |

On the source line: you may *configure* the source (`direction`, and `axis` if a preset chooses to
expose it) but not change its *type*. Configuration that adds no new semantic state is a tune;
changing pan→scroll is a different preset. (`axis` is left out of the first-cut `dragDismiss` set —
kept preset-fixed until a case wants horizontal dismissal.)

**Detents stay preset-owned.** This is the sharp edge. For a lifecycle-committing preset, a detent
is exposable only if it maps to a state React *already owns*. `dragDismiss` commits between open
and dismissed — both are `visible` (boolean), which React owns. A third "rest"/"half" detent is a
*new semantic state* React does not own as `visible`; exposing it would let `dragDismiss` quietly
become a sheet state machine. So detents are not in the `dragDismiss` override set. An interaction
that needs exposed detents (`swipeActions`, a future sheet preset with a `position` lifecycle
target) is a *different preset*, because the new state needs a React-owned target of its own.

**The guardrail, operational.** The test for "valid override vs not an override":

> Does the change add a *committable outcome* or *persistent state* that React does not already own
> through an existing discrete target?

- **No** — it only tunes how, when, or how far an existing outcome happens → **override**.
- **Yes** — it introduces a new state or outcome → **not an override**: a new preset (if React can
  own the new state), a Boundary L question (if it moves layout), or a Lane 2 question (if it needs
  authored per-frame logic).

That last line is the guardrail that keeps `dragDismiss` from accreting into a sheet state machine
one "harmless" prop at a time.

## The answer to the question

How much graph do we expose? **Zero graph authoring.** A developer picks an interaction shape and
patches a flat, named, bounded parameter set. The `source → mapping → settle → target` descriptor
exists as lowered IR — readable for tooling, stable for native — but it is never the surface you
build by hand. That keeps Lane 1 declarative and preset-first, matches the shipped `FxPresence`
preset/motion/transition idiom, and honors the law: agnostic interaction names, platform-native
defaults, with override reserved for tuning, not for plumbing.

## Open questions

- Is the preset list (`dragDismiss`, `pullReveal`, `scrollCollapse`, `swipeActions`, `tilt`,
  `overscrollGlow`) the right first set, and which ship first? `dragDismiss` and `scrollCollapse`
  exercise both the commit-to-lifecycle and the pure-mapping paths.
- What is the exact override allow-list per preset — and is it expressed as a typed prop set
  (compile-time bounded) or a validated descriptor patch (runtime bounded)?
- Does exposing the lowered descriptor for inspection risk it becoming a de facto authoring
  surface? If so, is it inspect-only (a devtools read) rather than a prop?
- Where do interactions that bind to an effect target (`tilt`, `overscrollGlow`) attach when there
  is no `FxPresence` — a plain content-motion wrapper, the effect-bearing view, or a dedicated
  motion primitive?
- The handoff concurrency corner needs device proof: when a programmatic `visible` change lands
  mid-gesture, does deferring it to settle (ack if realised, uncontested discrete transition
  otherwise) behave correctly across interrupt, re-grab, and rapid open/close?
- Is a lifecycle-committing interaction *always* controlled, or is there an uncontrolled variant
  where fx holds the committed state — and if so, how does it reconcile with a React re-render that
  contradicts it?

## Sources

- `lane1-signal-grammar.md` — the native pieces this surface lowers to (track/settle phases,
  conditioning, transforms, bounds policy, settle operators, the `onFxSignalEvent` contract).
- `0-spine/05` — canonical: Lane 1 vs Lane 2; the rule that authored per-frame math is
  Lane 2, which is what the override policy enforces at the surface. (`capability-boundary-classifier.md`
  is the historical derivation.)
- `packages/src/surface/FxPresence.tsx` — the shipped `preset` / `motion` / `transition` three-layer
  idiom this surface mirrors, and the host for lifecycle-committing interactions.
- `0-spine/02-capability-ir-and-lowering.md` — the manifest spine: agnostic surface lowering to a
  platform-realized IR, which is exactly the preset → descriptor relationship here.
