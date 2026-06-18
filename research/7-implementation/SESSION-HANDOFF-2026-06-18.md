# Session handoff — 2026-06-18 (DEF-017 CI lane REMOVED for cost / harness kept local; DEF-014 waiver corrected; DEF-021 confirmed blocked; next = human-chosen trigger-gated row)

Paste the block below into a fresh session to continue. Supersedes the earlier 2026-06-18
handoff (DEF-017 "ready-to-merge / watch the first hosted run"), now overtaken by events:
the hosted runs fired, exposed cost, and the lane was removed.

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
  summary.
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: the human directs them; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. Pure
  task-selection among blocked rows IS a fair AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent;
  the device prompt must forbid `git checkout`/`stash`/`reset`/`clean` on a dirty tree and end
  the tree byte-identical except new files under `tasks/<id>/evidence/`. Gate/maintainer agents
  leave STRAY changes — REVERT strays with Edit (never `git checkout`). A device gate proves the
  BINARY THAT WAS BUILT, not the current tree — native changed ⇒ REBUILD. LOCALLY-GREEN ≠
  CI-GREEN (DEF-017 proved this twice — a managed-Expo `ios/` is prebuild-generated/gitignored;
  cold CI sim boot exceeds a 60s timeout).

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types, the authority stack).
3. research/7-implementation/progress.md (the tracker) + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit;
   commit-before-device-gate; gate-agents-leave-strays; cite-RN-internals-from-node_modules).

CURRENT STATE (2026-06-18): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). Branch `integration/0.1.x`. This session's commits (all on the branch; the human
still needs to PUSH to update PR #7 → integration/0.1.x → main):
- `da2672b` fix(ci) — DEF-017: prebuild `example/ios` before pod install (managed-Expo `ios/` is
  CNG/gitignored; absent on a fresh runner). [Superseded by the removal below, but kept in history.]
- `10bf282` fix(ci) — DEF-017: raise the smoke-harness sim boot timeout to 240s (cold CI boot
  exceeds 60s). [Harness change; survives the lane removal, harmless for the fast local boot.]
- `6a37f39` chore(ci) — DEF-017: REMOVE the `ios-smoke` lane; keep the harness for local use.
- `0fa34f2` docs(impl) — DEF-014 follow-up: correct the v1-cut-checklist shader-on-sim waiver premise.
- `bbdd434` docs(runtime) — repoint the stale `SharedObject`-layer deferral DEF-020 → DEF-021 (`36` + `architecture.md`).
- (+ `7e1fbc3` docs — the human's anchored-reveal WIP, parked post-v2.)

DEF-017 (critique F16 — iOS simulator smoke lane) — RESOLVED: CI LANE REMOVED FOR COST; LOCAL
HARNESS RETAINED. The `ios-smoke` job shipped (`78176af`) and was reviewed, but its first hosted
`macos-26` runs exposed the real cost — a ~15-min macOS job (≈10× the Linux rate) on every
PR/push to `main`, guarding 10 V1-frozen, rarely-changing curated shaders. The first hosted run
also surfaced two bring-up bugs (NOT the feared GPU-blank residual): a missing `expo prebuild`
step (fixed `da2672b`) and a 60s sim-boot timeout too short for a cold runner (fixed `10bf282`).
The maintainer judged the recurring spend not worth it → the job was deleted (`6a37f39`). KEPT:
`example/scripts/smoke-shader-catalog.ts` + the `smoke:ios` script, as an on-demand local check
(`cd example && bun run smoke:ios` before touching curated shaders). The "first hosted run
GPU-renders Metal" residual is now MOOT (no hosted run will fire). Disposition recorded in
`tasks/DEF-017/README.md`, `progress.md`, and the critique F16 row. Device stays the feel/touch gate.

DEF-014 follow-up (shaders-render-on-sim vs the v1-cut-checklist waiver) — DONE (`0fa34f2`). The
waiver's blanket claim "the curated `[[stitchable]]` shaders do not render on the iOS simulator"
was FALSE: the hosted-path catalog renders non-blank on the Apple-silicon sim (DEF-014 maintainer
sim run + DEF-017 harness, 10/10 ids, variance ~680–5860). Corrected in `v1-cut-checklist.md` (the
live record) + flagged in the DOC-022 work order. What stays hardware-only: real-device (A15) GPU
render fidelity + scroll/thermal perf. Narrower caveat preserved: the INTERACTIVE `expo-view`
shader path was observed blank on the sim in U8-002 (path-specific, not the hosted catalog).

DEF-021 (true `Fx*` `SharedObject` layer + `FxEffectRenderer` object + HybridObject *shape*) —
CONFIRMED BLOCKED (planner + maintainer, 2026-06-18). The HybridObject SHAPE is approved (`05`
Decision #3); a JS-held `SharedObject` LAYER is NOT — `36` §V1 realization + progress.md preserve
the consumer gate (no JS-held handle ⇒ no SharedObject). Building it now is speculative
architecture and trips the rule-#7 Nitro boundary. The three defensible moves on record:
  1. If a real DETACHED imperative-handle API is wanted (a post-v2 impulse API:
     `const h = fx.createEffect(...); h.setUniform(...); h.impulse({x,y}); h.dispose()`) — first
     RATIFY the handle surface (what object, who creates it, its lifetime, why a view ref is
     insufficient), THEN implement DEF-021 as an Expo Modules `SharedObject` task (rule-clean, no
     Nitro; DEF-020 kept `setUniform`/`setHighlight` a clean subset so the swap is mechanical).
  2. If PER-CHILD control fired (staggered children, child-anchored `menu`/`tooltip`, DEF-002) —
     DEF-021 is NOT first; run the SPINE-010 `05` boundary re-evaluation (Nitro vs raw Fabric vs
     Expo Modules) as a `ratify` task FIRST.
  3. Otherwise leave DEF-021 blocked.
NOTE: the anchored-reveal WIP does NOT by itself trigger DEF-021 — `FxAnchor`/`FxReveal` can start
as mounted native views + a registry/rect read; no detached handle unless an API stores an
anchor/effect object outside the view tree.

NEXT — nothing is in a ready/spec'd state; EVERY remaining DEF row is `merged` or `blocked`
behind a trigger, and DEF-021 is confirmed blocked. Do NOT start a trigger-gated row unprompted —
ask the human which trigger fired. Trigger-gated candidates (none objectively fired):
- DEF-016 — mechanical rename `react-native-fx` → `react-native-fxkit` + docs/skills. Trigger:
  pre-publish (publish only after V2 is done).
- DEF-021 — see the three moves above. Speculative until a detached handle / per-child control.
- DEF-006 — OPTIONAL app-owned Reanimated UI-thread channel (MOT-007). Not on any active path.
- DEF-001/002/012/013/018/019 — each waits on a concrete demand.
POST-V2 EXPLORATION (parked in `research/wip/`, NOT tasks — promoting one is a human DESIGN call):
anchored-reveal-and-library-shape (the freshest; `FxAnchor`/`FxReveal` geometry orchestration,
Boundary A, post-v2; has a 6-step promotion path), capability-boundary-classifier,
lane1-declarative-surface, lane1-signal-grammar, native-animation-api-extraction,
native-slot-layout-transitions, interactive-content-distort, interactive-glass-touch-delivery.

LEDGER: RT-002 resolved (DEF-011, prior session). Remaining genuinely-open, non-blocking: MOT-002
(`tune` vocab, slaved to MOT-001) and MOT-008 (BYO intro/outro envelope, V2 via DEF-007). SPINE-010
(per-child-control Nitro re-eval) is `deferred` — the gate for DEF-021 move #2. Everything else
resolved or trigger-deferred.

START BY: reading the binding docs. Then, if the human PUSHED and PR #7 is green, the session's
work is integrated — pick up a HUMAN-CHOSEN trigger-gated row (ask which trigger fired — do not
assume) OR a human-chosen WIP-promotion design call. Do not start DEF-006, the `wip/` material,
or any trigger-gated row unprompted.
