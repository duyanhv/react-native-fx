# Session handoff — 2026-06-21 (Phase S nearly closed: U12-002 `FxView effect` + U15-001 typed material `tint`/`colorScheme` MERGED; U14-001 `FxGroup`/`FxItem` glass morph compound spec'd → built → reviewed → headless-committed, **its spike-first device gate is NOT YET DISPATCHED**. Supersedes the earlier 2026-06-21 handoff that closed U12-001.)

Paste the block below into a fresh session to continue.

State of the world: the runtime engine (Units 1–9) + the surface front door are essentially all merged on
integration/0.1.x — `<Fx effect>` + `EdgeGlow` (U10-001), `fx.effect.*` (U11-001), `FxView` state motion
(U12-001) + `FxView effect` decoration (U12-002), `FxPressable` (U13-001), typed material `tint`/`colorScheme`
(U15-001). **U14-001 `FxGroup`/`FxItem`** (the glass morph compound) is built + reviewed + headless-committed
(`bf4c372`) but **device-pending** — its spike-first iOS-26 gate has not been run. The ONLY remaining unspec'd
surface unit after U14 is **U10-002** (the symbol string surface).

---

You are resuming as the PLANNER / REVIEWER / INVESTIGATOR / HOUSEKEEPER on react-native-fx
(a native presentation runtime for React Native). Read the binding docs before acting; do not
freelance or over-build.

YOUR ROLE — honor it exactly:
- You SPEC tasks (write `tasks/<id>/README.md` from the authority sources; row → `spec'd` is a checklist box,
  the progress.md row state is `in-progress`), write paste-ready executor / device-gate PROMPTS for the human
  to run, REVIEW returned work, drive DESIGN with prose + a recommendation (+ a recommendation-pass-before-spec
  for any unit with load-bearing forks), and do the bookkeeping. You do NOT implement units; SUBAGENTS execute.
  **Bounded review/gate fixes the maintainer directs (a few lines, fully specified) are fine** — this session
  that meant the U12-002 comment tightening, the U15-001 Android tint-parser alignment + harness public-path row
  + `02` schema reconcile, and the U15 evidence relocation, all maintainer-directed, applied + re-gated green.
- Cross-check EVERY returned step independently — RE-RUN the gates yourself (packages tsc/lint/test/build;
  example tsc; native: Android `compileDebugKotlin --rerun-tasks` so it isn't cached; iOS `xcodebuild` after
  `pod install`), read the FULL diff, OPEN THE EVIDENCE (verify every cited screenshot EXISTS + mtime fits the
  gated build), CHECK THE TREE STATE + evidence PATH, and audit COMMENTS + internal-id leaks before committing.
  This session that discipline caught: the U15 device evidence written to a STRAY repo-root `tasks/` folder
  (relocated to canonical + commit header corrected), and the U15 Android `Color.parseColor` divergence from iOS
  (`#AARRGGBB` alpha-first vs iOS `#RRGGBBAA` alpha-last — would render different colors; fixed to a local parser).
- Device gates + the `device-verified` / `merged` ticks are the human's; tick ONLY when explicitly delegated.
  This session the maintainer ran U12-002 + U15-001 hands-on and delegated both merged ticks + push.
  Commits: human-directed, on integration/0.1.x, Conventional Commits, NO AI co-author trailer.
- Open-ended DESIGN → drive with PROSE + recommendation + pushback, NOT AskUserQuestion. This session the U12-002
  behind-only call, the U15 weight-strike (honesty test), and the U14 UIKit-container direction were all resolved
  this way.
- Banked lessons, honored: COMMIT reviewed headless work BEFORE a device gate (esp. native — the DEF-008 wipe
  lesson); SELF-AUDIT comments + internal-ids before committing (on-screen example task-id labels are the ACCEPTED
  idiom, not a leak — only CODE comments / shipped `packages/` must stay id-free); the type lockstep
  (`MaterialConfigConformsToManifest`, `config.ts:80`) is tsc-enforced — manifest + catalog edits land together;
  evidence `.png` are gitignored (tracked record is `device.md`), and they belong under
  `research/7-implementation/tasks/<id>/evidence/`, NOT a repo-root `tasks/`.

READ, IN ORDER (binding):
1. CLAUDE.md (the 9 rules + the law + operating rules). Rule #2 + the law: agnostic names, platform-NATIVE
   defaults — magnitudes/fidelity diverge per platform/rung, never a cross-platform-uniform seed (U15 `weight`
   was STRUCK precisely because it would be ignored on the primary iOS `UIGlassEffect` rung — the fill/filter trap).
2. agents/session-protocol.md + research/7-implementation/subtask-protocol.md (the row-state set).
3. guides/Device Verification Guide.md (§"Launching the app" — native change ⇒ REBUILD) + the Code Comments Guide.
4. research/7-implementation/blueprint.md (Phase S Units 10–15 as-built), progress.md (the Surface / Phase-S
   section — the tracker), a2-triage.md (the Outcome-1/3 honesty calls), decision-ledger.md.
5. The auto-memory index named in CLAUDE.md.

WHAT THIS SESSION DID (all on integration/0.1.x):

1. **U12-002 `FxView effect` — MERGED** (`379e62c` impl + `1c3d60a` docs/evidence + `17b2aa7` tick). The `effect`
   prop on `FxView`: JS composition only, behind-content, no new native code. `<View pointerEvents="none"
   style={absoluteFill}><Fx effect={effect} style={absoluteFill}/></View>` as first child inside `NativeFxStateView`
   → enters the intermediate container → behind content (earlier child = lower z-order), lifts with the transform,
   touch passes through. Behind-only V1; on-top overlay deferred. Device-verified 5/5 both platforms (Row 4 interrupt
   hand-ratified — the FSM is U12-001's, unchanged). DEVICE FINDING worth carrying: edge-glow behind FLUSH opaque
   content only shows at the corners — the intended "glowing frame" needs the content INSET. Captured in `57`
   Decision 2; not yet in end-user `skills/` docs (flag if writing those).

2. **U15-001 typed material `tint` + `colorScheme` — MERGED** (`7440f19` impl + `89b594b` review fixes + `00f6d6e`
   docs-closed + `cd967cf` tick). Native-backed both platforms' PRIMARY rung: iOS `UIGlassEffect.tintColor` +
   `effectView.overrideUserInterfaceStyle`; Android fx-drawn frost-scrim color + light/dark base. **`weight` STRUCK**
   (no `UIGlassEffect` thickness; fallback-only backing is the fill/filter trap; overlaps `variant`). Public field
   is `tint` (not `tintColor`). Manifest `material.uniforms` (color/enum already supported; `UniformSpec.default`
   made optional for the no-default `tint`) + `catalog.ts MaterialConfig` (tsc lockstep) + iOS `FxGlassSurfaceView`/
   `FxMaterialView` + Android material draw. 3 review fixes folded (Android parser aligned to iOS hex semantics;
   harness public `fx.effect.glass` path; `02` schema). Docs-closed: `02`/catalog/`21`/data-layer/structure +
   a2-triage Outcome 1 shipped. Device-verified 6/6 both platforms.

3. **U14-001 `FxGroup`/`FxItem` — BUILT + REVIEWED + HEADLESS-COMMITTED (`bf4c372`), DEVICE GATE NOT DISPATCHED.**
   iOS `FxGroupView` restructured to the UIKit `UIGlassContainerEffect` container (mirrors
   `references/expo/packages/expo-glass-effect/ios/GlassContainer.swift` — `UIVisualEffectView` +
   `mountChildComponentView` into `contentView`, guarded `@available(26)` + `NSClassFromString`), reusing the shipped
   UIKit `FxGlassSurfaceView` (U3-002); corrects the stale "SwiftUI `GlassEffectContainer`" wording in `structure.ios`.
   `FxItem` is a pure JS Fragment (zero native layer — maximally direct). Android passthrough, no morph (ratified
   DOC-006 divergence); no `spacing` prop (V2). All gates re-run green by the planner; review clean, no fix-round.

THE IMMEDIATE NEXT ACTION — dispatch the U14-001 SPIKE-FIRST device gate:
- The prompt is ready (it was in-chat at handoff; reconstruct from the task README's Proof + Spike-first sections).
- **THE SPIKE QUESTION (run FIRST, iOS 26):** in `<FxGroup><FxItem><Fx effect="glass"/></FxItem>×2</FxGroup>` placed
  close, do the two glass surfaces MORPH/MERGE? The glass is a GRANDCHILD of `contentView` (nested under
  `FxHostedView`), not a direct child like the reference — whether `UIGlassContainerEffect` merges nested glass is
  unverified. **This may BOUNCE** (spec-anticipated, NOT a failure): if no merge, the rework is a composition change
  so the glass is a DIRECT `contentView` child (FxGroup unwraps on mount — fragile, reparents Fabric views — OR a
  dedicated glass path that bypasses `FxHostedView`). Design that off the device evidence.
- If the spike PASSES: matrix = iOS-26 morph+separate+touch-through; iOS<26 individual no-crash; Android individual
  no-morph no-crash. Then docs-closed (the OWED items: `57` "real native morphing view" → "contributes a real native
  glass surface" + Decision 4; `21` confirm; blueprint Unit 14 Shape note; `52`/index already done).
- Harness: `example/screens/glass-morph.tsx` (two items + close/apart gap control + touch-through Pressables).
  Evidence → `research/7-implementation/tasks/U14-001/evidence/device.md` (CANONICAL path).

NEXT AFTER U14 — the last unspec'd surface unit:
- **U10-002 (symbol string surface)** — design-then-build, NOT YET SPEC'D. The zero-config `symbol-*` ids
  (`24-symbols §58`: `<Fx effect="symbol-bounce"/>`) + the default-symbol/name-resolution rule (a symbol needs
  `SymbolConfig.name` — what does a zero-config `symbol-*` render?), OR route the explicit `{name, animation}` config
  through the Unit 11 `fx.effect.*` builder. iOS `FxSymbolView`/`setSymbolConfig`; Android symbol deferred
  (AVD/Lottie planned). Recommendation-pass-before-spec (it has the resolution fork).

ALSO STILL TRUE / OPEN:
- Surface contract: `Fx`/`<Fx effect>` + `EdgeGlow` (U10) + `fx.effect.*` (U11) + `FxView` + `FxView effect`
  (U12) + `FxPressable` (U13) + typed material (U15) SHIPPED + merged. `FxGroup`/`FxItem` (U14) device-pending.
  Symbol string surface (U10-002) is the only unbuilt surface piece.
- Pre-existing latent residual (flagged, not owned by any open unit): the px-vs-points split in
  `FxPresenceCoordinator.resolveTravel` for user-specified fixed `translateY` (presence's `transient` preset dodges
  it via measured-edge travel, so not currently biting).
- DEFERRED from U10 (open): the manifest does not model per-shader interactive capability — a hosted-only shader
  with `interactionMode="active"` passes `select()` then `onError`s at mount.
- Publishing (DEF-016) stays correctly blocked: V2/publish is not done while the surface is partial.

START BY: read the binding docs (esp. blueprint Phase S + the progress Surface section). Then, on the maintainer's
word, DISPATCH the U14-001 spike-first device gate (the immediate next action). After U14 closes, recommendation-pass
→ spec U10-002. Do not start a trigger-gated DEF row unprompted.
