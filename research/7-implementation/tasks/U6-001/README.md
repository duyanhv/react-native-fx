# U6-001 — FxAnimationDriver: the interruptible content-motion spring engine

Type: `implement` · State: `merged` · Device: `yes` · Consumes: RT-007 · Closes: RT-007 (**closed 2026-06-12** — device gate passed) · Blocked by: — (U4-001 + U5-001 merged)

## Start here

1. **This file** — the work order (spec'd by the planner, 2026-06-11).
2. **`./preflight.md`** — the ratified spring dossier (DOC-009). The iOS two-path design
   and every rejected alternative live there; do not re-litigate them.
3. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
4. **Per-gate guides** — the standard set (Style / Comments / Testing / Device Verification /
   Writing Style / Contributing), one per gate.

## Authority links

```
Subtask: FxAnimationDriver, the CONTENT lane — the native engine that eases the
         intermediate container's transform/opacity to discrete targets with
         interruptible, no-snap retargeting, and reports completion as one internal
         callback. JS sets targets upstream (U7); frames never cross the boundary.
- Contract anchors:  research/4-runtime/34-animation-driver.md (the owning contract —
                     the two realization families, the no-synchronous-boundary finding,
                     the hit-test caveat + its DOC-009 retarget flip, the iOS spring
                     disposition, reduce-motion), research/4-runtime/36-runtime-architecture.md
                     §The objects (the FxAnimationDriver row), blueprint.md Unit 6,
                     architecture.md §6/§8 (owns interruptible native animation ·
                     reads targets + measurements · emits completion via coordinator ·
                     NOT bridged to JS), decision-ledger.md RT-007 (the retarget
                     contract) and RT-016 (animator sufficiency — dispositioned, its
                     DEVICE truth belongs to U6-002, not this task).
- Decision:          settled (preflight + DOC-009, maintainer-ratified 2026-06-10):
                     · Android — stock androidx.dynamicanimation SpringAnimation;
                       animateToFinalPosition() carries value+velocity on retarget. No
                       custom integrator. Spring parameterization + reduce-motion gate
                       per structure.android.md §motion.
                     · iOS — render-server-first: the fire-once envelope commits the
                       iOS-17 unified spring (UIView.animate(springDuration:bounce:) /
                       CASpringAnimation with Apple defaults) so it runs in the render
                       server. A CADisplayLink + FxSpring integrator takes over ONLY on
                       an actual mid-flight target change: capture presentation-layer
                       state, hand off, write the MODEL layer each tick.
                     · FxSpring — a thin value type mirroring Apple's Spring surface,
                       delegating the math to SwiftUI.Spring (iOS 17 floor; below 17
                       the motion content rung degrades to {via:'none'} — instant
                       placement). It owns: the display-link loop, velocity carry, the
                       opposing-inertia clip, one transform+opacity vector envelope,
                       the rest test, the single completion.
                     · Defaults are the platform's own spring family (the law, 41);
                       cross-platform uniformity only via explicit motion/transition
                       (out of scope here — no JS surface in this task).
- Reference (HOW):   per the preflight dossier. Android: androidx.dynamicanimation
                     usage as pinned in structure.android.md §motion. iOS: the unified
                     spring API + SwiftUI.Spring stepping; DIFF Reanimated's
                     spring.ts/springUtils.ts ONLY for the retarget edge cases
                     (velocity carry, opposing-inertia clip) — its integrator/worklet
                     mechanism is REJECTED, and RN's SpringAnimationDriver.cpp retarget
                     is a documented bug, not a template.
- Guides:            Code Style + Code Comments (the code); Testing (Tier-1 headless
                     for the FxSpring math — it is a pure value type, unit-test it:
                     convergence, velocity carry, opposing-inertia clip, settling;
                     Tier-3 builds for the rest); Device Verification (the scenario);
                     Contributing (merge bar).
- Rules gate:        #1 (native owns every frame — the display link lives in FxSpring's
                     loop, never JS; targets in, completion out), #7 (Expo Modules
                     only — no worklets, no JSI, no C++), #9 (animates transform/
                     opacity of the fx-owned intermediate container ONLY — never a
                     Fabric-tracked view's props, never layout), #2 (platform-default
                     springs; no cross-platform-uniform default).
- Scope boundaries:  do NOT build — the effect lane (SwiftUI/Compose eased uniforms —
                     a separate channel), the presence FSM / any JS API / any event to
                     JS (U7 wires onFxTransitionEnd semantics; this task's completion
                     is an internal callback), the preset catalog or tune formulas
                     (MOT-001/MOT-002), per-child motion, regime-C gesture sourcing,
                     the U6-002 retarget device matrix (write THIS task's basic
                     scenario only) and U6-003 (M3 floor/tune feel). Edge→value
                     resolution is the CALLER's job: the driver animates concrete
                     target vectors; resolving {measure:'edge'} via FxLayoutObserver
                     is the U7 coordinator's composition (the architecture's
                     "reads FxLayoutObserver" edge happens there) — do not wire the
                     observer into the driver.
- Internal surface:  (name per the Code Style Guide — this names the DATA) one driver
                     instance owned by FxSurfaceView, targeting the intermediate
                     container: animate-to(target vector: opacity/scale/translateX/Y/
                     rotate, spring params defaulted to the platform family) — calling
                     it mid-flight RETARGETS (velocity carried, no snap, no restart,
                     no double-animation); cancel (settle-in-place for teardown, `31`);
                     one completion callback per envelope (fires once, on rest — a
                     retarget supersedes the prior envelope's completion). Reduce-motion
                     (the OS setting, read natively) degrades every channel to identity
                     in a single frame (42's ratified posture).
- Device-verify:     (human gate — write the scenario to evidence/, agent-device runs
                     it; temporary instrumented harness per the established pattern,
                     reverted after) prove on BOTH platforms: (1) a fire-once envelope
                     animates the container smoothly to target and completion fires
                     exactly once; (2) a mid-flight retarget continues from the visual
                     position with velocity carried — NO snap, NO restart (iOS: log the
                     render-server → integrator handoff; the presentation-layer capture
                     value); (3) wrapped RN content rides the animated container and
                     remains tappable at rest after settle; (4) cancel settles in place,
                     no leak (the display link stops — log it); (5) reduce-motion ON →
                     single-frame identity. The U6-002 hard-retarget matrix is NOT this
                     scenario — keep this one to the contract basics.
- Closure:           RT-007 is implementation-pending with a device-gated close ("the
                     contract implemented and device-verified per platform") — record
                     the closure plan in notes.md; flip the row ONLY after the
                     maintainer ticks device-verified. RT-016 is NOT yours to close
                     (U6-002 owns its device truth) — do not touch it beyond citing.
- Done when:         FxAnimationDriver.swift + FxAnimationDriver.kt (+ FxSpring.swift)
                     exist, owned by FxSurfaceView, animating the intermediate
                     container per the decision above; the FxSpring math is Tier-1
                     unit-tested headlessly; structure.{ios,android}.md §motion pins
                     updated ONLY if the build diverges from the already-pinned
                     mechanics (they should not — flag instead of silently deviating);
                     headless gates + pod install + example xcodebuild +
                     gradlew :app:assembleDebug green; the device scenario written to
                     evidence/.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-11; the spring design pre-ratified in `./preflight.md` / DOC-009)
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (human gate — maintainer-ratified 2026-06-12; PASS on POCO F1 / Android 15 API 35 + iPhone 17 Pro simulator / iOS 26.5, `evidence/device-run.md`)
- [x] reviewed (planner, 2026-06-12 — [review](../../reviews/U6-001.md); two implementation rounds 2026-06-11 + the device-gate audit)
- [x] docs-closed (`34` status + interruptible-contract question struck, frame-loop question annotated; RT-007 → resolved in the ledger)
- [x] merged (human gate — maintainer, 2026-06-12; `a168220` implementation + `3f3a8ae` ratification on `integration/0.1.x`)

## Proof

- **headless:** from `packages/` — `bunx tsc --noEmit`, `bun run build`, `bun run lint`,
  `bun run swift:lint`, `bun run test` (the FxSpring Tier-1 suite runs here only if it has a
  JS-reachable surface — it does not, so the Swift math is exercised by an XCTest target ONLY
  if the repo already carries one; otherwise prove convergence/velocity-carry/clip via the
  device scenario's logged values and say so honestly — do not invent a test harness the repo
  does not have); `git diff --check`. Native: `pod install` (new Swift files) then example
  `xcodebuild` BUILD SUCCEEDED; `gradlew :app:assembleDebug` BUILD SUCCESSFUL.
- **device:** the five-point scenario above, written to `evidence/device.md` for the
  maintainer's agent-device run.
