# Session handoff — 2026-06-19 (SURFACE LAYER COMES ONLINE: the housekeeping bucket closed, then the JS public surface went from untracked-and-unbuilt to two units deep — U3-009 + U10-001 (the `<Fx effect>` front door) MERGED and device-verified, U11-001 (`fx.effect.*` builder) headless-done + reviewed with the device gate owed.)

Paste the block below into a fresh session to continue. Supersedes SESSION-HANDOFF-2026-06-18.md
(the alignment audit + housekeeping handoff — that bucket is now fully closed). State of the world:
the runtime engine (Units 1–9) was already built + device-proven; this session built out the front
door of the **JS public surface** — `<Fx effect>` + `EdgeGlow` are live and device-verified, and the
`fx.effect.*` builder is reviewed and one device gate from merging.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks (write `tasks/<id>/README.md` from the authority sources, row → spec'd), write
  paste-ready executor / device-gate PROMPTS for the human to run, REVIEW returned work, drive
  DESIGN with prose + a recommendation, and do the bookkeeping. You do NOT implement units; SUBAGENTS
  execute (the human dispatches them in separate sessions and pastes results back). Doc-cleanup /
  bookkeeping IS your lane — edit research/docs directly. **Bounded review-stage fixes the maintainer
  directs (a few lines, fully specified) are fine** — this session that meant manifest/config/test
  folds (U3-009) and component/builder folds (U10/U11) at review.
- Cross-check EVERY returned step independently — RE-RUN the gates yourself, read the diff, open the
  evidence (don't trust captions or summaries), and CHECK THE TREE STATE. This session that discipline
  caught: U10's `effect="symbol"` rendering nothing; the web `select()` crash; the harness shader
  `aurora` being hosted-only on iOS (the "onError is sim-only" claim was WRONG); and U11's mutable-
  freeze / hand-built-stack-bypass gaps.
- Device gates + the `device-verified` / `merged` ticks are the human's; tick them ONLY when
  explicitly delegated (this session the human delegated them per-task). Commits: the human directs
  them; on `integration/0.1.x`; NO AI co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. The
  recommendation-pass-before-spec pattern (used for DOC-026, U10, U11) works — present the load-bearing
  forks with a rec, get a nod, then write the spec.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE a device gate; a device prompt must
  forbid `git checkout`/`stash`/`reset`/`clean` on a dirty tree and end the tree byte-identical except
  new files under `tasks/<id>/evidence/`; a device gate proves the BINARY THAT WAS BUILT (JS-only
  change ⇒ Metro/JS reload, native change ⇒ REBUILD); paste-ready prompts use NO markdown blockquote
  (renders as `▎`); NEVER leak internal ids (build-unit/ledger ids, research paths, `§` refs) into
  shipped code comments (got dinged twice — guard against it).
- Environment note: evidence `.png` screenshots are **gitignored** by repo convention — the tracked
  record is `tasks/<id>/evidence/device.md` (it references the local images).

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules). Rule #5: the front door is
   `preset`/`feedback`/`effect` props on your content — `<Fx effect>` (now SHIPPED) is that door.
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md.
3. research/7-implementation/blueprint.md (Phase V1 + V2 + **Phase S** (the surface, Units 10–15) +
   **Phase A** as-built addenda), progress.md (the tracker — the **Surface build / Phase-S** section),
   architecture.md (§1 target tree + §11 as-built), a2-triage.md, decision-ledger.md.
4. The auto-memory index named in CLAUDE.md.

WHAT THIS SESSION DID (all on `integration/0.1.x`; see WHERE THINGS STAND for push status):

1. CLOSED the audit-2026-06-18 HOUSEKEEPING BUCKET (DOC-027…030), all merged:
   - DOC-027 (`34d728b`) — within-Unit as-built mechanics → blueprint Phase A (A5–A7) + architecture §11.
   - DOC-028 (`1d2264b`) — architecture §1 target-tree reconciliation (shipped / Phase-S / deferred tags).
   - DOC-029 (`1a32e38`) — narrowed `50 §presets/palettes/themes` + `55 §EffectStep` over-promises.
   - DOC-026 (`c0905c2`) — promoted `wip/capability-boundary-classifier.md` into canon `04`/`05`
     (A/B/L boundaries → 04; source-channel + substrate-depth axes + escalation/lanes → 05; the
     `05 §Decision 5` cite repointed off the WIP — the correctness fix).
   - DOC-030 (`5278e4c`) — retired two WIP spikes (banner, not deleted — they are evidence records)
     + swept the classifier feeders (6 WIP docs) to `04`/`05`; new `wip/README` "Retired / historical".

2. U3-009 (`360e651`, MERGED) — narrowed the `fill`/`filter` manifest over-promise: `fill.uniforms`→`{}`
   (FillConfig derives exact `Record<string,never>`, pinned); `filter` both rungs `status:'planned'`→
   `select()`=`{via:'none'}`. Review folds: trimmed the lying `fill` lowering rungs (iOS lost
   clock/cadence; Android AGSL rung removed → static `LinearGradient`); aligned the SAME false fill
   contract across FIVE canonical mirrors (`02`, `structure.{ios,android}`, `data-layer`, `20-fills`/
   `23-filters`). `device:no`.

3. U10-001 (`c461a0d` impl + `dec8c4e` harness + `2739e35` device-close, MERGED, device-verified) —
   the canonical `<Fx effect="id">` front door + `EdgeGlow` + the `Fx` callable (absorbs `Fx.Scroll`).
   New `src/effects/effects.ts` resolver (public id → node + native effect string, conformance-tested) →
   reuses `select()` → mounts `FxHostedView` (hosted) / `FxSurfaceView` (expo-view). Events split:
   native press + shader load/error on the FxSurfaceView path only; `select()→none` = adapter-
   degradation `onError({reason:'unsupported'})` (named distinct from native load failure). Review
   folds: **`symbol` removed** (rendered nothing without `SymbolConfig.name`; → U10-002); **web crash
   guard** (`select()` on non-native platform); **harness shader `aurora`→`dots`** after the reviewer
   found aurora is hosted-only on iOS — the interactive Metal raster path implements only a 5-shader
   subset (`fractal-clouds`/`ink-smoke`/`liquid-chrome`/`loop`/`dots`, `FxSurfaceView.swift:334-343`).
   **Device gate 6/6 PASS on iOS 18 sim + POCO F1.** Docs-closed: `50 §V1 shader catalog` flipped to
   shipped + records the iOS interactive subset.

4. U11-001 (`5164d54` spec + `6491fc2` impl, HEADLESS-DONE + REVIEWED; DEVICE GATE OWED) — the
   `fx.effect.*` builder (`.glow`/`.glass`/`.mesh` + `.animate`/`.defaults`) → immutable `EffectStack`,
   consumed by `<Fx effect={stack}>` reusing U10's resolve→select→mount path for the stack's ONE backed
   render-target (Option A — no native multi-layer compositor; multi-layer is a future unit). Review
   folds (two rounds): readonly fields + `Object.freeze` builder/steps; guard-test warn suppression;
   "compositor unit"→"compositor support" (comments-guide); a **Fx-level multi-step guard** for hand-
   built stacks (dev-warn + render first); **deep clone+freeze** of nested `config`/`transition`/`spring`.
   `.blur`/filter + symbol omitted; fill intensity-only; `.animate`/`.defaults` recorded but NOT wired
   (no effect-transition channel exists). 138 tests; all gates green.

NEXT — in order:
(1) FINISH U11-001 (its only remaining gate): add a **builder-form section** to
    `example/screens/effect-surface.tsx` (`fx.effect.glow()`/`.glass()`/`.mesh()` beside their string-
    form equivalents + a 2-render-target chain to show the dev warning + first-step render). Example-
    only, no library change — the planner may add it directly (as for U10). Then write the human a
    device-gate prompt (builder == string form on iOS sim + POCO F1), and on PASS do docs-closed
    (`55` status — call it "builder form for one effect", NOT "composition") + the merge.
(2) PUSH `integration/0.1.x` — **7 commits unpushed** (the U10 unit + U11) — to update PR #7.
(3) SPEC the next surface unit. **U13-001 (`FxPressable`)** is fully independent (only the merged
    Unit 8) and can run in parallel; **U12-001 (`FxView`)** is the state-driven sibling (Units 4/6/10
    merged). U10-002 (the symbol string surface) is design-then-build (spawned, todo).

ALSO STILL TRUE / OPEN:
- Surface contract status: `Fx`/`<Fx effect>` + `EdgeGlow` SHIPPED + device-verified; `fx.effect.*`
  headless-done. Still unbuilt: `FxView` (U12), `FxPressable` (U13), `FxGroup`/`FxItem` (U14), typed
  material (U15), the symbol string surface (U10-002).
- DEFERRED FOLLOW-UP (documented in `50`, not a blocker): the manifest does not model per-shader
  interactive capability — `<Fx effect="<hosted-only id>" interactionMode="active">` passes `select()`
  then `onError`s at mount (honest runtime degradation, the U3-009 over-promise class at
  shader×interactive granularity). A stricter design would degrade at select-time.
- Multi-layer effect composition is its OWN future unit (a real native composite renderer + its own
  device matrix) — U11 ships single-render-target only and must not imply otherwise.
- Publishing (DEF-016) stays correctly blocked: V2/publish is not done while the surface is partial.

START BY: reading the binding docs (esp. blueprint Phase S + the progress Surface section). Then add
the U11 builder-form harness + write its device-gate prompt, OR spec U12/U13 if the human directs.
Do not start a trigger-gated DEF row unprompted.
