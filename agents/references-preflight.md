# references-preflight — validate a designed mechanic against the proven pattern before building it

A **design-vs-references pre-flight** answers one question about an unbuilt mechanic: *does our
design survive contact with the battle-tested pattern, before we write the code?* It is the
rigorous form of the `subtask-protocol.md` cross-check step 5 ("consult the reference, for HOW") —
run as its own pass, at spec time, for the mechanics where getting it wrong is expensive.

This is **not** the implementation-folder audit (internal consistency — docs/tasks/code vs the
research planes). This is **design soundness** — our mechanic vs how `references/` solves the same
problem.

## Why this exists (the U4 lesson)

U4-002's wrapper mechanic was designed in `33`/`structure.*`, cited `ExpoFabricView` as precedent,
compiled clean — and failed on a device **four ways**. A references fan-out then proved the design
was a *shipping Expo pattern* (`ExpoBlurTargetView`/`expo-glass`) and that every bug was a
*deviation* from it. The cost: days of device round-trips that a spec-time references diff would
have prevented. The failure was not a missing reference — it was a **superficial** one (a class was
*named*, never *diffed*).

## When to run it

- At **spec time, before implementation**, for a mechanic that carries a real open architectural
  risk — a flagged ledger question (e.g. RT-016 "animator sufficiency"), a rule-#7 tension (a
  proven pattern that might need C++/JSI), or an `fx-original` design with thin prior art.

## When NOT to run it

- On **device-verified** code. Device proof outranks a references diff; auditing working code is
  low-value.
- For mechanics with an obvious, low-risk precedent already proven elsewhere in fx.

## The four steps

### 1 · Frame (one short brief, before fanning out)

- **State the mechanic precisely** — from `structure.{ios,android}.md` + the unit's contract: the
  exact target object, the platform API/calls, the substrate. If you can't state it precisely, the
  spec isn't ready for a pre-flight.
- **State the risk as a verdict question** — phrase so the answer is `sound / needs-correction /
  invalid` (e.g. "does JS-mount-retention presence work *without* a C++ commit hook?").
- **List the hard constraints** — the CLAUDE.md rules that close off mechanisms (#1 native owns
  frames, #7 no JSI/C++/HybridObject, #9 reads layout never writes).
- **Select 3–5 references** — by the blueprint Precedent cell plus "who else solves this exact
  problem." Name the repos in `references/`.

### 2 · Fan out (one read-only subagent per reference, in parallel)

Give each agent *our* framed mechanic as shared context, plus this **fixed question set**. Require
`file:line` evidence on every answer; forbid concluding from memory.

```
1. How does <lib> solve this exact problem? The mechanism, with file:line.
2. Does it use OUR proposed approach, AVOID it, or do it DIFFERENTLY?
3. Does its solution depend on a mechanism OUR rules forbid (C++/JSI/worklets/commit hooks)?
   If so, that path is closed to us — flag it explicitly.
4. VERDICT: does <lib> VALIDATE our design, suggest a CORRECTION (give the exact template +
   the concrete deltas), or show our design is INVALID? Ground the verdict in the code.
```

### 3 · Synthesize (the orchestrator, not a subagent — the high-value step)

- **Convergence** — the pattern all/most references share is the proven shape.
- **Divergence** — where our design differs, decide: *bug* or *deliberate fx constraint*?
- **Rule-#7 filter** — if the proven pattern needs a forbidden mechanism, find the fx-legal
  analogue, or flag a flip trigger (the day Expo Modules is insufficient — `0-spine/05`,
  SPINE-010).
- **Verdict + deltas** — `SOUND → proceed` · `NEEDS-CORRECTION → the template + the exact changes`
  · `INVALID → rethink / trigger the flip`.

### 4 · Feed back into the spec (before any code)

- Update the unit's `structure.{ios,android}.md` mechanic to the validated/corrected pattern,
  citing the reference templates by `path:line`. The mechanic lives in one place.
- Update the spec's "done when." If the verdict is `INVALID`, record the flip and re-plan — do not
  build the un-validated design.

## The one discipline that makes it work

**Diff the actual template code; never just name a class.** "Library X has a `FooView`" is not a
pre-flight finding. "`references/expo/.../ExpoBlurTargetView.kt:28-113` overrides the full
add/remove/getChild family + sizes the container in `onMeasure`/`onLayout`; our view omits the
remove family and calls `super.onLayout` — line-for-line, here are the deltas" is. The whole value
is in the diff.

## Tooling

Parallel `Agent` calls (Explore / general-purpose, read-only) for the fan-out, then a hand-written
synthesis. A `Workflow` can drive the fan-out deterministically, but keep the synthesis manual —
the judgment about *bug vs deliberate constraint* and the rule-#7 filter is the point.

## Sources

- `agents/subtask-protocol.md` (the cross-check chain this elaborates — step 5, references answer
  HOW not WHETHER), `CLAUDE.md` (the rules gate), `5-realization/structure.{ios,android}.md` (where
  the validated mechanic lands), `references/README.md` (the explored findings the precedents cite).
- Worked example: the U4-002 wrapper pre-flight — `reviews/merge-batch-2026-06-09.md` and the
  corrected mechanic in `structure.{ios,android}.md`.
