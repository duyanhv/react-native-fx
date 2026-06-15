# Session handoff — 2026-06-15 (DEF-020 merged; redirect to native-owned drag/tilt — DEF-011 next)

Paste the block below into a fresh session to continue. Supersedes all earlier handoffs
(2026-06-12 / -14 deleted) and the earlier 2026-06-15 revisions (DEF-009 asset re-gate; the
DEF-020-as-keystone framing) — both now superseded by the ownership-split redirect below.

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
- A device gate proves the APK/`.app` THAT WAS BUILT, not the current tree. ALWAYS compare the
  built-binary mtime against the source-file mtimes before trusting a "device-verified" claim. A
  stale build (an old `.app` under `example/ios/build`, an APK predating a refactor) reads as a
  real pass but tests pre-fix code — this bit both DEF-009 (asset refactor after the APK) and the
  iOS review-fix first pass (Jun-12 `.app`). When JS is the only change, Metro serving working-tree
  JS over a current native build is a valid proof; when native changed, rebuild.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end) + research/7-implementation/subtask-protocol.md
   (lifecycle, the cardinal closure rule, task types).
3. research/7-implementation/progress.md (the tracker) + decision-ledger.md + v1-cut-checklist.md.
4. The auto-memory index named in CLAUDE.md (prose-not-multiple-choice; no-AI-coauthor;
   agent-driven device tests; example-consumes-by-package-name; revert-instrumentation-with-Edit-
   not-git-checkout; commit-before-device-gate; gate-agents-leave-dep-bumps).

CURRENT STATE (2026-06-15): V1 cut CLOSED. Driving V2. Publishing gated on V2 (DEF-016 at
pre-publish). Tree clean, local == origin/integration/0.1.x. MERGED IN THE V2 ARC BEFORE THIS
SESSION (do NOT redo): DEF-014 (iOS-hosted `source` rung), DEF-003 (portal = app's job), DEF-004
(`Fx.Stack` rejected), DEF-005 (`edge`/`origin` sugar rejected), DEF-007 (BYO envelope by
composition), DEF-008 (registry-sourced runtime shader compilation, FX-007), DEF-015 (naming freeze).

MERGED / DONE THIS SESSION (2026-06-15, human-delegated ticks — do NOT redo):
- DEF-009 (Android content-distort ripple, FX-008): `merged`. Evidence: `tasks/DEF-009/evidence/`.
- DEF-010 (doc-cleanup): `merged`.
- Review-fix arc: device-confirmed BOTH platforms. Record: `reviews/review-fix-arc-2026-06-15.md`.
- DEF-020 (`interactionMode="controlled"` — the view-ref DISCRETE write path: `setUniform`/
  `setHighlight` as Expo `AsyncFunction`s on the surface ref): `merged` (finishing commit `d39a096`;
  feature chain `d6ba13a`→`e4b1286`). Device spike R1–R5 PASS both platforms
  (`tasks/DEF-020/evidence/device.md`). The clobber rule (imperative write wins; cleared on
  exit-`controlled`) is the design crux. SCOPE SPLIT: DEF-020 = the view-ref write path ONLY; the
  true `Fx*` SharedObject / `FxEffectRenderer` / HybridObject half is now **DEF-021** (trigger-gated).
  `30` Decision 7 + `50` flipped `controlled` deferred→shipped.

ARCHITECTURE CLARIFIED THIS SESSION — the OWNERSHIP SPLIT (load-bearing; threaded through `40`/`30`/
`05`/the classifier — read it before touching continuous-motion work):
- fx-OWNED continuous interaction (drag/tilt) → NATIVE: a native recognizer reads the gesture and
  writes the uniform natively every frame (route 1, `40`). No per-frame JS, no Reanimated.
- app-OWNED continuous control → OPTIONAL Reanimated UI-thread prop-drive: the app's own Reanimated
  drives an fx-exposed UI-thread-animatable prop (Reanimated is the caller's transport, not fx's
  runtime).
- fx ships NO Reanimated/RNGH/worklet/JSI in `packages/`. The depth ownership line (DOC-021 NARROW
  ratification this session, `51e2d83`): external prop-drive = depth-1 ALLOWED; fx-authored
  worklet/JSI = depth-4 REJECTED. Canonical in `0-spine/05` Decision 5 + the classifier.

V2 NEXT — DEF-011 is the next spec-able / dispatchable task:
- DEF-011 — **native-owned** drag/tilt (G3 axis-aware claiming). Closes RT-002. `in-progress`
  (spec'd, `tasks/DEF-011/`). **No longer blocked by DEF-006.** Scope: a native pan recognizer
  extending `FxPressHandler`; axis-aware claiming/yielding (claim the drag axis, yield the cross-axis
  to ancestor scrollers); pointer-derived tilt; native uniform writes (vec2 OK — native, not the JS
  scalar path) into the DEF-020 buffer; native settle/spring-back. RNGH example-only. **Preflight +
  spike FIRST** (the axis-split modifies the frozen `FxPressHandler` all-movement yield — real
  coexistence risk). THREE OPEN FORKS to settle at spec-review: the axis-declaration API (lean:
  `active` + a `dragAxis` prop), the uniform names/range, the tilt mapping.
- DEF-006 — Reanimated UI-thread channel (MOT-007): RE-SCOPED to an OPTIONAL, trigger-gated
  app-owned integration spike (`tasks/DEF-006/`, `blocked`). NOT on the DEF-011 path. Spec only when
  a real app-owned integration is asked for.
- DEF-021 — true `Fx*` SharedObject / `FxEffectRenderer` / HybridObject shape (`blocked`,
  trigger-gated: first detached imperative handle / per-child / the `05` Nitro re-eval).

TRIGGER-GATED / do NOT start unprompted: DEF-001/002/006/012/013/016/017/018/019/021; `research/wip/*`
PARKED post-V2. NOTE: the DOC-021 *narrow* depth distinction was ratified this session; the FULL
DOC-021 classifier/Lane-1 promotion stays `spec'd` / pending a human read.

LEDGER: one genuinely-open non-blocking row — MOT-002 (`tune` vocab, slaved to MOT-001); RT-002
closes when DEF-011 lands; MOT-007 stays deferred (DEF-006). Everything else resolved or
trigger-deferred. (`v1-cut-checklist.md:22-24` lists MOT-008 as open — a correct historical snapshot;
DEF-007 resolved it the next day. Don't rewrite the frozen cut record.)

START BY: reading the binding docs. Then EITHER settle DEF-011's three open forks (axis API / uniform
shape / tilt mapping) with the human, OR hand the human the DEF-011 executor prompt (preflight +
spike first, both platforms). Drag/tilt is NATIVE-owned — do NOT route it through Reanimated. Do not
start DEF-006, the `wip/` post-V2 material, DEF-016, or any trigger-gated row unprompted.
