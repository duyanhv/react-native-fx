# Session handoff — 2026-06-18 (PLANNING-LAYER ALIGNMENT AUDIT + housekeeping: a full three-way audit (research planes × architecture/blueprint × wip) hunted the same untracked-deliverable class that produced Phase S. Remediation tracked as DOC-023…DOC-030 + spawned implementer rows. DOC-023/024/025 + the row registration are MERGED; DOC-026…030 are queued planner housekeeping.)

Paste the block below into a fresh session to continue. Supersedes the earlier 2026-06-18 handoffs
(DEF-017 lane removal → Phase S surface realignment → this alignment audit). State of the world: the
runtime engine (Units 1–9) is built and device-proven; the JS public surface is decomposed but
unbuilt (Phase S, Units 10–15); and this session audited the WHOLE planning layer for the same
misalignment that hid the surface, then began the cleanup.

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
  summary. (Both this session's findings and the prior one came from exactly that discipline: the
  tracker said one thing, the SOURCE said another.)
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: the human directs them; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent;
  the device prompt must forbid `git checkout`/`stash`/`reset`/`clean` on a dirty tree and end the
  tree byte-identical except new files under `tasks/<id>/evidence/`. Gate/maintainer agents leave
  STRAY changes — REVERT strays with Edit (never `git checkout`). A device gate proves the BINARY
  THAT WAS BUILT — native changed ⇒ REBUILD. LOCALLY-GREEN ≠ CI-GREEN.
- Environment note (this session): a hook in this repo can auto-commit a bare `git add` with a
  generic message. If it fires, `git commit --amend` to a proper Conventional Commit message.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules). Note rule #5: the front door
   is `preset`/`feedback`/`effect` props on your content — that is the surface layer below.
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md.
3. research/7-implementation/blueprint.md (the complete roadmap — Phase V1 + V2 + **Phase S** +
   the new **Phase A: As-built V2 addenda**), progress.md (the tracker — the **Surface build /
   Phase-S** section + the new DOC-023…DOC-030, U3-009, U15-001, DEF-022…024 rows),
   architecture.md (now with **§11 As-Built V2 Mechanics**), v1-cut-checklist.md, decision-ledger.md,
   and **a2-triage.md** (the A2 ratify table from this session).
4. The auto-memory index named in CLAUDE.md.

CONTEXT — TWO findings now drive the work:
(1) PHASE S (prior session): the JS public surface was designed in `1-surface/` but never decomposed
    into build work. `6-ship/52 §Public exports` names 8 contract symbols
    (`fx, FxPresence, FxView, FxPressable, Fx, FxGroup, FxItem, EdgeGlow`); five + the `fx.effect.*`
    builder do not exist in code. `blueprint.md` Phase S (Units 10–14) decomposes them; Unit 10 is
    the unblocker. SHIPPED already: `fx.motion.*`, `fx.source.*`/`Fx.Scroll`, `FxPresence`,
    `interactionMode none|passive|active|controlled`, the 10 curated shaders (reachable only via the
    low-level substrate views today).
(2) THE ALIGNMENT AUDIT (this session): Phase S proved the planning system could ship a whole layer
    untracked. This session ran a full three-way audit to hunt the SAME CLASS everywhere else.

THE ALIGNMENT AUDIT — what it found (the detail, mapped to remediation):
Fanned out 6 read-only Explore agents (one per research plane — 0-spine, 1-surface, 2-effects,
3-motion, 4-runtime, 5-realization), each cross-checking its plane against `architecture.md`,
`blueprint.md`, and `research/wip/`. Synthesized into five finding-classes:

  A1 — SHIPPED but untracked (the Phase-S class, recurring). Four merged + device-ratified mechanics
       had NO blueprint Unit and NO architecture entry: `source`/`Fx.Scroll`/`fx.source.*` (DEF-014),
       `controlled` ref writes `setUniform`/`setHighlight` (DEF-020), `dragAxis`/drag-tilt (DEF-011),
       runtime shader registration/compile (DEF-008).  → **DOC-024**.
  A2 — RESEARCH-COMMITTED but unbuilt + untracked: `clock` node, SDF hit-test, app-state/`cadence`
       coordinator, `getUniform`, `src/presets` resolver, palettes/themes, typed material/fill/filter
       config, `fx.effect.*` fill/symbol steps.  → **DOC-025** triage (build / defer / narrow).
  B  — CONTRADICTIONS architecture vs source: event payloads (`onTransitionEnd`/`onStateChange`),
       five-vs-six objects, `FxEffectRenderer` V1-inline, material `interaction:'self'` press
       carve-out, blueprint Unit 2 "manually maintain" vs derived (U2-003).  → **DOC-023**.
  C/D — STALE lines: architecture §7 platform table (content-distort PLANNED, iOS glass, Android
       decorative clock, shape-morph gate), the MOT-001-closed repoints (`sheet`/`modal`→DEF-018,
       `tune`→MOT-002, `transient`→device-verified), blueprint Unit 9 SharedObjects→DEF-021,
       `35` status line.  → **DOC-023**.
  E  — WIP: `capability-boundary-classifier.md` is mature and `05 §Decision 5` already cites it as
       canonical → promote (**DOC-026**); `interactive-glass-touch-delivery.md` (folded) +
       `critique-2026-06-10.md` (threads now in rows) → retire (**DOC-030**).

WHAT THIS SESSION COMMITTED (on `integration/0.1.x`; 11 unpushed ahead of origin):
- `b2c327a` — **DOC-023** mechanical stale sweep (12 files): §7 platform table, event payloads → `40`,
  five-objects + `FxPressHandler` input-source + `FxEffectRenderer` V1-inline + material carve-out,
  Unit 2 derived types, Unit 9 SharedObject → DEF-021, MOT-001 repoint across the planes + the two
  trackers, `35` status. (Excluded `tasks/*` + proof-log as frozen audit trail.)
- `5c80add` — **DOC-024** as-built V2 addendum: blueprint **Phase A** (A1–A4) + architecture **§11**
  table mapping the four shipped mechanics to ledger / native+JS code / source doc / what they enable;
  + a §1 target-tree drift caveat.
- `482fbfb` — **DOC-025** A2 triage ratified → **a2-triage.md** (three outcomes). Codebase-verified
  resolutions: the surface resolves `preset` NATIVELY (so no JS resolver is needed); `filter` has NO
  native renderer and `fill` renders a FIXED gradient (both → narrow, pre-Unit-10); `material`'s
  manifest node is honest → a clean Phase-S extension.
- `c837cf6` — **DOC-025 spawned rows registered**: U3-009, U15-001, DEF-022/023/024, DOC-027;
  unblocked DOC-026; renamed the surface section to "Surface build / Phase-S."

REMAINING HOUSEKEEPING BUCKET (maintainer-assigned; ALL planner lane; cadence = review each chunk
before commit; do them in this order):
- **DOC-027** (todo) — record-as-built addendum: extend blueprint Phase A / architecture §11 with
  `fx.motion.*` builders, reduce-motion driver gating (incl. the Android `areAnimatorsEnabled()`
  manual gate), idempotent teardown order.
- **DOC-028** (todo) — architecture §1 target-tree reconciliation: distinguish **shipped** /
  **Phase-S target** / **deferred-unbuilt** files (the drift §11 flagged).
- **DOC-029** (todo) — source-doc narrowing: `50 §Presets/palettes/themes` (no V1 consumer; not a
  design-token layer) + `55 §EffectStep.node` (drop `fill`/`symbol` terminal steps) so they stop
  over-promising unbuilt surfaces.
- **DOC-026** (todo, unblocked) — promote `wip/capability-boundary-classifier.md` (the A/B/L boundary
  + substrate-depth taxonomy) into canon `04`/`05`; then retire/mark-historical the WIP.
- **DOC-030** (todo) — WIP cleanup: retire `interactive-glass-touch-delivery.md` (ratified, folded
  into `structure.ios.md`/`01`) + `critique-2026-06-10.md` (its live typed-config/palette thread now
  lives in U15-001/U3-009/DOC-029); update `wip/README.md`. Do this AFTER DOC-026/029 so the
  retired threads are fully represented in rows.

SPAWNED IMPLEMENTER ROWS (NOT planner lane — these are executor sessions; registered todo/blocked):
- **U3-009** (gates U10-001 — pre-Unit-10): narrow the fill/filter manifest over-promise. `filter`
  lowering → `status:'planned'` (no native renderer); `fill` node → trim `colors`/`angle`/`kind` to
  the rendered intensity-driven subset; touches `src/manifest/manifest.ts` + `20-fills`/`23-filters`.
  **Must land before/with Unit 10**, else `<Fx effect>` exposes a rung whose typed config the
  renderer ignores.
- **U15-001** — typed material config (Phase-S build): extend `MaterialConfig` + the `material`
  manifest node + the `ConfigFor` lockstep with native-backed uniforms (`tint`/`colorScheme`/`weight`)
  ONLY as the glass actually backs each.
- **DEF-022 / DEF-023 / DEF-024** (blocked, trigger-gated): `clock` driver node / cross-surface
  `cadence` off-window pause coordinator / `getUniform` pull channel.

THE SURFACE UNITS (blueprint Phase S; still the main build path; all unblocked — every runtime dep
is merged):
- **U10-001** — `<Fx effect="id">` string-form surface + `EdgeGlow`. The canonical front door
  (rule #5); `select()` over the manifest, mounts `FxHostedView`/`FxSurfaceView`, wires
  effect/intensity/composition/interactionMode/uniform props + load/error/press. THE unblocker for
  Units 11/12. Deps: Units 1/2/3/8 (merged). (Land U3-009 before/with it.)
- **U11-001** — `fx.effect.*` builder + `EffectStack`/`EffectStep` + `<Fx effect={stack}>` (realizes
  DEF-004/SURF-008). Deps: U10-001. (Narrow fill/symbol steps per DOC-029 first.)
- **U12-001** — `FxView` (state-driven; `lift` preset, `idle`/`selected`; wires the unbuilt
  `onFxStateChange`). Deps: U10-001 + Units 4/6 (merged).
- **U13-001** — `FxPressable` over the shipped `FxPressHandler` (`feedback="native"`). Deps: Unit 8.
- **U14-001** — `FxGroup`/`FxItem` glass-morph compound (DOC-006; `spacing` deferred V2). Deps: 1/3.
- **U15-001** — typed material config (Phase-S effects extension; see spawned rows above).

NEXT — two tracks, in order:
(1) FINISH the housekeeping bucket: DOC-027 → DOC-028 → DOC-029 → DOC-026 → DOC-030 (planner lane,
    one reviewable commit each). THEN
(2) SPEC **Unit 10** (the front door + unblocker) — the highest-value, lowest-risk surface unit (the
    substrate views already render every effect; this is the JS surface over them). Land **U3-009**
    (fill/filter narrowing) before/with it so the effect surface doesn't expose lying typed config.
Publishing (DEF-016) stays correctly blocked: V2/publish is NOT done while the front door is unbuilt.

ALSO STILL TRUE:
- Branch `integration/0.1.x`, 11 unpushed. The human still needs to PUSH to update PR #7
  (integration/0.1.x → main). This session's commits (DOC-023…025 + the row registration + this
  handoff) are part of that delta.
- DEF-017 RESOLVED (CI lane removed for cost; local `smoke:ios` harness kept). DEF-014 waiver premise
  corrected (shaders render on the sim). DEF-021 CONFIRMED BLOCKED (no JS-held SharedObject consumer;
  speculative + trips rule #7 — needs a detached handle or per-child control to unblock).
- LEDGER non-blocking opens: MOT-002 (`tune` vocab, now correctly pointed at its own row, not the
  closed MOT-001), MOT-008 resolved by composition (DEF-007). Presence/feedback default-catalog
  *magnitudes* for `transient` are device-verified (MOT-001 closed, U7-003); the `lift`/`native`
  halves ride the unbuilt `FxView`/`FxPressable`.

START BY: reading the binding docs (esp. blueprint Phase A/S + a2-triage.md + the new progress rows).
Then finish the housekeeping bucket if the human directs it, or spec Unit 10. Do not start a
trigger-gated DEF row unprompted.
