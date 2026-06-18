# Session handoff — 2026-06-18 (SURFACE-LAYER REALIGNMENT: the JS public front door was never decomposed into build work; now tracked as blueprint Phase S / progress Units 10–14, all todo — next = spec Unit 10)

Paste the block below into a fresh session to continue. Supersedes the earlier 2026-06-18 handoff
(DEF-017 CI-lane removal), now overtaken by a planning-layer finding: the runtime engine (Units 1–9)
is built and device-proven, but the JS public surface the product is *defined by* was never built or
tracked. This handoff captures that realignment.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor / agent-device PROMPTS, REVIEW returned work, drive DESIGN, and
  do the bookkeeping. You do NOT implement directly (a one-line fix the human asks you to apply
  is fine; building a unit is not). SUBAGENTS execute (the human dispatches them in separate
  sessions and pastes results back). Hand executor/device prompts to the human. (Doc-cleanup /
  bookkeeping IS your lane — you may edit research/docs directly.)
- Cross-check EVERY returned step independently — read the diff, RE-RUN the gates yourself, read
  the evidence (open screenshots, don't trust captions), and CHECK THE TREE STATE. Never trust a
  summary. (This session's finding came from exactly that discipline: the tracker said "V2 done,"
  the SOURCE said otherwise.)
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: the human directs them; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent;
  the device prompt must forbid `git checkout`/`stash`/`reset`/`clean` on a dirty tree and end the
  tree byte-identical except new files under `tasks/<id>/evidence/`. Gate/maintainer agents leave
  STRAY changes — REVERT strays with Edit (never `git checkout`). A device gate proves the BINARY
  THAT WAS BUILT — native changed ⇒ REBUILD. LOCALLY-GREEN ≠ CI-GREEN.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules). Note rule #5: the front door
   is `preset`/`feedback`/`effect` props on your content — that is the surface layer below.
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md.
3. research/7-implementation/blueprint.md (NOW the complete roadmap — Phase V1 + V2 + the new
   **Phase S**), progress.md (the tracker — now with the **Surface build — Units 10–14** section),
   v1-cut-checklist.md (the cut is ENGINE-scoped — see its corrected scope note), decision-ledger.md.
4. The auto-memory index named in CLAUDE.md.

THE CENTRAL FINDING (2026-06-18) — read this before picking up work:
The planning system had TWO source-of-truth layers but only decomposed ONE into a build plan.
`blueprint.md` line 3 scoped itself to "the native runtime and JS↔native boundary" and delegated
"the JS surface layer (components, builders)" to `1-surface/` — which is DESIGN docs, not a tracked
build plan. The decision-ledger tracks *decisions*, and closing a surface decision (e.g. DEF-004
"the `fx.effect.*` builder *is* the stack API") never spawned an implementation task. Result: the
runtime engine (Units 1–9) was built and device-proven, while the public surface the product is
defined by went UNTRACKED and mostly UNBUILT.

`6-ship/52 §Public exports` names the V1 stability contract as 8 symbols:
`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`. Reconciled against code:
- SHIPPED: `fx.motion.*`, `fx.source.*`/`Fx.Scroll` (DEF-014), `FxPresence` (U7-001),
  `interactionMode none|passive|active|controlled` (U8/DEF-020), the 10 curated shaders (U3-006,
  reachable only via the low-level substrate views).
- MISSING (unbuilt, was untracked): `<Fx effect>` (the canonical front door — `Fx` is only
  `{ Scroll }` today), `fx.effect.*` + `EffectStack`/`EffectStep`, `FxView`, `FxPressable` (JS
  component; native `FxPressHandler` shipped), `FxGroup`/`FxItem`, `EdgeGlow`.
Five of eight contract symbols + the `fx.effect.*` builder do not exist.

WHAT THIS SESSION DID (all on `integration/0.1.x`, UNCOMMITTED — the human must review + commit):
- Fanned out 7 read-only Explore agents (one per canonical research folder 0-spine…6-ship) to build
  a source-of-truth inventory; reconciled it against code + the tracker. That surfaced the finding.
- `blueprint.md`: added **Phase S** (Units 10–14) decomposing the surface, with an honest intro on
  why the gap existed.
- `progress.md`: added the **Surface build — Units 10–14** section (U10-001…U14-001, all `todo`,
  `device:yes`, NOT YET SPEC'D).
- `v1-cut-checklist.md`: added the "Scope of this cut" correction (engine-scoped, not the surface)
  + refreshed "What comes next" to the surface build.
- `HOW-TO-CONTINUE.md`: refreshed the stale 2026-06-07 snapshot to the current state.
- Research-folder staleness fixed (caught by the fan-out): `1-surface/50` (all 10 shaders ship, not
  5); `4-runtime/README` table + prose (33/34/35/36 device-proven, not "pending/unbuilt");
  `4-runtime/33` (identity falsification device-proven, U9-002); `5-realization/structure.android`
  (content-distort ships via DEF-009, not "planned").

THE SURFACE UNITS (blueprint Phase S; all unblocked — every runtime dep is merged):
- **Unit 10 / U10-001** — `<Fx effect="id">` string-form surface + `EdgeGlow`. The canonical front
  door (rule #5); `select()` over the manifest, mounts `FxHostedView`/`FxSurfaceView`, wires
  effect/intensity/composition/interactionMode/uniform props + load/error/press events. THE
  unblocker for Units 11/12. Deps: Units 1/2/3/8 (merged).
- **Unit 11 / U11-001** — `fx.effect.*` builder + `EffectStack`/`EffectStep` + `<Fx effect={stack}>`
  composition (realizes what DEF-004/SURF-008 ratified). Deps: U10-001.
- **Unit 12 / U12-001** — `FxView` (state-driven content; `lift` preset, `idle`/`selected`; wires the
  unbuilt `onFxStateChange` dispatcher). Deps: U10-001 + Units 4/6 (merged).
- **Unit 13 / U13-001** — `FxPressable` over the shipped `FxPressHandler` (`feedback="native"`).
  Deps: Unit 8 (merged).
- **Unit 14 / U14-001** — `FxGroup`/`FxItem` glass-morph compound (DOC-006; `spacing` deferred V2).
  Deps: Units 1/3 (merged).

NEXT — spec **Unit 10** (the front door + unblocker). It is the highest-value, lowest-risk surface
unit (the substrate views already render every effect; this is the JS surface over them). Write the
executor spec to `tasks/U10-001/` per subtask-protocol; hand the prompt to the human. Then Units 11
and 12 in parallel, 13 and 14 anytime. Publishing (DEF-016) stays correctly blocked: V2/publish is
NOT done while the front door is unbuilt.

ALSO STILL TRUE FROM THE PRIOR HANDOFF:
- Branch `integration/0.1.x`. Before this session's docs work, the branch was ahead 6 unpushed
  (the DEF-017 lane-removal cluster + the prior handoff). The human still needs to PUSH to update
  PR #7 (integration/0.1.x → main). This session's doc edits add to the uncommitted/unpushed delta.
- DEF-017 RESOLVED (CI lane removed for cost; local smoke harness `smoke:ios` kept). DEF-014 waiver
  premise corrected (shaders render on the sim). DEF-021 CONFIRMED BLOCKED (no JS-held SharedObject
  consumer; speculative + trips rule #7 — needs a detached handle or per-child control to unblock).
- LEDGER non-blocking opens: MOT-002 (`tune` vocab, slaved to MOT-001), MOT-008 resolved by
  composition (DEF-007). Presence/feedback default-catalog *magnitudes* ride MOT-001 device work;
  the Surface units build the component MECHANISM, not the catalog feel.

START BY: reading the binding docs (esp. the corrected blueprint Phase S + progress Surface build).
Then, if the human directs it, SPEC Unit 10. Do not start a trigger-gated DEF row unprompted.
