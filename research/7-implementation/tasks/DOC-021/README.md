# DOC-021 — Post-V2 expansion vocabulary: the scoped-medium ratification

0-spine + 3-motion + 4-runtime · type: `ratify` · state: `spec'd` · device: no
Consumes: — · Refines: MOT-006 · Gates: MOT-007 · Opens: new rows (ids at execution) · Blocked by: human final read of the three promoted WIP docs

> Promotes the **scoped-medium** slice of the post-V2 "expand the lib" exploration into the
> canonical docs + ledger: the **capability-boundary classifier** (vocabulary + guardrail) and
> the **Lane 1 contract** (the native-source interaction path), while explicitly leaving the
> flow draft and the unvalidated Lane 1 *mechanics* as WIP / device-pending.
>
> This ratify makes the **guardrail** official — Boundary A/B/L, the substrate-depth axis, the
> source-channel axis, and the regime-C falsifying-test gate — because Lane 1 being specified
> turns "regime C, maybe worklets later" (`MOT-007`) into a gated decision. Ratifying the
> classifier alone would leave that gate pointing at non-authoritative docs.

## Why scoped-medium (not small, not the flow draft)

Small-ratify (classifier only) would make the regime-C *gate* official while its definition
dangles in WIP. Defer would undersell what the exploration did — it converted "regime C, maybe
worklets" into a gated decision. So medium. But the two halves differ in epistemic status: the
**classifier is descriptive** (a faithful reading of shipped code + the rules — low risk), while
the **Lane 1 contract is forward design** with one explicitly-unvalidated corner (the handoff
concurrency case) and open mechanics. So this ratify promotes the **contract and guardrail**, and
carries the mechanics as **device-pending obligations** — it does not canonize them. The flow
draft stays WIP until the depth-3 spike has evidence.

## The decisions this records

1. **The capability-boundary classifier becomes canonical vocabulary.** Boundary **A**
   (content motion) / **B** (effect) / **L** (layout participation); the substrate-depth axis
   (1 Expo Modules → 2 component-view shim → 3 custom Fabric component → 4 JSI/worklets); the
   source-channel axis (discrete / native-continuous / authored-continuous-gated /
   per-frame-bridge-rejected); the sorting rule and the nine-question classifier.
   → `0-spine/02` (vocabulary), `0-spine/04` (ownership/boundaries — the A/B/L home),
   `0-spine/05` (the regime-C gate + the depth axis).
2. **The Lane 1 contract refines the `source` driver (`MOT-006`).** The track→settle phase
   model; the **candidate operator inventory** — its categories and current set, promoted as
   design policy, *not* a closedness or sufficiency claim (`smooth` source-side,
   `range-map`/`curve`/`deadzone`, `extrapolate` clamp/rubberBand,
   `threshold`/`hysteresis`/`snap`/`spring-to`/`velocity-settle`);
   the preset-first declarative surface (preset → descriptor IR → typed override allow-list); the
   `onFxTransitionEnd` / `onFxSignalEvent` non-overlap event split; and the lifecycle-handoff
   *rule* (the interaction settle becomes the exit; the later discrete prop is an
   acknowledgement, not a second envelope). → `3-motion/40` (reactivity — where `source` lives),
   `3-motion/41` (vocabulary), `3-motion/42` (presence + the handoff), `4-runtime/34` (the
   driver), `4-runtime/35` (view-state — the presence-machine committed/pending-ack extension).
3. **`MOT-007` (regime C) gets a concrete gate.** Its trigger is now the Lane 1 falsifying test:
   an interaction is regime C only if it fails "native source + native presets + no per-frame JS"
   *and* needs authored per-frame mapping of fx-owned state. Wording update; status stays
   `deferred`.

## What stays WIP / device-pending (the carve-out)

- **The flow draft is NOT promoted.** Reserved-size flow is a depth-1 Boundary-A proving ground;
  measured-content flow is the depth-3 Boundary-L product gate (related to `SPINE-010`,
  per-child / re-evaluate-boundary). It stays WIP until the depth-3 spike has device evidence.
- **The Lane 1 mechanics are recorded as pending, and they are not all the same kind of
  pending.** The ratified grammar promotes the operator *categories and current candidate set* as
  design policy; it does not claim the set is closed or sufficient. The three obligations split:
  - **handoff concurrency** (programmatic `visible` mid-gesture / interrupt / re-grab / rapid
    toggle) → **device** (`device-pending`; a device scenario proves it).
  - **operator-inventory sufficiency against the first presets** → **device + API** (a device
    check proves the first presets work; whether the set *suffices* is an API/design call —
    device cannot prove a set is closed). Ledger `open`, closing on device proof of the first
    presets *plus* an API review.
  - **per-preset override interfaces beyond `dragDismiss`** → **design/API** (`open`; no device
    needed — closes when the interfaces are designed and reviewed).

## Ledger changes (executed at `docs-closed`, after the human read)

- **Open** a `0-spine` row, `resolved` on record (descriptive): the capability-boundary taxonomy
  + sorting rule. (id assigned at execution.)
- **Open** `3-motion`/`4-runtime` rows for the Lane 1 mechanics carved out above, each
  `Refines: MOT-006`, with the status matching the kind of pending: handoff concurrency
  `device-pending`; operator-inventory sufficiency `open` (closes on first-preset device proof +
  API review); per-preset override interfaces `open` (design/API).
- **Update** `MOT-007` wording to name the falsifying-test gate; status stays `deferred`.
- No row is flipped to `resolved` for any device-pending mechanic — the cardinal closure rule
  binds: a mechanic closes only on device proof, in its source doc.

## The post-ratify early de-risker (NOT a build unit)

A cheap **`updateLayoutMetrics` / component-view-shim feasibility spike** is worth running right
after the ratify: it informs both the depth-2 pushed-layout read and the depth-3 Boundary-L path.
Noted here as a de-risker only — it is **not** registered as a build unit, because the post-V2
continue-plan (blueprint units) is deliberately deferred until this ratify lands, so units cite
canonical vocabulary, not WIP terms.

## Start here

1. **This file** — the work order, the promotion map, and the carve-out.
2. **The content being promoted** — `research/wip/capability-boundary-classifier.md`,
   `lane1-signal-grammar.md`, `lane1-declarative-surface.md`; the **not-promoted**
   `native-slot-layout-transitions.md`; index in `research/wip/README.md`.
3. **`research/7-implementation/subtask-protocol.md`** — lifecycle + the cardinal closure rule.
4. **`research/7-implementation/tasks/DOC-021/notes.md`** — current handoff.
5. **Per-gate guides:** `docs-closed` → `guides/Writing Style Guide.md`; `reviewed`/`merged` →
   `guides/Contributing Guide.md`; all gates → `agents/session-protocol.md`.

## Authority links

```
Subtask: post-V2 expansion vocabulary — scoped-medium ratification (no blueprint unit — cross-cutting)
- Contract anchors:  0-spine/02 (capability IR/lowering — the vocabulary authority),
                     0-spine/04 (state ownership & boundaries — the A/B/L home),
                     0-spine/05 (the boundary decision — regime C, the depth axis),
                     3-motion/40 (motion reactivity — where the `source` driver lives, MOT-006),
                     3-motion/41 (motion vocabulary — the Lane 1 grammar + preset surface),
                     3-motion/42 (presence & lifecycle — the handoff rule),
                     4-runtime/34 (animation driver), 4-runtime/35 (view-state — presence machine),
                     research/wip/{capability-boundary-classifier,lane1-signal-grammar,
                     lane1-declarative-surface}.md (the accepted exploration being promoted)
- Decision:          fx-original (the boundary classifier + the Lane 1 grammar/surface),
                     REFINING the ratified `source` driver (MOT-006). USE the platform-native
                     settle engines per the law; REJECT a graph-first authoring surface and any
                     per-frame-JS / authored-worklet path in Lane 1 (that is MOT-007 / regime C,
                     gated by the falsifying test).
- Reference (HOW):   none new — this is a doc/ledger promotion; the mechanics' references are the
                     future implement-unit concern. Lane 1's lineage: MOT-006 / DOC-009.
- Guides:            Writing Style Guide (the doc edits), Contributing Guide (merge bar),
                     subtask protocol (lifecycle + closure).
- Rules gate:        #1 (native owns frames — Lane 1 is native-source, zero per-frame JS),
                     #2 (the law — agnostic preset names, platform-native settle defaults),
                     #7 (Expo Modules; Lane 1 is depth-1, no JSI; regime C / depth-4 stays gated),
                     #8 (discrete targets + semantic events; onFxSignalEvent is not a frame stream),
                     #9 (Lane 1 is Boundary A/B, never writes layout — Boundary L is the carved gate).
- Device-verify:     none for THIS task (docs/ledger only). It CREATES a device-pending obligation
                     (the handoff concurrency corner) and open design/API obligations
                     (operator-inventory sufficiency — device + API review; per-preset override
                     interfaces — design/API); it does not discharge them.
- Done when:         the classifier vocabulary + the Lane 1 contract/guardrail are recorded in the
                     cited 0-spine / 3-motion / 4-runtime docs; the new ledger rows exist
                     (taxonomy resolved; mechanics device-pending); MOT-007 names the
                     falsifying-test gate; the flow draft and the Lane 1 mechanics remain
                     WIP / device-pending; reviewed + merged.
```

## Proof

```
Proof:
- headless: N/A — docs / ledger only.
- device:   N/A for this task — it OPENS device-pending rows, it does not close them.
- docs:     0-spine/02, /04, /05; 3-motion/40, /41, /42; 4-runtime/34, /35; decision-ledger.md
            (new taxonomy row resolved; new Lane 1 mechanics rows device-pending; MOT-007 wording).
```

## Lifecycle

```
[x] spec'd
[ ] rules-gated     gate against #1/#2/#7/#8/#9 before promoting — Lane 1 must stay depth-1 / Boundary A-B
[ ] docs-closed     the dominant gate: canonical docs record the language; ledger rows exist
[ ] reviewed
[ ] merged
```

No implement / commented / headless / device boxes — this is a docs-only `ratify`.

Blocked by: the human's final read of the three promoted WIP docs (classifier + the two Lane 1 docs) before promotion; the flow draft stays WIP.
Next: human read → execute the promotion + ledger changes (then register DOC-021 in `progress.md`).
