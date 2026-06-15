# U7-001 — FxPresence: the presence FSM and the deferred-unmount handshake

Type: `implement` · State: `merged` · Device: `yes` · Consumes: MOT-001 · Closes: — (no ledger row; see Closure) · Blocked by: U6-001 (device gate + merge; DOC-018 merged)

## Start here

1. **This file** — the work order (spec'd by the planner, 2026-06-12).
2. **`./preflight.md`** — the references preflight (verdict **SOUND**, 2026-06-11). The
   JS-mount-retention validation, the five React-semantics rules, the stranded-exit guard,
   and snapshot semantics live there; do not re-litigate them. The accepted scope ceiling
   (`42`) is a constraint, not a finding.
3. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
4. **Per-gate guides** — the standard set (Style / Comments / Testing / Device Verification /
   Writing Style / Contributing), one per gate.

## Authority links

```
Subtask: FxPresenceCoordinator + FxPresence (blueprint Unit 7) — the presence vertical:
         the native lifecycle FSM that turns the discrete `visible` target into an
         interruptible enter/exit envelope on the U6-001 driver, plus the JS
         mount-retention coordinator that keeps the exiting child alive until the
         native completion event releases it. JS sets targets; native owns every frame.
- Contract anchors:  research/4-runtime/35-view-state.md (the OWNING contract — the two
                     coupled FSMs, the transition table, every invariant: interrupt-as-
                     retarget, deferred unmount, teardown-during-exit, the stranded-exit
                     guard, snapshot semantics, appear; the five React-semantics rules;
                     the exposure model), research/1-surface/54-presence.md (the public
                     prop surface: visible/preset/motion/transition/appear/
                     onTransitionEnd/style; the stay-mounted contract; any-children-one-
                     wrapper; fx owns motion not placement),
                     research/3-motion/42-presence-and-lifecycle.md (presence semantics:
                     V1 ships `transient` ONLY (Decision 7, DOC-018); the scope ceiling;
                     the envelope; the measurement contract — motion reads layout, never
                     writes it; reduce-motion), research/3-motion/41-motion-vocabulary.md
                     (MotionSpec — a SHAPE only; the four V1 builders edgeIn/edgeOut/
                     scale/identity (Decision 12, DOC-009); the measured `{measure:
                     'edge'}` token; the fallback userMotion[k] ?? presetMotion[k] ??
                     identity, no implicit reverse; the shape-native law),
                     research/3-motion/40-motion-reactivity-and-data-flow.md (regime B;
                     the canonical event-name table — native `onFxTransitionEnd` →
                     public `onTransitionEnd`, the surface owns the remap, the prefix
                     never leaks; the payload {owner, phase, finished, interrupted};
                     interrupt semantics), research/0-spine/04 (React owns the tree; fx
                     defers unmount, never seizes it), blueprint.md Unit 7,
                     architecture.md (consumer — NOTE: its coordinator row sketches
                     older state names "visible → entering → holding → exiting → done";
                     `35` owns the FSM: absent · entering · present · exiting. Follow
                     `35`; reconcile the architecture row at docs-closed),
                     data-layer.md §Presence presets (the provisional `transient`
                     per-platform rows — iOS top-edge banner slide / Android bottom
                     snackbar slide, values [device-pending] with MOT-001) and §Entity
                     Diagram (src/motion → src/surface → src/runtime layering),
                     decision-ledger.md MOT-001 (consumed — provisional catalog values;
                     U7-002 owns its device truth), SPINE-009 (cite only — U9-002 owns
                     the device proof), SPINE-010 (the per-child flip trigger — out of
                     scope).
- Decision:          mimic the deferred-unmount PATTERN via JS-side mount retention
                     (blueprint Unit 7; preflight-validated SOUND 2026-06-11: a ref-
                     retained child produces NO Remove mutation — retention is Fabric's
                     own differ semantics, not an emulation). Flip-trigger: a C++ hook
                     only if fx ever drops the visible-prop model and supports
                     {cond && <X/>}. REJECT: Reanimated's C++ UIManagerCommitHook /
                     MountingOverrideDelegate (rule #7) and its worklet runtime.
- Reference (HOW):   ./preflight.md carries the file:line findings — consult it before
                     re-opening any reference. Reanimated LayoutAnimationsProxy_Legacy
                     (WAITING→ANIMATING→DEAD) — adopt the FSM state pattern and the
                     retarget-never-restart merge (updateOngoingAnimationTarget);
                     REJECT the commit hook, the mutation surgery, MOVED/ancestor
                     machinery (fx's model excludes those cases structurally). The web
                     AnimatePresence ref-retention pattern is the JS-side shape.
- Guides:            Code Style + Code Comments (the code); Testing (Tier-1 headless
                     for the JS retention FSM — it is pure logic, unit-test it:
                     retention through exiting, release on the completion event,
                     snapshot capture, the stranded-exit guard on host-ref detach,
                     appear; Tier-3 builds for the rest); Device Verification (the
                     scenario); Contributing (merge bar); Writing Style (docs-closed).
- Rules gate:        #1 (native owns every frame — `visible` crosses as a discrete
                     target, ONE completion event comes back; no per-frame JS), #7
                     (Expo Modules only — NO commit hook, NO JSI, NO worklets, NO
                     synchronous JS↔native read; the handshake is discrete async events
                     end to end), #9 (React owns the tree — JS retention defers
                     unmount, native NEVER touches the mounted tree; the coordinator
                     reads FxLayoutObserver, writes no layout), #2 (the preset resolves
                     shape+timing PER PLATFORM natively — agnostic names, platform-
                     native defaults; only an explicit `motion` map fixes the shape
                     cross-platform), #8 (state returns as semantic events only), #3
                     (presence is expo-view substrate — FxSurfaceView).
- Scope boundaries:  do NOT build — FxView / the named-state lane (`57`, onFxStateChange
                     stays unwired), FxPressable / press events, `tune` (DOC-019,
                     deferred), `sheet`/`modal` presets (DOC-018 — `transient` only),
                     `menu`/`tooltip` anchor-origin (v2, the SPINE-010 trigger),
                     per-child motion (one managed wrapper, period), a portal/overlay
                     helper (placement is the app's, `54`), the `clock` driver
                     (DOC-009, V2), SharedObjects (U9-001 — the coordinator is a PLAIN
                     internal native class owned by FxSurfaceView, never bridged),
                     catalog device-tuning (U7-002/MOT-001 own the device truth — ship
                     the provisional data-layer values and mark them), navigator/route
                     transitions (the scope ceiling — out of scope by contract).
- Build (the four pieces):
                     1. src/motion/ — the MotionSpec type (agnostic channels:
                        translateX/Y, scale, rotate, opacity; numeric deltas or the
                        {measure:'edge', edge} Travel token) and the four V1 builders
                        fx.motion.edgeIn/edgeOut/scale/identity, per `41` exactly.
                        Replaces the TODO blank in src/motion/types.ts.
                     2. src/surface/FxPresence.tsx — the public component over the
                        FxSurfaceView runtime wrapper: the JS mount-retention FSM
                        (rendered → released), snapshot semantics (capture children
                        when visible flips false; later re-renders do not propagate
                        into the exiting child), stable child key, any children
                        wrapped once (fragments/arrays normalized), the stranded-exit
                        guard (host ref → null while exiting and unreleased → release
                        immediately, expect no event), idempotent effects (StrictMode
                        rule), the onFxTransitionEnd → onTransitionEnd remap (`40` —
                        the prefix never leaks), style pass-through.
                     3. FxPresenceCoordinator.swift/.kt — plain internal native class
                        owned by FxSurfaceView: the `35` FSM (absent · entering ·
                        present · exiting; the exact transition table + invariants),
                        driving the U6-001 FxAnimationDriver and attaching to its
                        onContentAnimationCompletion hook as the completion source;
                        envelope config latches at phase start (a mid-flight change
                        applies from the next phase — `visible` retargets are the ONLY
                        mid-flight edges); teardown-during-exit cancels in place,
                        releases, emits nothing, never leaks; dispatches
                        onFxTransitionEnd {owner:'presence', phase, finished,
                        interrupted} via the existing EventDispatcher.
                     4. The boundary: visible (bool), preset (string — 'transient'),
                        motion (typed phase map), transition (timing record), appear
                        (bool, default true — false enters at present directly) cross
                        as discrete props on FxSurfaceView (module definition +
                        @Field records per data-layer §3). Native resolves the preset
                        shape+timing per platform from the provisional catalog rows;
                        the {measure:'edge'} travel resolves natively via
                        FxLayoutObserver (the architecture's "reads FxLayoutObserver"
                        edge — THIS is its composition point; the driver itself stays
                        observer-free per the U6-001 boundary). Reduce-motion rides
                        the driver's single-frame identity; onTransitionEnd still
                        fires immediately after the snap (`42`).
- Device-verify:     (human gate — write the scenario to evidence/, agent-device runs
                     it; temporary instrumentation per the established pattern,
                     reverted after) prove on BOTH platforms: (1) visible false→exit
                     plays on the wrapper, the child stays mounted through exiting and
                     unmounts ONLY after onTransitionEnd{exit, finished:true}; (2)
                     rapid visible toggles (true→false→true mid-exit) — retarget from
                     the current value, no restart, onTransitionEnd ordering stays
                     coherent with interrupted:true on the cut-short phase (`35`'s
                     open ordering question — log every event with its payload); (3)
                     appear=false shows instantly at present, no enter event storm;
                     (4) the wrapped child is tappable at rest after enter; (5)
                     teardown-during-exit (unmount the parent mid-exit) — no leak, no
                     event, no crash; (6) reduce-motion ON → single-frame placement,
                     onTransitionEnd fires immediately. The five React-semantics rules
                     (StrictMode / Fast Refresh / Suspense / re-render-mid-exit /
                     eviction) are U7-002 device rows — write THIS scenario to the
                     handshake basics; do not fold U7-002's matrix in.
- Closure:           this task closes NO ledger row. MOT-001 is consumed, not closed
                     (U7-002 owns the catalog's device truth); SPINE-009 stays
                     device-pending (U9-002). At docs-closed: strike `35`'s two
                     remaining research questions (the deferred-unmount protocol /
                     onTransitionEnd ordering; the source-of-truth-and-follower
                     question) ONLY as far as the implementation genuinely answers
                     them — the ordering half needs the device run; reconcile the
                     architecture.md coordinator-row state names to `35`; flip
                     `54`'s "native mechanics open" status line. The cardinal rule
                     applies: provisioning is not closure.
- Done when:         FxPresenceCoordinator.swift + FxPresenceCoordinator.kt exist,
                     owned by FxSurfaceView, running the `35` FSM on the U6-001 driver
                     via onContentAnimationCompletion; FxPresence.tsx ships the
                     retention FSM with snapshot semantics, the stranded-exit guard,
                     and the event remap; src/motion ships MotionSpec + the four V1
                     builders; `transient` resolves platform-native shapes from the
                     provisional rows with measured-edge travel via FxLayoutObserver;
                     the JS FSM is Tier-1 unit-tested headlessly; headless gates +
                     pod install + example xcodebuild + gradlew :app:assembleDebug
                     green; the device scenario written to evidence/.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12; the handshake pre-validated in `./preflight.md`)
- [x] rules-gated (#1 discrete `visible` down / one completion event up, no per-frame JS; #7 plain
      internal coordinator, no commit hook / JSI / worklets; #9 JS retention defers unmount, native
      reads `FxLayoutObserver` and writes no layout; #2 preset resolves shape per platform; #3
      `expo-view`/`FxSurfaceView`)
- [x] implemented (the four pieces — `src/motion` builders + wire, `FxPresence` + the pure
      retention FSM, `FxPresenceCoordinator.{swift,kt}` on the U6-001 driver, the boundary props +
      `onFxTransitionEnd`→`onTransitionEnd` remap)
- [x] commented (iceberg — why the retention FSM is a pure reducer, the snapshot/stranded
      invariants, the provisional preset shapes, the measured-edge composition point)
- [x] headless-done (tsc/build/lint/`swift:lint`/`git diff --check` green; 58 Tier-1 tests incl. the
      retention FSM + motion builders/fallback/normalization; Android `:react-native-fx:compileDebugKotlin`
      + iOS `pod install` + example `xcodebuild` BUILD SUCCEEDED; example `tsc` green)
- [x] device-verified (human gate — maintainer-ratified 2026-06-12; all six scenarios PASS on
      iPhone 17 Pro sim / iOS 26.5 + POCO F1 / Android 15 API 35; the `35` ordering question
      answered identically on both platforms; `evidence/device.md` §Results)
- [x] reviewed (planner, 2026-06-12 — [review](../../reviews/U7-001.md); two implementation
      rounds (comment provenance; `transition` narrowed) + the device-gate audit)
- [x] docs-closed (`35` status + both research questions struck with the device-proven answers;
      `54` status flipped + mechanics question struck; architecture coordinator row reconciled
      to the `35` state names; no ledger row — MOT-001/SPINE-009 stay open by design)
- [x] merged (human gate — maintainer, 2026-06-12; `076e1f0` implementation + the ratification
      commit on `integration/0.1.x`)

## Proof

- **headless:** from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test` (the FxPresence retention FSM is pure JS logic —
  Tier-1 test it with a mocked native event source: retention through exiting, release on
  completion, snapshot capture, the stranded-exit guard, appear, the motion-map fallback);
  `git diff --check`. Native: `pod install` (new Swift file), example `xcodebuild` BUILD
  SUCCEEDED; `gradlew :app:assembleDebug` BUILD SUCCESSFUL.
- **device:** the six-point scenario above, written to `evidence/device.md` for the
  maintainer's agent-device run. The five React-semantics rows stay with U7-002.
