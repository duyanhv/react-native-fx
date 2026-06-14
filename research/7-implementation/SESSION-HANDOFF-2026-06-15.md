# Session handoff — 2026-06-15 (V2 in flight; DEF-009 device re-gate pending)

Paste the block below into a fresh session to continue. Supersedes
`SESSION-HANDOFF-2026-06-14.md`.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor / agent-device PROMPTS, REVIEW returned work, drive DESIGN, and
  do the bookkeeping. You do NOT implement directly. SUBAGENTS execute (the human dispatches them
  in separate sessions and pastes results back). Hand executor/device prompts to the human.
- Cross-check EVERY returned step independently — read the diff, RE-RUN the gates yourself, read
  the evidence. Never trust a summary. (This session, independent re-gates + a device gate caught
  TWO defects a summary would have hidden: a rule-#1 background-pause gap, and a mount-start race
  the planner had reasoned away in review — the device proved the reasoning wrong.)
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: ONLY when the human says so; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- The banked lesson, honored this session: COMMIT reviewed headless work BEFORE dispatching a
  device-gate agent (a prior device agent `git checkout`-wiped uncommitted native work). The
  device prompt must forbid `git checkout`/`stash`/`reset` on the dirty tree.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types).
3. research/7-implementation/progress.md (the tracker — find the in-progress/device-pending row)
   + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (note: prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit-
   not-git-checkout incl. the commit-before-device-gate prevention).

CURRENT STATE (2026-06-15): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). MERGED THIS V2 ARC (do NOT redo): DEF-014 (iOS-hosted `source` rung — the opener),
DEF-003 (portal = app's job), DEF-004 (`Fx.Stack` rejected; the builder is the stack API),
DEF-005 (`edge`/`origin` sugar rejected), DEF-007 (BYO envelope — false premise, by composition),
DEF-008 (registry-sourced runtime shader compilation, FX-007), DEF-015 (naming freeze).

ACTIVE TASK — DEF-009 (Android content-distort ripple demonstrator, closes FX-008):
device-pending, RE-GATE pending. State of play:
- SHIPPED + COMMITTED: `a89d2fb` (feat — the build) + `495fbe5` (fix — the mount-start defect).
  Tree is clean; the work is recoverable.
- What it is: one curated `ripple` AGSL sampler applied to `FxSurfaceView`'s existing content
  container via `RenderEffect.createRuntimeShaderEffect(shader, "content")` — draw-time, so the
  wrapped RN children stay touchable (the rule-#4 inverse of iOS, which is out-of-scope/no-op).
  Android API 33+; below 33 content renders normally. Mechanical native prop
  `contentDistortion='ripple'` (NOT the long-term public surface — high-level sugar deferred).
  Mechanic pinned in `structure.android.md § content-distort`; new `FxContentDistortion.kt`.
- DEVICE RUN 1 (POCO F1 / API 35): PARTIAL 6/7. PASS — live touch-through (the load-bearing
  claim), intensity-live, background/detach pause (rule #1), pre-33 (code-reasoned residual),
  iOS no-op; distortion+animation PASS when the loop is active. Perf: per-frame `setRenderEffect`
  ~60 fps on one surface — keep it. DEFECT (fixed in `495fbe5`): the ripple never started on
  first mount or navigate-back because the parent's `onAttachedToWindow` fires before the child
  container attaches; the helper now uses the container's own `OnAttachStateChangeListener`.
- NEXT, IMMEDIATE: dispatch the BOUNDED device RE-GATE (hand the human the agent-device prompt;
  forbid git checkout on the dirty tree; evidence → `tasks/DEF-009/evidence/`):
  (1) ripple distorts on FIRST render (`rippling=true` default, no manual toggle);
  (2) it animates again after navigate-away → back;
  (3) re-confirm background-pause still holds (the new detach path is redundant with the existing
  one). The other rows (touch-through, intensity, pre-33, iOS no-op) are already proven and
  unaffected by a one-file loop-start fix — do not re-run them unless cheap.
- THEN (on the human's ratify): DOCS-CLOSED — close FX-008 in the OWNING docs first (cardinal
  rule), then the ledger: `02` § content-distort PROSE note still reads "merely planned on
  Android" (flip it — the worked-example DATA is already flipped); `23-filters.md` Open question
  ("whether to ever expose a content-filter wrapper on Android") → resolved (DEF-009 ships the
  ripple demonstrator); `data-layer.md` I5 / content-distort entry reconciled; ledger FX-008
  `open`→`resolved`. `structure.android.md § content-distort` is ALREADY pinned. Write
  `reviews/DEF-009.md`. Then the row is ready-to-merge; the human owns the `merged` tick (the two
  commits may be squashed into one feat commit at merge if the human prefers).

REMAINING V2 AFTER DEF-009 (pick with the human; confirm before speccing):
- DEF-020 — the `Fx*` SharedObject / imperative JS-held handle + `controlled` write path
  (`setUniform`/`setHighlight`). 4-runtime, implement + device. Prerequisite for DEF-011 AND the
  `05` Nitro-reconsideration trigger — scope carefully.
- DEF-011 — drag/tilt (G3) axis-aware claiming. Closes RT-002. HARD-BLOCKED on DEF-020.
- DEF-006 — Reanimated UI-thread channel (regime C); adjacent to DEF-011's continuous-motion half.
- DEF-010 — `ready-to-merge` doc-cleanup (stale RT-001 duplicate retired); a trivial merge-tick
  when convenient.
- Trigger-gated / do NOT start unprompted: DEF-001/012/013/016/017/018/019; `research/wip/*`
  (Lane 1 / classifier / signal-grammar) is PARKED (post-V2).

LEDGER: FX-008 closes with DEF-009 docs-closed. After that, MOT-002 (`tune`, deferred to MOT-001)
is the last genuinely-open non-blocking row; everything else is resolved or trigger-deferred.

START BY: reading the binding docs, finding DEF-009 in progress.md (device-pending), and handing
the human the bounded DEF-009 device RE-GATE prompt. After it passes + the human ratifies,
docs-close FX-008. Then ask which V2 item is next (DEF-020→DEF-011 arc if drag/tilt is the goal,
else confirm the backlog). Do not start the wip/ post-V2 material or DEF-016.
