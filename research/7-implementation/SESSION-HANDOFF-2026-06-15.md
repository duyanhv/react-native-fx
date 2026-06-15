# Session handoff — 2026-06-15 (DEF-009 docs-closed + committed; asset-path re-gate pending)

Paste the block below into a fresh session to continue. Supersedes all earlier handoffs
(2026-06-12 / -14 deleted).

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor / agent-device PROMPTS, REVIEW returned work, drive DESIGN, and
  do the bookkeeping. You do NOT implement directly. SUBAGENTS execute (the human dispatches them
  in separate sessions and pastes results back). Hand executor/device prompts to the human.
- Cross-check EVERY returned step independently — read the diff, RE-RUN the gates yourself, read
  the evidence, and CHECK THE TREE STATE. Never trust a summary.
- Device gates + the `device-verified` / `merged` ticks are the human's; never tick them unless
  explicitly delegated. Commits: ONLY when the human says so; on `integration/0.1.x`; NO AI
  co-author trailer; Conventional Commits.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE dispatching a device-gate agent
  (a prior device agent `git checkout`-wiped uncommitted native work); the device prompt must
  forbid `git checkout`/`stash`/`reset` on the dirty tree. Gate/maintainer agents leave STRAY
  changes — dep bumps in `example/package.json`+`bun.lock`, and post-build source edits — REVERT
  the strays, and never conflate them with verified work.
- NEW LESSON THIS SESSION (load-bearing): a device gate proves the APK THAT WAS BUILT, not the
  current tree. ALWAYS compare the built-APK mtime against the source-file mtimes before trusting
  a "device-verified" claim against the working tree. This session the run-2 APK built 08:38 but a
  maintainer asset-extraction edit landed 08:50 — the 7/7 covers the inline-const build, NOT the
  asset-load path now in the tree. A naive "ready-to-merge" would have shipped device-unverified
  native source.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types).
3. research/7-implementation/progress.md (the tracker — find the DEF-009 device-pending row)
   + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit-
   not-git-checkout; commit-before-device-gate; gate-agents-leave-dep-bumps).

CURRENT STATE (2026-06-15): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). MERGED THIS V2 ARC (do NOT redo): DEF-014 (iOS-hosted `source` rung), DEF-003
(portal = app's job), DEF-004 (`Fx.Stack` rejected), DEF-005 (`edge`/`origin` sugar rejected),
DEF-007 (BYO envelope by composition), DEF-008 (registry-sourced runtime shader compilation,
FX-007), DEF-015 (naming freeze).

ACTIVE TASK — DEF-009 (Android content-distort ripple, closes FX-008): docs-closed + committed;
ASSET-PATH device re-gate pending. State of play:
- DONE + VERIFIED: FX-008 is docs-closed; the capability is 7/7 DEVICE-VERIFIED on the inline-const
  build (`495fbe5`, run 2: R1 first-render, R2 navigate-back, R3 background-resume — 3/3 — on top
  of run-1 6/7). Evidence: `tasks/DEF-009/evidence/device-run2.md` + `run2/` (PNGs gitignored per
  the `d21e9bb` policy). Review: `reviews/DEF-009.md`.
- COMMITTED THIS SESSION (clean tree): `5ef3fc7` (refactor — ripple sampler moved to the bundled
  asset `assets/shaders/content_ripple.agsl`, loaded via AssetManager, matching the
  `FxSurfaceShaderView`/`FxShaderView` curated-asset idiom; missing/malformed asset clears the
  effect), `9ba02b1` (docs-close FX-008: `02` prose flipped, `23` open question resolved,
  `data-layer` I5 reconciled + stale `status:'planned'` removed, `structure.android` mechanic
  pinned incl. the container's-own-attach loop-start + bundled-asset note, ledger
  `deferred`→`resolved`), `090f737` (DEF-009 task spec/notes synced to the asset sampler).
- THE ONE GAP (why the row is still `device-pending`): the bundled-asset refactor shipped AFTER the
  08:38 device APK, so the asset-LOAD path is device-unverified. New failure mode: if
  `content_ripple.agsl` does not merge into the APK, `ensureShader()→false` and the ripple silently
  no-ops. Risk is LOW (the 10 sibling curated shaders load from that exact dir and are
  device-proven), but not zero, and the maintainer's housekeeping edit shows no headless re-gate.
- NEXT, IMMEDIATE (bounded close-out — confirm with the human first):
  (1) HEADLESS re-gate (planner may run — it is reviewer verification): from `example/android`,
      `:react-native-fx:compileDebugKotlin --rerun-tasks` + `:app:assembleDebug`, then CONFIRM
      `content_ripple.agsl` is actually inside the built APK's `assets/shaders/`.
  (2) BOUNDED device re-confirm (the human's gate): R1 ONLY — ripple still distorts on first render
      from the BUNDLED asset (default `rippling=true`, no toggle). R2/R3/touch/intensity/pre-33/iOS
      are independent of where the shader TEXT comes from — do not re-run.
  Then flip the row to `ready-to-merge`; the human owns the `merged` tick (the DEF-009 commits may
  be squashed at merge if the human prefers). Alternative the human may choose: revert the asset
  refactor and ship the exact device-verified inline build instead.

REMAINING V2 AFTER DEF-009 (pick with the human; confirm before speccing):
- DEF-020 — the `Fx*` SharedObject / imperative JS-held handle + `controlled` write path
  (`setUniform`/`setHighlight`). 4-runtime, implement + device. Prerequisite for DEF-011 AND the
  `05` Nitro-reconsideration trigger — scope carefully.
- DEF-011 — drag/tilt (G3) axis-aware claiming. Closes RT-002. HARD-BLOCKED on DEF-020.
- DEF-006 — Reanimated UI-thread channel (regime C); adjacent to DEF-011's continuous-motion half.
- DEF-010 — `ready-to-merge` doc-cleanup; a trivial merge-tick when convenient.
- Trigger-gated / do NOT start unprompted: DEF-001/012/013/016/017/018/019; `research/wip/*`
  (Lane 1 / classifier / signal-grammar) is PARKED (post-V2).

LEDGER: FX-008 is RESOLVED (DEF-009). MOT-002 (`tune`, deferred to MOT-001) is the last
genuinely-open non-blocking row; everything else is resolved or trigger-deferred.

START BY: reading the binding docs, finding DEF-009 in progress.md (device-pending on the asset
path). Confirm with the human whether to (a) close out the bounded asset re-gate [headless +
R1 device] → `ready-to-merge`, or (b) revert to the device-verified inline build. After DEF-009
closes, ask which V2 item is next (DEF-020→DEF-011 arc if drag/tilt is the goal, else confirm the
backlog). Do not start the wip/ post-V2 material or DEF-016.
