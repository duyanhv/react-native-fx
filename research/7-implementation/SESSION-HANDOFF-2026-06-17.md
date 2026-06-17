# Session handoff — 2026-06-17 (DEF-011 Phase 1 + arbitration spike + Phase 2 committed; closing HARDWARE device gate next)

Paste the block below into a fresh session to continue. Supersedes and replaces the
2026-06-15 handoff (DEF-020 merged / DEF-011-next), now deleted.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor / agent-device PROMPTS, REVIEW returned work, drive DESIGN, and
  do the bookkeeping. You do NOT implement directly. SUBAGENTS execute (the human dispatches them
  in separate sessions and pastes results back). Hand executor/device prompts to the human.
- Cross-check EVERY returned step independently — read the diff, RE-RUN the gates yourself, read
  the evidence (open the screenshots, don't trust captions), and CHECK THE TREE STATE. Never trust
  a summary. (This session: an executor reported "test 70/78, 8 pre-existing failures" — it had run
  raw `bun test`; the real gate `bun run test` was 89/89. And a device agent's "SPIKE PASSES —
  S1–S5 both platforms" was actually Android-decisive only; the screenshots showed the truth.)
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: ONLY when the human says so; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent
  (a prior device agent `git checkout`-wiped uncommitted native work); the device prompt must
  forbid `git checkout`/`stash`/`reset`/`clean` on the dirty tree, and must end the tree
  byte-identical except new files under `tasks/<id>/evidence/`. Gate/maintainer agents leave STRAY
  changes (dep bumps in `example/package.json`+`bun.lock`, post-build source edits, GBs of
  gitignored screen recordings) — REVERT strays with Edit (never `git checkout`), and never conflate
  them with verified work.
- A device gate proves the APK/`.app` THAT WAS BUILT, not the current tree. ALWAYS compare the
  built-binary mtime against the source mtimes (and the commit) before trusting a "device-verified"
  claim. Native changed ⇒ REBUILD; a stale `.app`/APK reads as a real pass but tests pre-fix code.
  When JS is the only change, Metro serving working-tree JS over a current native build is valid.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types, the authority stack).
3. research/7-implementation/progress.md (the tracker) + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit;
   commit-before-device-gate; gate-agents-leave-strays; cite-RN-internals-from-node_modules).

CURRENT STATE (2026-06-17): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). Tree clean, local == origin/integration/0.1.x. MERGED IN THE V2 ARC BEFORE THIS
SESSION (do NOT redo): DEF-014, DEF-003, DEF-004, DEF-005, DEF-007, DEF-008, DEF-015, DEF-009,
DEF-010, the review-fix arc, and DEF-020 (`interactionMode="controlled"` view-ref write path:
`setUniform`/`setHighlight` Expo `AsyncFunction`s; discrete writes only). The true `Fx*`
SharedObject / `FxEffectRenderer` / HybridObject half is split to DEF-021 (trigger-gated, blocked).

IN FLIGHT THIS SESSION — DEF-011 (native-owned drag/tilt; G3 axis-aware claiming; closes RT-002).
Three commits on `integration/0.1.x`, all planner-reviewed (gates re-run independently green),
NONE device-verified on hardware yet:
- `257905c` — Phase 1: the `dragAxis?: 'horizontal'|'vertical'|'both'` prop (inert unless
  `interactionMode==='active'`) + the axis-aware `shouldFail` refinement (any-movement-yield →
  cross-axis-dominance-yield) on both `FxPressHandler`s + a spike example screen. Preflight diffed
  the real RNGH Pan FSM.
- `0b30be5` — arbitration spike (simulator/emulator) evidence. Android-decisive (S1 claim+yield,
  S3 `both` blocks parent — planner-verified against the screenshots); iOS + Android S2/S4/S5
  under-verified by tooling, NOT failures; design NOT falsified → proceed. `evidence/device.md`.
- `4f953c7` — Phase 2: native drag/tilt uniform writes + axis-masking + native settle. iOS
  dual-path ABI (`FxUniforms` struct + runtime preamble + all 10 `[[stitchable]]` sigs + hosted
  call site); Android per-shader `declaredUniforms`-gated writes. `drag` = axis-masked
  `currentTouchUV − originTouchUV`; `tilt` = `clamp((currentTouchUV − 0.5)*2, -1, 1)` (full 2D);
  both signed `[-1,1]` in the touch-UV basis, settled to `(0,0)` via the 0.35 press-depth easing.
  Visible `dots` demo wiring (no-op at rest, demo-only — NOT a catalog contract). `@gorhom/
  bottom-sheet` coexistence in the example (example deps only). 11 Tier-1 tests.

DEF-011 SETTLED FORKS (ratified planner + maintainer; in `tasks/DEF-011/README.md`):
- API: `active` + `dragAxis` (no new `interactionMode` value — DEF-015 froze that vocab).
- Uniforms: `drag`/`tilt` vec2, signed `[-1,1]`, in the shipped touch-UV basis (RT-005).
- `both` parity: DOCUMENT the divergence, do NOT change iOS. iOS claims by simultaneous recognition
  (scroller always scrolls, `cancelsTouchesInView=false`); Android claims by blocking the parent
  (`requestDisallowInterceptTouchEvent`). `horizontal`/`vertical` converge; `both`-inside-a-scroller
  diverges. `both` is standalone-only; iOS parent-scroll-blocking for `both` is OUT OF SCOPE, not a
  bug. NEVER sever RN touch on iOS (rule #4).

DEF-011 NEXT — the closing HARDWARE device gate (NOT a simulator; the human needs a physical
device — none was available for the spike). It must carry, with the now-VISIBLE drag/tilt uniform:
iOS axis-tracking S1–S5; Android S2/S4/S5; drag/tilt track the finger with NO per-frame JS (under
JS-thread load); native settle/spring-back; W-F2 (press when the finger leaves the shape along the
claimed axis); W-F3 (cross-axis scroll-start feel — Android claims on DOWN, releases on cross-axis
MOVE); the 0.35-easing "does drag feel laggy during fast drags?" watch item; the `@gorhom`/RNGH
coexistence cases; loop pauses off-window (rule #1). ON PASS → docs-close: `30` G3 open→shipped;
PIN the drag/tilt write+settle mechanic in `structure.{ios,android}.md` § Touch contract (the
planner deliberately REVERTED a premature Phase-2 pin — pin it here only after the gate confirms the
exact arbitration + `both` divergence + threshold/feel nuance); ledger RT-002 deferred→resolved.
The planner already drafted the closing-gate prompt shape in the prior turns — write a hardware
version (rebuild both platforms; git-safety rules; evidence to `tasks/DEF-011/evidence/`).

OTHER V2 ROWS — trigger-gated, do NOT start unprompted:
- DEF-006 — OPTIONAL app-owned Reanimated UI-thread channel (MOT-007), `blocked`. NOT on the
  DEF-011 path. Spec only when a real app-owned continuous-source integration is asked for.
- DEF-021 — true `Fx*` SharedObject / `FxEffectRenderer` / HybridObject shape, `blocked`
  (trigger: first detached JS-held handle / per-child control / the `05` Nitro re-eval).
- DEF-001/002/012/013/016/017/018/019; `research/wip/*` PARKED post-V2. DEF-016 (mechanical rename
  to `react-native-fxkit`) is at pre-publish.

LEDGER: RT-002 closes when DEF-011's hardware gate passes + docs-close. MOT-002 (`tune` vocab,
slaved to MOT-001) and MOT-007 (deferred, DEF-006) remain. Everything else resolved or
trigger-deferred.

START BY: reading the binding docs. Then EITHER write the DEF-011 closing HARDWARE device-gate
prompt for the human to run on a physical device, OR (if no device yet) pick up a human-chosen
trigger-gated row. Do NOT docs-close DEF-011, pin the structure docs, or close RT-002 until the
hardware gate passes. Do not start DEF-006, the `wip/` material, or any trigger-gated row unprompted.
