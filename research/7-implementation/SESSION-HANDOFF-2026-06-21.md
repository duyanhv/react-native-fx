# Session handoff — 2026-06-21 (FxView lands: U12-001 spec → built → reviewed → device-verified → docs-closed → MERGED. The surface layer now has its state-driven content-motion primitive. Two Android parity fixes (px→dp, clip overdraw) were folded at the device gate; the effect prop was split out to a new U12-002. Supersedes SESSION-HANDOFF-2026-06-20.md.)

Paste the block below into a fresh session to continue.

State of the world: the runtime engine (Units 1–9) + the surface front door (`<Fx effect>` + `EdgeGlow`,
U10) + the `fx.effect.*` builder (U11) + `FxPressable` press feedback (U13) were already device-proven and
merged. This session took **U12-001 `FxView`** end-to-end — recommendation pass → spec → executor build →
independent review → two device-gate rounds → device-verified → docs-closed → merged. U12-001 is committed
on integration/0.1.x.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks (write `tasks/<id>/README.md` from the authority sources, row → spec'd then
  state in-progress — `spec'd` is a checklist box, NOT a progress.md row state), write paste-ready
  executor / device-gate PROMPTS for the human to run, REVIEW returned work, drive DESIGN with prose
  + a recommendation, and do the bookkeeping. You do NOT implement units; SUBAGENTS execute.
  **Bounded review/gate fixes the maintainer directs (a few lines, fully specified) are fine** —
  this session that meant the `super.applyResolvedConfig()` call, and the two Android device-gate
  fixes (px→dp density-scale + `clipChildren=false` overdraw), all maintainer-directed, applied +
  built green by the planner.
- Cross-check EVERY returned step independently — RE-RUN the gates yourself (incl. native: Android
  `compileDebugKotlin`; for iOS confirm `pod install` ran by checking the new view is referenced in
  `example/ios/Pods/Pods.xcodeproj` — a bare "BUILD SUCCEEDED" is hollow until the file is actually
  compiled-in), read the diff, OPEN THE EVIDENCE (verify every cited screenshot EXISTS and its mtime
  fits the gated build — round-1 shots show pre-fix state; re-gated claims must cite the post-fix
  re-gate shots), CHECK THE TREE STATE, and audit COMMENTS against the guide before committing. This
  session that discipline confirmed U12 was clean (vs U13's three rounds) and caught the px/points +
  clip parity gaps at the device gate.
- Device gates + the `device-verified` / `merged` ticks are the human's; tick ONLY when explicitly
  delegated. This session the maintainer ran both device rounds hands-on, ratified verbally ("it
  passes" after the by-hand interrupt test), and explicitly delegated the merged tick + push.
  Commits: human-directed, on integration/0.1.x, Conventional Commits, NO AI co-author trailer.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. This session
  the U12 scope fork (defer `effect`) and the Android-lift forks (px→dp first; clip overdraw; A-first
  with elevation as the escape hatch) were all resolved this way.
- Banked lessons, honored (now also auto-memories where load-bearing): COMMIT reviewed headless work
  BEFORE a device gate; SELF-AUDIT comments against the Code Comments Guide before committing —
  terse + iceberg, match the file's density, no name-restating, no internal ids in shipped code (the
  law/research vocabulary like "cross-platform-uniform seed" belongs in research docs, not code);
  agent-device SYNTHETIC gestures cannot race a spring, so interrupt/cancellation FAILs there are
  artifacts — ratify by hand; `git diff --check` whitespace gate; evidence `.png` are gitignored
  (tracked record is `device.md`).

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules). Rule #2 + the law: agnostic
   names, platform-NATIVE defaults — magnitudes diverge per platform, never a cross-platform-uniform
   seed (U12 iOS lift 1.03/−3pt vs Android 1.04/−6dp is the worked example).
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md (esp. the row-state
   set — `spec'd` is a checklist box, the row state is `in-progress`).
3. guides/Device Verification Guide.md (§"Launching the app" — native change ⇒ REBUILD) + the Code
   Comments Guide (the comment self-audit is a `commented`-gate check).
4. research/7-implementation/blueprint.md (Phase S Units 10–15 as-built), progress.md (the Surface /
   Phase-S section — the tracker), decision-ledger.md.
5. The auto-memory index named in CLAUDE.md.

WHAT THIS SESSION DID (all on integration/0.1.x):

1. U12-001 `FxView` — recommendation pass → spec'd → executor-built → reviewed → DEVICE-VERIFIED →
   docs-closed → **MERGED**. Architecture as-built: a new `FxStateView` content host (iOS + Android,
   over `FxNativeView`, no Metal) that reuses the shipped `FxPressableView` intermediate-wrapper
   pattern + `FxAnimationDriver` as-is, driven by `FxStateViewCoordinator`'s N-state current→target
   FSM (first-apply snaps, same-target no-op, in-flight retarget emits the superseded transition
   `interrupted:true` before retargeting, settle emits `finished:true`). Settle-only `onFxStateChange`
   `{state, finished, interrupted}`; public `onStateChange` maps onto it in `FxView.tsx`. Ships
   `state`/`preset`/`motion`/`transition`; `lift` preset (`idle`→identity, `selected`→lift). Two
   Android device-gate fixes folded: **px→dp** (`View.translationY` is pixels — density-scale fixed
   travel so a motion value is an RN layout unit matching iOS points) and **clip overdraw**
   (`clipChildren/clipToPadding=false` on `FxStateView`+container — Android `ViewGroup` clips children
   by default where the iOS wrapper does not; allows transform overdraw without changing Yoga layout).
   Commits `6022aa7` (impl) + `b88fd1c` (Android fixes) + `1b3a243` (docs-closed) + the merged tick.

2. Docs-closed: `structure.{ios,android}.md` (state host + driver + dispatch + clip parity); `40`
   `onStateChange` wired + payload reconciled `{from,to}`→`{state,finished,interrupted}`; `57 §FxView`
   state vocab resolved + seeded lift defaults; blueprint Unit 12 Shape corrected (native as-built,
   not "Surface"); `52`/index export. Full record: tasks/U12-001/ (README + notes + evidence/device.md).

NEXT — spec the next surface unit. Options, all unblocked (deps merged):
- **U12-002 (`effect` on `FxView`)** — SPAWNED this session from the U12-001 scope split; NOT YET
  SPEC'D. Effect decoration attached to wrapped content — a distinct ownership problem (z-order,
  clipping, composition position, pointer pass-through, hosted-vs-expo-view relative to the content
  host). Owns its own spec + device matrix; closes the `57` `FxView` `effect` line. Design-then-build.
- **U14-001 (`FxGroup`/`FxItem`)** — glass-only morph compound over `FxGroupView` (DOC-006), `spacing`
  deferred V2. NOT YET SPEC'D.
- **U15-001 (typed material config)** — extend `MaterialConfig`/the `material` node with native-backed
  uniforms only (`tint`/`colorScheme`/`weight`), never a uniform native ignores (the `fill`/`filter`
  trap). NOT YET SPEC'D.
- **U10-002 (symbol string surface)** — design-then-build, not yet spec'd.
Pick per maintainer; recommend prose+rec, and a recommendation-pass-before-spec for any unit with
load-bearing forks (as U12/U13 had).

ALSO STILL TRUE / OPEN:
- Surface contract status: `Fx`/`<Fx effect>` + `EdgeGlow` (U10) + `fx.effect.*` (U11) + `FxPressable`
  (U13) + `FxView` (U12) all SHIPPED + device-verified + merged. Still unbuilt: `effect`-on-`FxView`
  (U12-002), `FxGroup`/`FxItem` (U14), typed material (U15), the symbol string surface (U10-002).
- Pre-existing latent residual (flagged, NOT U12's to fix): the px-vs-points split also lives in
  `FxPresenceCoordinator.resolveTravel` for user-specified fixed `translateY`. Presence's `transient`
  preset dodges it via measured-edge travel, so it is not currently biting — worth a separate look.
- DEFERRED from U10 (still open): the manifest does not model per-shader interactive capability — a
  hosted-only shader with `interactionMode="active"` passes `select()` then `onError`s at mount.
- Publishing (DEF-016) stays correctly blocked: V2/publish is not done while the surface is partial.

START BY: read the binding docs (esp. blueprint Phase S + the progress Surface section). Then, on the
maintainer's word, SPEC U12-002 / U14 / U15 / U10-002. Do not start a trigger-gated DEF row unprompted.
