# Session handoff — 2026-06-22 (Phase S surface front door all but complete: U14-001 `FxGroup`/`FxItem` glass morph compound MERGED — iOS-26 spike PASSED, Android first-mount-collapse defect found + fixed at the gate. The ONLY remaining unbuilt surface unit is U10-002, the symbol string surface. Supersedes SESSION-HANDOFF-2026-06-21.md.)

Paste the block below into a fresh session to continue.

State of the world: the runtime engine (Units 1–9) + the surface front door are now essentially all merged on
integration/0.1.x — `<Fx effect>` + `EdgeGlow` (U10-001), `fx.effect.*` (U11-001), `FxView` state motion
(U12-001) + `FxView effect` decoration (U12-002), `FxPressable` (U13-001), typed material `tint`/`colorScheme`
(U15-001), and now `FxGroup`/`FxItem` (U14-001). The ONLY remaining unbuilt surface unit is **U10-002** (the
symbol string surface) — design-then-build, NOT YET SPEC'D, with a resolution fork (recommendation-pass first).

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks (write `tasks/<id>/README.md` from the authority sources; row → `spec'd` is a checklist box,
  the progress.md row state is `in-progress`), write paste-ready executor / device-gate PROMPTS for the human
  to run, REVIEW returned work, drive DESIGN with prose + a recommendation (+ a recommendation-pass-before-spec
  for any unit with load-bearing forks), and do the bookkeeping. You do NOT implement units; SUBAGENTS / the
  human execute. **Bounded review/gate fixes the maintainer directs (a few lines, fully specified) are fine** —
  this session that meant the U14-001 Android first-mount-collapse fix (two attempts: the FrameLayout copy of
  the FxStateView pattern FAILED on device; the ReactViewGroup swap passed), executor-applied + planner-reviewed.
- Cross-check EVERY returned step independently — RE-RUN the gates yourself (packages tsc/lint/test/build;
  example tsc; native: Android `compileDebugKotlin --rerun-tasks` so it isn't cached; iOS `xcodebuild` after
  `pod install`), read the FULL diff, OPEN THE EVIDENCE, CHECK THE TREE STATE + evidence PATH, and audit
  COMMENTS + internal-id leaks before committing.
- Device gates + the `device-verified` / `merged` ticks are the human's; tick ONLY when explicitly delegated.
  This session the maintainer ran the U14-001 iOS spike + both-platform device verify and delegated the merged
  tick + the closeout bookkeeping. Commits: human-directed, on integration/0.1.x, Conventional Commits, NO AI
  co-author trailer.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE a device gate (esp. native); SELF-AUDIT comments
  + internal-ids before committing; evidence `.png` are gitignored (tracked record is `device.md`) under
  `research/7-implementation/tasks/<id>/evidence/`. NEW banked lesson from this session: a native Expo container
  hosting MULTIPLE absolutely-positioned RN children must route them into a `ReactViewGroup` (no-op `onLayout`) —
  `ExpoView` is a `LinearLayout` and an intermediate `FrameLayout` both re-stack children to the origin → first-
  mount collapse. The `FxStateView`/`FxPressableView` FrameLayout pattern is single-full-bleed-child only and
  carries this as a latent risk if ever given multiple absolute children.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 rules + the law + operating rules). Rule #2 + the law: agnostic names, platform-NATIVE
   defaults — magnitudes/fidelity diverge per platform/rung (U14: iOS 26 system glass MORPH vs Android flat
   material, the ratified DOC-006 shape-native divergence — NOT a gap to fix).
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md (the row-state set).
3. guides/Device Verification Guide.md (§"Launching the app" — native change ⇒ REBUILD) + the Code Comments Guide.
4. research/7-implementation/blueprint.md (Phase S Units 10–15 as-built), progress.md (the Surface / Phase-S
   section — the tracker; U10-002 is the only non-merged surface row), a2-triage.md, decision-ledger.md.
5. The auto-memory index named in CLAUDE.md (note the new "Android layout gotchas" entry).

WHAT THIS SESSION DID (all on integration/0.1.x):

1. **U14-001 `FxGroup`/`FxItem` — MERGED** (`bf4c372` headless + `fa95df1` Android gate fix). The glass morph
   compound. **iOS-26 spike PASSED:** in `<FxGroup><FxItem><Fx effect="glass"/></FxItem>×2</FxGroup>` the sibling
   glass surfaces MORPH/MERGE when close and separate when apart — even though the glass is a GRANDCHILD of the
   UIKit `UIGlassContainerEffect` container's `contentView` (nested under `FxHostedView`), not a direct child like
   `GlassContainer.swift`. The spec-anticipated bounce did NOT happen; `FxItem` stays a JS Fragment (zero native
   layers). **Android first-mount-collapse DEFECT found + fixed at the gate:** items collapsed onto the origin on
   first mount (a gap toggle "fixed" them via Fabric re-layout). Root cause: `ExpoView` is a `LinearLayout` that
   re-arranges absolutely-positioned children; the first fix (intermediate `FrameLayout`, copying the FxStateView
   pattern) ALSO failed because FrameLayout re-stacks by gravity (top-left) — that pattern was only ever exercised
   against a single full-bleed child. Fix: route children into a `com.facebook.react.views.view.ReactViewGroup`
   (no-op `onLayout`, size-only `onMeasure`) so the Fabric mounting frames survive. Device-verified both platforms
   6/6. Docs-closed: `structure.{ios,android}.md` (done at headless) + `57` (Decision 4 + wording tighten + stale
   `GlassEffectContainer`→`UIGlassContainerEffect`) + `21` (Decision 5 + resolved note) + `52`/index + blueprint
   Unit 14 + research/README compound row. evidence/device.md written.

THE IMMEDIATE NEXT ACTION — recommendation-pass → spec U10-002 (the symbol string surface):
- **U10-002 is the LAST unspec'd / unbuilt surface unit.** Design-then-build; it has a resolution FORK, so do a
  recommendation-pass-before-spec (prose + recommendation + pushback, NOT AskUserQuestion), get the maintainer's
  call, THEN write tasks/U10-002/README.md.
- The fork: the zero-config `symbol-*` ids (`24-symbols §58`: `<Fx effect="symbol-bounce"/>`) need a symbol NAME
  (`SymbolConfig.name`) — what does a zero-config `symbol-*` render with no name? Options to weigh: (a) a default/
  placeholder symbol; (b) `symbol-*` is name-required and errors/no-ops without one; (c) route the explicit
  `{name, animation}` config through the Unit 11 `fx.effect.*` builder and treat the bare string as animation-only
  sugar. Recommend one, ground it in `24`/`55`/`57` + the shipped `fx.effect.*` builder semantics.
- iOS `FxSymbolView`/`setSymbolConfig`; Android symbol is DEFERRED (AVD/Lottie planned) — Android divergence
  localized to `structure.android.md`, per rule #6.

ALSO STILL TRUE / OPEN:
- Surface contract: `Fx`/`<Fx effect>` + `EdgeGlow` (U10-001) + `fx.effect.*` (U11-001) + `FxView` + `FxView
  effect` (U12) + `FxPressable` (U13) + typed material (U15) + `FxGroup`/`FxItem` (U14) ALL SHIPPED + merged.
  The symbol string surface (U10-002) is the only unbuilt surface piece.
- DEVICE FINDING worth carrying into end-user `skills/` docs (not yet written): edge-glow behind FLUSH opaque
  content only shows at the corners — the intended "glowing frame" needs the content INSET (U12-002, `57` Decision 2).
- Pre-existing latent residual (flagged, not owned by any open unit): the px-vs-points split in
  `FxPresenceCoordinator.resolveTravel` for user-specified fixed `translateY` (presence's `transient` preset dodges
  it via measured-edge travel, so not currently biting).
- DEFERRED from U10 (open): the manifest does not model per-shader interactive capability — a hosted-only shader
  with `interactionMode="active"` passes `select()` then `onError`s at mount.
- LATENT (newly noted): `FxStateView`/`FxPressableView` use an intermediate `FrameLayout` and would hit the same
  first-mount-collapse bug if ever given multiple absolutely-positioned children — they currently host a single
  full-bleed child, so not biting. The ReactViewGroup fix is the template if it ever does.
- Publishing (DEF-016) stays correctly blocked: V2/publish is not done while the surface is partial (U10-002 open).

START BY: read the binding docs (esp. blueprint Phase S + the progress Surface section). Then, on the maintainer's
word, run the U10-002 recommendation-pass (the immediate next action), get the fork call, and spec U10-002.
Do not start a trigger-gated DEF row unprompted.
