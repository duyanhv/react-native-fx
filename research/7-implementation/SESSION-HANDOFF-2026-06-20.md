# Session handoff — 2026-06-20 (FxPressable lands: U11 builder MERGED+PUSHED, then U13 `FxPressable` went spec → 3 review rounds → DEVICE-VERIFIED + docs-closed + ready-to-merge. The surface layer now has its press-feedback primitive. 30 commits sit unpushed on integration/0.1.x, held for the maintainer's merge-tick + push.)

Paste the block below into a fresh session to continue. Supersedes SESSION-HANDOFF-2026-06-19.md.
State of the world: the runtime engine (Units 1–9) + the surface front door (`<Fx effect>` + `EdgeGlow`,
U10) + the `fx.effect.*` builder (U11) were already device-proven and on the remote. This session finished
U11's owed gate and merged+pushed it, then built **U13-001 `FxPressable`** end-to-end — through three
review rounds — to device-verified + docs-closed. U13 is committed locally but NOT pushed.

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks (write `tasks/<id>/README.md` from the authority sources, row → spec'd), write
  paste-ready executor / device-gate PROMPTS for the human to run, REVIEW returned work, drive
  DESIGN with prose + a recommendation, and do the bookkeeping. You do NOT implement units; SUBAGENTS
  execute. **Bounded review-stage fixes the maintainer directs (a few lines, fully specified) are
  fine** — this session that meant the whole U13 event-pipeline/ripple/feedback fix chain, all
  maintainer-directed, applied + built green by the planner.
- Cross-check EVERY returned step independently — RE-RUN the gates yourself (incl. native: `pod
  install` + `xcodebuild`, Android `assembleDebug`), read the diff, OPEN THE EVIDENCE (verify every
  cited screenshot actually EXISTS and its mtime matches the gated commit — do not trust captions),
  and CHECK THE TREE STATE. This session that discipline caught: U13's native views registered in
  neither module (dead at runtime); the recognizer never activated; two `<Fx interactionMode>`
  regressions from the FSM refactor; the iOS view that NEVER compiled across two rounds (no `pod
  install`); a device re-gate that cited screenshots which did not exist; and the Android
  black-square + small-ripple feedback chain.
- Device gates + the `device-verified` / `merged` ticks are the human's; tick ONLY when explicitly
  delegated. This session the maintainer ran the device hands-on and confirmed results verbally
  ("pass for android", "1 pass, 2 pass") — that ratified device-verified; the MERGED tick + the PUSH
  stay owed to their explicit word. Commits: human-directed, on integration/0.1.x, Conventional
  Commits, NO AI co-author trailer.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. This session
  the Android-feedback approach fork (A: material ripple via the container pressed-state path vs C:
  FSM-driven scale/opacity) was resolved this way: maintainer chose A-first with C as the explicit
  escape hatch.
- Banked lessons, honored (now also auto-memories): COMMIT reviewed headless work BEFORE a device
  gate; a NEW native source file is not in the iOS build until `pod install` runs (a bare
  "BUILD SUCCEEDED" is hollow until the file is actually referenced + compiled); device-gate prompts
  must spell out the launch sequence (Metro + `example:ios`/`example:android`) and `pod install` as a
  hard prerequisite, and require that every cited screenshot exist; agent-device SYNTHETIC gestures
  under-trip `scaledTouchSlop`, so cancellation/scroll-yield FAILs there are usually artifacts —
  ratify by hand; COMMENTS stay terse + iceberg-only and MATCH the file's (often sparse) density —
  no name-restating (the maintainer flagged this twice; it is a `commented`-gate check); NEVER leak
  internal ids into shipped code comments; evidence `.png` are gitignored (tracked record is
  `device.md`); `git diff --check` whitespace gate — strip trailing whitespace (the `device.md`
  markdown double-space line-breaks tripped it).

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 non-negotiable rules + the law + operating rules). Rule #5 front door = preset/
   feedback/effect props on your content; `FxPressable feedback="native"` is now the shipped press door.
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md.
3. guides/Device Verification Guide.md — esp. the **"Launching the app"** section added this session
   (Metro + `bun run example:ios`/`example:android`, the rebuild-vs-Metro-reload rule, `pod install`
   for new native files, device selection, the warm-launch caveat). Binding for every device gate.
4. research/7-implementation/blueprint.md (Phase S Units 10–15 + Phase A as-built), progress.md (the
   **Surface build / Phase-S** section — the tracker), architecture.md (§1 + §11), decision-ledger.md.
5. The auto-memory index named in CLAUDE.md (new this session: device-verify launch sequence;
   review native-build + evidence checks; comments terse-iceberg).

WHAT THIS SESSION DID (all on integration/0.1.x):

1. U11-001 (`fx.effect.*` builder) FINISHED + MERGED + PUSHED. Added the builder-form section to
   `example/screens/effect-surface.tsx` (sections 7–8: `fx.effect.glow/glass/mesh` == their string
   forms + a 2-render-target chain → first step only). Device gate 5/5 PASS iOS 18 sim + POCO F1.
   Docs-closed (`55` Status → shipped, "builder form for one effect", NOT "composition"). PUSHED — PR
   #7 reflects through the U13 spec (origin tip `35aa4da`).

2. guides/Device Verification Guide.md — NEW "Launching the app" section (the launch model +
   rebuild-vs-reload rule + `pod install` + device selection + warm-launch caveat); mirrored in the
   Contributing Guide; added root `example:android` script (symmetry with `example:ios`).

3. U13-001 `FxPressable` — spec'd → built → THREE review rounds → DEVICE-VERIFIED → docs-closed →
   **ready-to-merge (NOT pushed/merged-ticked)**. Architecture as-built: the proven `FxPressHandler`
   FSM refactored behind an `FxPressHost` protocol (hit-target / begin-change-end-cancel / long-press),
   serving BOTH `<Fx interactionMode>` (`FxSurfaceView`) AND a new `FxPressableView` (over
   `FxNativeView`, intermediate-wrapper pattern, NOT the Metal surface). Events cross as `onFx`-prefixed
   (avoid reserved `topPress`), public `onPress*` map onto them in `FxPressable.tsx`. Android feedback =
   **Option A**: material ripple driven via the container pressed-state path (`drawableHotspotChanged` +
   `isPressed`), full-cover via `RADIUS_AUTO`, bounded by a `RectShape` mask. iOS = scale/opacity
   `CASpringAnimation`. Full device matrix PASS both platforms (maintainer hands-on). Docs-closed:
   `structure.{ios,android}.md` feedback mechanic, `57`/`56` `feedback="native"` device-verified,
   blueprint Unit 13 Shape note corrected (native unit, not "JS/Surface"). Three-round trail in
   reviews/U13-001.md + evidence/device.md.

NEXT — in order:
(1) PUSH integration/0.1.x — **30 commits unpushed** (all of U13-001, `165a5e3`…`c0cc6e2`) — and tick
    U13 `merged`, ON THE MAINTAINER'S EXPLICIT WORD (held all session). Updates PR #7. The U13 spec
    README + tracker sit at `ready-to-merge` with `[ ] merged  ready — pending maintainer merge-tick + push`.
(2) SPEC the next surface unit. Options, all unblocked (deps merged): **U12-001 (`FxView`)** — state-
    driven content (`state`/`preset`/`motion`/`effect`); wires the UNBUILT `onFxStateChange` native
    dispatcher (heavier — new native work both platforms). **U14-001 (`FxGroup`/`FxItem`)** — glass-only
    morph compound over `FxGroupView`. **U15-001 (typed material config)** — extend `MaterialConfig`/the
    `material` node with native-backed uniforms only. **U10-002 (symbol string surface)** —
    design-then-build, not yet spec'd. Pick per maintainer; recommend prose+rec, and a
    recommendation-pass-before-spec for any unit with load-bearing forks (as U13 had).

ALSO STILL TRUE / OPEN:
- Surface contract status: `Fx`/`<Fx effect>` + `EdgeGlow` (U10) + `fx.effect.*` (U11) + `FxPressable`
  (U13) all SHIPPED + device-verified. Still unbuilt: `FxView` (U12), `FxGroup`/`FxItem` (U14), typed
  material (U15), the symbol string surface (U10-002).
- U13 escape hatch documented: if the Android ripple (Option A) ever proves unreliable, **Option C**
  (FSM-driven scale/opacity on Android, like iOS) is the sanctioned fallback — an honest platform
  realization under owned gesture arbitration, recorded as such; not a failure of the abstraction.
- DEFERRED follow-up from U10 (still open): the manifest does not model per-shader interactive
  capability — a hosted-only shader with `interactionMode="active"` passes `select()` then `onError`s
  at mount. A stricter design degrades at select-time.
- Publishing (DEF-016) stays correctly blocked: V2/publish is not done while the surface is partial.

START BY: read the binding docs (esp. blueprint Phase S + the progress Surface section + the new
Device Verification "Launching the app" section). Then, on the maintainer's word, PUSH + tick U13
merged; OR spec U12/U14/U15/U10-002 if the human directs. Do not start a trigger-gated DEF row unprompted.
