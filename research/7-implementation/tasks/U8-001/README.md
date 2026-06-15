# U8-001 — the cooperative press recognizer + SDF hit-test

Type: `implement` · State: `todo` (spec'd) · Device: `yes` · Consumes: RT-005 · Closes: RT-006 · Blocked by: U1-002, U3-001, DOC-011 (all satisfied 2026-06-12)

## Why this task exists

`interactionMode` already crosses the bridge and iOS carries a naive `active` path (a bare
`UILongPressGestureRecognizer` writing `pressDepth` with no FSM, no slop-yield, no shaped
hit-test); Android stashes the prop and consumes nothing. This task ships the real contract
from `30`/`32` on both platforms: one cooperative press recognizer (`FxPressHandler`) that
begins eagerly, never claims movement, yields to scrollers by failing itself past slop, and
claims only inside the effect's own SDF shape — the capability that makes a shaped effect
surface feel like a real object. RT-006 (feather/threshold tuning + per-frame `hitTest`
cost) closes at this task's device gate.

## Authority links

```
Subtask: the press recognizer FSM + slop-yield + SDF hit-test (blueprint Unit 8).
- Contract anchors:  30-interaction-and-gestures.md (the interactionMode 2×2, the
                     cooperative principle, semantic-events-only, cancellation =
                     spring-back + no onPress, the borrowed arbitration model),
                     32-host-safe-hittest-and-sdf.md Decisions 4–5 (SDF source = the
                     shader's own shape uniforms; coordinates = shader UV [0,1] y-up
                     everywhere; JS events in view points — DOC-011, 2026-06-12),
                     40-motion-reactivity-and-data-flow.md §event table (wire
                     `onLongPress` as `onShaderLongPress`; `onStateChange` is FxView-era,
                     NOT this task),
                     decision-ledger.md RT-005 (consumed), RT-006 (closes here),
                     RT-001 (NOT here — U8-002), RT-002 (deferred).
- Decision:          blueprint Unit 8 — **adapt** the RNGH recognizer FSM + slop-based
                     early-failure + shouldCancelWhenOutside as ONE custom recognizer
                     participating in native arbitration, never arbitrating. **Reject**
                     RNGH-the-dependency and the multi-recognizer orchestrator.
                     architecture.md: the handler is `FxPressHandler.{swift,kt}`, a
                     plain internal class (no SharedObject), lowering to FxSurfaceView;
                     do NOT subclass UIGestureRecognizer — the FSM lives on the handler,
                     fed by the platform touch source.
- Mechanics (pinned): structure.ios.md §Touch contract — stock
                     UILongPressGestureRecognizer(minimumPressDuration 0),
                     cancelsTouchesInView false, shouldRecognizeSimultaneouslyWith →
                     true, location(in:) per callback, spring back on .cancelled; the
                     hitTest override composes SDF pass-through with the U4
                     animated-container caveat. structure.android.md §Touch contract —
                     onTouchEvent, requestDisallowInterceptTouchEvent(true) on
                     ACTION_DOWN released past scaledTouchSlop, spring back on
                     ACTION_CANCEL. Refine per the preflight before building; the
                     mechanic lives in structure.*, nowhere else.
- Preflight (gate):  references-preflight per agents/references-preflight.md, REQUIRED
                     before `implemented` — see preflight.md in this folder. Feed
                     verdict deltas into structure.{ios,android} §Touch contract first.
- Reference (HOW):   references/react-native-gesture-handler (the FSM, slop, 
                     shouldCancelWhenOutside, coordinate transform), references/react-native
                     (Pressability's slop/long-press timing), references/expo (recognizer
                     attachment idiom on ExpoView).
- Rules gate:        #1 native owns touch → uniforms; per-pointer movement NEVER crosses
                     the bridge; JS gets semantic events only (active only). #7 no RNGH
                     dependency, no JSI. #3 interaction is expo-view-only (FxSurfaceView).
                     #9 reads layout, never writes. Keep FxShaders pixels.
- Scope:             BOTH platforms. (a) FxPressHandler.{swift,kt} — the FSM
                     (undetermined → began → active → end | failed | cancelled), slop
                     self-failure, shouldCancelWhenOutside, long-press timing; (b)
                     passive = pointer-feed only, never claims, no events; active = full
                     press lifecycle + onShaderPressIn/Out/Press + the new
                     onShaderLongPress dispatcher (all four platform-parallel); (c)
                     uniforms pressDepth + touch in UV space (iOS: the existing buffer;
                     Android: the AGSL setFloatUniform + invalidate-on-write redraw
                     hook — draw-time, no frame loop while idle); (d) hitTest /
                     onTouchEvent SDF gating per 32 D4–5 (composition pass-through:
                     outside the shape → touches reach RN below; inside → claim per
                     mode), feather/threshold as a tunable constant pinned in
                     structure.* after the device gate.
- Scope boundaries:  NOT FxPressable (src/surface, planned — the handler is built
                     reusable but the content-press component is a later task); NOT
                     controlled-mode UI-thread channel (`40`, deferred); NOT drag/tilt
                     (RT-002, deferred); NOT the full RNGH/@gorhom coexistence matrix
                     (U8-002 — this gate runs ONE plain-ScrollView yield row only); no
                     new JS API surface beyond the already-declared props/events.
- Device-verify:     (agent-device; both platforms, physical Android) (1) passive:
                     pointer uniform tracks the finger, no claim, no events, scroll
                     still wins instantly; (2) active: full lifecycle incl. long-press
                     (onShaderLongPress) and tap (pressDepth 1→0, In/Out/Press order);
                     (3) slop-yield: press inside a ScrollView, drag past slop — the
                     scroller claims, .cancelled/ACTION_CANCEL spring-back fires, NO
                     onPress (the single most important behavior, `30`); (4) SDF:
                     touches outside the visible shape pass through to an RN Pressable
                     below; inside claims; feather tuned and pinned; (5) rapid-touch
                     hitTest cost — no measurable jank (closes RT-006); (6) the U6/U7
                     regression trio still passes (driver retarget, presence,
                     reduce-motion) since FxSurfaceView's touch path changed.
                     Write evidence/device.md.
- Closure:           on the maintainer's PASS the planner closes RT-006 (tuning + cost
                     proven), pins the tuned feather/threshold in structure.*, flips
                     the `40` onLongPress row to wired, writes reviews/U8-001.md, ticks
                     through merged. U8-002 (cancel path + the full coexistence matrix,
                     closes RT-001) unblocks.
- Done when:         FxPressHandler ships both platforms behind interactionMode
                     passive/active; SDF hit-test gates claims in UV space; the four
                     press events fire platform-parallel; headless gates +
                     compileDebugKotlin + xcodebuild green; the six-point device
                     scenario written; preflight deltas folded into structure.*; no
                     comment provenance.
```

## Lifecycle

- [x] spec'd (this README — planner, 2026-06-12)
- [x] preflight (SOUND with four corrections — [preflight.md](./preflight.md); deltas folded into structure.{ios,android} §Touch contract, 2026-06-12)
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (maintainer-ratified PASS both platforms, 2026-06-13 — `evidence/device.md` + `device-regate.md`; root cause corrected + fixed across rounds 3–5)
- [x] reviewed (planner, 2026-06-13 — `reviews/U8-001.md`)
- [x] docs-closed (RT-006 resolved — cost proven, feather → DEF-019; REAL-005 resolved; `40` `onLongPress` wired; `32` cost/feather reconciled)
- [x] merged (maintainer, 2026-06-13, on integration/0.1.x)

## Proof

- **headless:** packages gates + `compileDebugKotlin` + iOS `xcodebuild`; Tier-1 tests for
  any pure FSM logic that lands in TS (the native FSMs are device-proven, not unit-faked).
- **device:** `evidence/device.md` — the six-point scenario above.
