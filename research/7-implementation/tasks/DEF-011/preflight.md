# DEF-011 preflight — axis-arbitration vs RNGH Pan FSM

**Mechanic:** Extend `FxPressHandler`'s `shouldFail` from "fail on any movement past slop" to
"fail on cross-axis movement past slop when claimed-axis movement is absent" under a new
`dragAxis` prop.

**Risk question:** Does the axis-split claiming design survive contact with the RNGH Pan FSM
pattern? Is a simple "cross-axis dominates" check sufficient, or does it need the full RNGH
activeOffset/failOffset per-axis threshold model?

**Hard constraints:** Rule #1 (native loop), #6 (iOS/Android peers), #7 (no RNGH in packages),
#9 (reads pointer, animates above).

## References diffed

| Reference | File | What was diffed |
|---|---|---|
| RNGH iOS Pan | `references/gesture-handler/.../RNPanHandler.m:287-351` | `shouldFailUnderCustomCriteria` + `shouldActivateUnderCustomCriteria` |
| RNGH Android Pan | `references/gesture-handler/.../PanGestureHandler.kt:98-151` | `shouldActivate()` + `shouldFail()` |
| RNGH iOS LongPress | `references/gesture-handler/.../RNLongPressHandler.m:195-204,113-123` | `shouldCancelGesture` + `touchesMoved:` fail toggle |
| RNGH Android LongPress | `references/gesture-handler/.../LongPressGestureHandler.kt:147-161` | `handleMove` slop self-failure |
| fx iOS FxPressHandler | `packages/ios/FxPressHandler.swift:155-161` | Current `shouldFail` — Euclidean slop, no axis awareness |
| fx Android FxPressHandler | `packages/android/.../FxPressHandler.kt:129-133` | Current `shouldFail` — Euclidean slop, no axis awareness |

## Mechanism: how RNGH solves axis arbitration

RNGH's Pan FSM uses **directional thresholds on cumulative translation** — not a simple
cross-axis dominance check:

- **iOS (`RNPanHandler.m:287-351`):** `shouldFailUnderCustomCriteria` checks
  `failOffsetXStart`, `failOffsetXEnd`, `failOffsetYStart`, `failOffsetYEnd` — each is a
  directional boundary on the cumulative translation from the gesture origin.
  `shouldActivateUnderCustomCriteria` checks `activeOffsetXStart/End`, `activeOffsetYStart/End`
  plus `minDist` and velocity thresholds. The key insight: **fail and active are independent,
  per-axis windows** — you can fail if X exceeds a negative threshold while still activating
  on Y. Fail checks run before activate checks, and fail wins on collision.

- **Android (`PanGestureHandler.kt:98-151`):** Identical structure with sentinel values
  (`MIN_VALUE_IGNORE = Float.MAX_VALUE`, `MAX_VALUE_IGNORE = Float.MIN_VALUE`) for unset
  thresholds. `shouldFail()` and `shouldActivate()` are called in `onHandle()` when state is
  `STATE_BEGAN`. Same fail-before-activate order.

- **Directional pan use case:** The `direction` property on Pan gestures is implemented
  **purely through JS-calculated activeOffset/failOffset values** — the native Android/iOS
  FSM has no `direction` field. The JS config sets fail offsets on the undesired axes and
  active offsets on the desired axis, creating a "directional lock" through the per-axis
  threshold windows.

- **Long-press slop yield:** Both platforms use a simple Euclidean distance check against a
  fixed `allowableMovement` (10pt default). iOS toggles `self.enabled` false→true to force
  recognizer reset; Android calls `fail()` on the base handler. No axis awareness — the
  long-press is not a directional gesture.

## How our design differs (and why)

Our `dragAxis` is a **simpler model** than RNGH's full per-axis threshold windows:

1. **One boolean axis instead of four offsets:** `horizontal` / `vertical` / `both` declares
   which axis the shader claims. There is no fail-offset range or active-offset range — a
   directional gesture either claims its axis or yields.

2. **Cross-axis-dominance test instead of threshold windows:** Instead of checking "did X
   exceed failOffsetXEnd?", our test is "did cross-axis delta exceed slop AND exceed
   claimed-axis delta?" This is coarser but sufficient for the use case: a shader surface
   inside a scroller should (a) claim its configured axis so the user can drag/tilt the
   shader, and (b) yield the cross-axis so the ancestor scroller can scroll.

3. **No activate-after-drag pattern:** RNGH Pan uses active offsets to delay activation until
   the finger passes a threshold in the desired direction. Our model activates immediately on
   touch-down (the press recognizer fires on `.began` with `minimumPressDuration = 0`) and
   decides to *yield* later based on movement direction.

4. **`both` is unique to our use case:** In a scroller context, "claim nothing" (yield
   everything) is the existing default; "claim both axes" means the shader captures all drag
   input and the scroller gets nothing — meaningful for a shader that is the primary
   interactive element, not living inside a scroller.

**The difference is deliberate, not a gap:** RNGH's model solves general-purpose gesture
composition (arbitrary Pan + Pan in any arrangement) with a full threshold-per-axis machine.
Our model solves a specific problem (shader claims one axis inside a scroller) with minimal
machinery, because:
- We only need to yield the cross-axis to an ancestor, not coordinate with a sibling gesture.
- The recognizer FSM is already at the "cancel on slop" stage — we're refining the cancel
  condition, not building a new activation pipeline.
- The `both` case is the equivalent of "never cancel on slop," which is just `return false`
  in `shouldFail`.

## Verdict: SOUND — proceed

The design survives contact with the RNGH pattern. The simpler cross-axis-dominance test is
sufficient because:
1. It directly addresses the coexistence case (shader claims one axis, scroller claims the
   cross-axis) without needing full per-axis threshold windows.
2. The "dominates" check (`|crossDelta| > slop && |crossDelta| > |claimedDelta|`) is a
   natural heuristic that works for both fast swipes (large cross-axis delta) and diagonal
   drags (direction determines intent).
3. RNGH's own `failOffset` per-axis windows could express our "cross-axis fail" semantics, but
   they are over-engineered for this single-use case — and importing them would require
   importing the entire Pan recognizer infrastructure, violating rule #7.

**One watch item from the reference:** RNGH sets `minDist = Float.MAX_VALUE` when custom
activation criteria are present, effectively disabling the default Euclidean slop. Our design
keeps the slop as a *secondary* guard (still used in the default case when no dragAxis is set)
and only overrides it for the axis-aware path. This is correct — an unset dragAxis should
produce today's exact behavior, Euclidean slop and all.

## Feed back into spec

No spec change needed — the mechanic as designed in the README is consistent with the
references pattern. The `shouldFail` refinement (cross-axis dominance test) is the simplest
form of the RNGH axis-arbitration model, sufficient for the `horizontal`/`vertical`/`both`
vocabulary.

## Sources

- `references/gesture-handler/packages/react-native-gesture-handler/apple/Handlers/RNPanHandler.m:287-351`
- `references/gesture-handler/packages/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/PanGestureHandler.kt:98-151`
- `references/gesture-handler/packages/react-native-gesture-handler/apple/Handlers/RNLongPressHandler.m:113-123`
- `references/gesture-handler/packages/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/LongPressGestureHandler.kt:147-161`
- `packages/ios/FxPressHandler.swift:155-161`
- `packages/android/src/main/java/expo/modules/reactnativefx/FxPressHandler.kt:129-133`
