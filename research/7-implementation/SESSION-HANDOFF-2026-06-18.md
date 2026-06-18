# Session handoff — 2026-06-18 (DEF-011 merged / RT-002 resolved; DEF-017 ready-to-merge; next = human-chosen trigger-gated row)

Paste the block below into a fresh session to continue. Supersedes and replaces the
2026-06-17 handoff (DEF-011 closing-gate), now deleted.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor / agent-device PROMPTS, REVIEW returned work, drive DESIGN, and
  do the bookkeeping. You do NOT implement directly (a one-line fix the human asks you to apply
  is fine; building a unit is not). SUBAGENTS execute (the human dispatches them in separate
  sessions and pastes results back). Hand executor/device prompts to the human.
- Cross-check EVERY returned step independently — read the diff, RE-RUN the gates yourself, read
  the evidence (open screenshots, don't trust captions), and CHECK THE TREE STATE. Never trust a
  summary. (This session an executor's "headless-done" was real, but only after re-running all
  gates + reading the unguarded harness line-by-line did the residual surface — see DEF-017.)
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: ONLY when the human says so; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. Pure
  task-selection among blocked rows IS a fair AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent
  (a prior device agent `git checkout`-wiped uncommitted native work); the device prompt must
  forbid `git checkout`/`stash`/`reset`/`clean` on the dirty tree and end the tree byte-identical
  except new files under `tasks/<id>/evidence/`. Gate/maintainer agents leave STRAY changes —
  REVERT strays with Edit (never `git checkout`). A device gate proves the BINARY THAT WAS BUILT,
  not the current tree — compare built-binary mtime vs source mtimes before trusting a pass;
  native changed ⇒ REBUILD.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types, the authority stack).
3. research/7-implementation/progress.md (the tracker) + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit;
   commit-before-device-gate; gate-agents-leave-strays; cite-RN-internals-from-node_modules).

CURRENT STATE (2026-06-18): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). Branch `integration/0.1.x`. This session's commits (all reviewed, on the branch):
- `0b4f9de` fix — iOS DEF-011 gate fix (remove the UILongPress `allowableMovement` cap so the
  axis-aware `shouldFail` is the sole arbiter; without it the 10pt cap killed the press mid-drag).
- `49e89f6` docs(example) — DEF-011 S3 relabel (iOS `both` standalone-only divergence).
- `0ae80ac` docs(impl) — DEF-011 docs-close (G3 shipped, RT-002 resolved, structure.* pinned) + merged.
- `78176af` feat(ci) — DEF-017 iOS simulator smoke lane.
- (+ an uncommitted docs commit for DEF-017 close-out / this handoff if not yet made.)

DEF-011 (native-owned drag/tilt; closes RT-002) — DONE + MERGED on integration/0.1.x. Hardware
gate PASSED by the human (iPhone 14 / iOS 26.5 + POCO F1 / Android 15): all scenarios verified by
finger except the RATIFIED iOS `both`-inside-a-scroller divergence (the ancestor scroll stays
active — `both` is standalone-only on iOS, rule #4, out of scope not a bug; Android blocks the
parent). RT-002 resolved; `30` G3 open→shipped; the drag/tilt mechanic pinned in
`structure.{ios,android}` § Touch contract; ledger RT-002 deferred→resolved. Evidence in
`tasks/DEF-011/evidence/device-hardware.md` (the recordings/*.mp4 were deleted to reclaim disk;
the gesture-telemetry .json were also deleted — the manifest in device-hardware.md lists them as
present, a harmless staleness).

DEF-017 (critique F16 — iOS simulator smoke lane in CI; closes no ledger row) — READY-TO-MERGE,
reviewed + docs-closed (planner, 2026-06-18); HUMAN MERGE PENDING. The `ios-smoke` ci.yml job
mounts every `CURATED_SHADER_ID` via the catalog switch and asserts a non-blank surface (pixel
variance, threshold 120 — NOT golden-image equality), driven by `example/scripts/
smoke-shader-catalog.ts` over agent-device. Proven BOTH WAYS on a booted sim (green on all 10
ids; RED on a reintroduced blank stub, variance 0.0). F16 marked done in
`research/wip/critique-2026-06-10.md`.
- RESIDUAL (the one live watch-item): the lane is proven on a LOCAL sim only. The GitHub-hosted
  `macos-26` run — including whether the hosted-VM simulator actually GPU-renders Metal non-blank
  — is UNVERIFIED, and `ci.yml` only triggers on `main`, so the lane's first real run lands when
  this branch reaches a PR to `main`. Locally-green ≠ CI-green. WATCH that first run; if the
  hosted sim renders blank, the documented fallback is a layout-bounds / non-zero-mount assertion
  that needs no GPU pixels (catches the U3-006 0×0-remount cause without GPU output).
- The harness lives in `example/scripts/`, outside the packages biome scope + the example
  tsconfig (excluded) — no configured linter/tsc covers it; it is a bun-run CI script verified
  end-to-end. Deliberate (a config for one script is gold-plating).

NEXT — nothing is in a ready/spec'd state; EVERY remaining DEF row is `merged` or `blocked`
behind a trigger. Do NOT start a trigger-gated row unprompted — ask the human which trigger fired.
Candidates and whether the trigger is plausibly live:
- DEF-016 — mechanical rename `react-native-fx` → `react-native-fxkit` + align docs/skills.
  Trigger "pre-publish" — only when actually publishing (maintainer: publish after V2 is done).
- DEF-021 — true `Fx*` SharedObject / `FxEffectRenderer` / HybridObject shape. Trigger: first
  detached JS-held handle / per-child control / the `05` Nitro re-eval. Speculative until then.
- DEF-006 — OPTIONAL app-owned Reanimated UI-thread channel (MOT-007). Trigger: a real app-owned
  continuous-source integration. NOT on any active path.
- DEF-001/002/012/013/018/019 — each waits on a concrete demand (BYO / per-child / declarative
  state / V2 native mod / presence-under-nav / first shaped shader). None obviously fired.

CANDIDATE DOC-CLEANUP (not blocking, now actionable): the DEF-014 row flagged a follow-up — the
"curated shaders DO render on the sim" finding vs the `v1-cut-checklist` waiver premise, a small
doc-cleanup once confirmed across the toolchain. DEF-017 just confirmed the curated catalog
renders non-blank on a sim, so that confirmation condition is met — reconcile the waiver wording
when convenient.

LEDGER: RT-002 RESOLVED this session. Remaining: MOT-002 (`tune` vocab, slaved to MOT-001) and
MOT-007 (deferred, DEF-006). Everything else resolved or trigger-deferred.

START BY: reading the binding docs. Then pick up a HUMAN-CHOSEN trigger-gated row (ask which
trigger fired — do not assume), OR, if the human is taking DEF-017 to a `main` PR, watch that
first hosted CI run and resolve the DEF-017 residual. Do not start DEF-006, the `wip/` material,
or any trigger-gated row unprompted.
