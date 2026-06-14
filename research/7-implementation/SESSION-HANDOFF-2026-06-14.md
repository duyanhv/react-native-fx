# Session handoff — 2026-06-14 (V1 cut closed; V2 opening)

Paste the block below into a fresh session to continue. Supersedes
`SESSION-HANDOFF-2026-06-12.md`.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks, write executor PROMPTS, REVIEW returned work, and do the bookkeeping. You do
  NOT implement directly. SUBAGENTS execute (the human dispatches them in separate sessions and
  pastes results back). When you draft an executor / agent-device prompt, hand it to the human.
- Cross-check EVERY step. When an agent reports back, verify independently — read the diff,
  re-run the gates, read the evidence. Never trust a summary. (This session caught a `52`
  Decision-10 contradiction and verified every merge-tick against `git log` before flipping.)
- Device gates and the `device-verified` / `merged` ticks are the human's. The human MAY
  delegate specific ones explicitly (this session they did, for a stale merge batch + an npm
  cleanup) — but default to never ticking those two.
- For open-ended DESIGN, drive with PROSE + pushback, NOT the AskUserQuestion tool. Reserve
  AskUserQuestion for discrete either/or calls.
- Commits: only when asked; on `integration/0.1.x`; NO AI co-author trailer; Conventional Commits.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules).
2. agents/session-protocol.md (start/during/end sequence).
3. research/7-implementation/progress.md (the tracker) + subtask-protocol.md (lifecycle, the
   cardinal closure rule, task types) + v1-cut-checklist.md (V1-cut readiness, waivers).
4. The auto-memory index named in CLAUDE.md's memory section (planner-not-implementer now reads
   "drive V2"; prose-not-multiple-choice; agent-driven device tests; no-AI-coauthor;
   example-consumes-by-package-name; wip-goes-in-research-wip).

WHAT SHIPPED LAST SESSION (done — do NOT redo):
- DEF-015 (V1 naming surface freeze) MERGED — `16f3725` + `8419d09`. Four calls: (a) `<Fx
  effect={fx.effect.*}>` kept as-is, no bare `effect` export; (b) `interactionMode`
  `none|passive|active`, `controlled` deferred to DEF-020; (c) `hosted`/`expo-view` are
  internal lowering vocabulary, never end-user; (d) **package name = `react-native-fxkit`**
  (revised from `@react-native-fx/core` — the scope needs a by-hand npm org creation, no CLI
  path; `react-native-fxkit` is already owned/published). Recorded in `50`/`55`/`30`/`01`/`02`/`52`.
- DOC-022 (V1-cut closeout sweep) MERGED — `57b8033`. RT-012 resolved (`35`: V1 stays
  presence-specific; generalization → DEF-012 V2). RT-003 resolved BY CITATION (`31`:
  shared-singleton U4-003/EX-002, fresh-drawable-on-resume U3-008, continuous-while-active cheap
  RT-006/U8-001). Struck `35`'s stale `05`-falsification question (SPINE-009 closed via U9-002).
  Wrote `v1-cut-checklist.md`. Ticked the stale merge batch to `merged` (DOC-006/009/011/012,
  U3-004, U9-001/002, U3-002 state normalized, U3-007 with A1-2 iOS-OS-degradation WAIVED), and
  U8-002/U8-003.
- Publishing is V2-GATED — `67dccd6`. No V1 npm publish; `packages/package.json` keeps
  `react-native-fx` until pre-publish. DEF-016 (mechanical rename to `react-native-fxkit` +
  `skills/` parity story) does NOT run until after V2.

CURRENT STATE: the V1 cut is CLOSED. No V1-scoped ledger row is left open (only MOT-002 and
MOT-008 stay `open` — both V2-scoped, non-blocking). Standing objective is now: DRIVE V2.

V2 FRAMING (corrected last session — do not get this wrong again):
- **V2 = the DEF-* rows tagged `V2`** in progress.md's deferred table: DEF-014 (iOS `source`
  rung — the keystone/first), DEF-003 (portal/root overlay), DEF-004 (`Fx.Stack`), DEF-005
  (`edge`/`origin` sugar), DEF-007 (BYO envelope), DEF-008 (runtime shader compilation),
  DEF-009 (Android content-filter), DEF-010 (`@gorhom/bottom-sheet` coexistence), DEF-011
  (drag/tilt G3), DEF-013 (config plugin, when forced), DEF-006 (regime-C UI-thread channel).
- **The `research/wip/` Lane 1 / capability-boundary-classifier / signal-grammar docs + DOC-021
  are POST-V2** ("expand the lib"). PARKED — do NOT start them. (The human corrected an earlier
  mis-framing that pointed there.)

NEXT TASK — spec DEF-014, the V2 opener (PENDING the human's go — they had not yet confirmed
"spec it" when the session ended; confirm the opener, or let them pick another V2 backlog item):
- DEF-014 = the iOS-hosted `source` rung (`scrollTransition`/`visualEffect`, Android deferred),
  the docs-designated "FIRST V1.x task — scroll-linked presentation is the category's demand
  center" (critique F7). It is the leading edge of the V2 `source` driver (`40` decision 7).
- SPEC it: create research/7-implementation/tasks/DEF-014/ from the subtask template. Contract
  anchors: `3-motion/40` (the `source` driver — phase V2, substrate-tiered, ZERO per-frame JS),
  `3-motion/42`, `4-runtime/34` (the driver), `5-realization/structure.ios.md` (PIN the SwiftUI
  mechanic before any code). Decision: `implement` the iOS slice only (Android deferred — keep
  it a planned, non-selectable rung). Rules gate: #1 (native owns the frame loop — the
  scroll-linked read is native, never per-frame JS), #2 (agnostic names, platform-native
  defaults), #3 (substrate). Device-verify: YES (scroll-linked feel on a device; iOS visuals
  need a physical iPhone per the cut waiver). Reference: consult `references/` for the SwiftUI
  scroll-effect idiom (HOW only), diff the actual template.

START BY: stating the current task, then confirm DEF-014 as the V2 opener with the human (prose).
Then spec it + write the executor prompt. Do NOT touch the wip/ post-V2 material or DEF-016.
