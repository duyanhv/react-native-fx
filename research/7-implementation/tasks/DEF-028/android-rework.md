# DEF-028 — Android rework

## CORRECTION (planner, 2026-06-29, second device pass) — the analysis below is SUPERSEDED

The real Android root cause is a **construction-time crash**, not a layout/flattened-walk bug. On
the rework build, logcat shows on every reveal mount:

```
E ExpoModulesCore: Couldn't create view of type class expo.modules.reactnativefx.FxRevealView
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method
  'androidx.dynamicanimation.animation.SpringForce.setStiffness(float)' on a null object reference
  at expo.modules.reactnativefx.FxRevealView.<init>(FxRevealView.kt:106)
```

`SpringAnimation(FloatValueHolder)` leaves `.spring` (`getSpring()`) **null** until a `SpringForce`
is set (`animateToFinalPosition` lazily creates one). `FxRevealView.kt:106-107` does
`anim.spring.stiffness = …` / `anim.spring.dampingRatio = …` directly → NPE in the constructor →
Expo cannot instantiate `FxRevealView` → RN renders the raw slot Views stacked as a **degraded
fallback**.

**Consequences:**
- This crash was present in the **original** DEF-028 build (line 106 is unchanged by the rework; the
  damping fix only changed the *value* `NO_BOUNCY`→`MEDIUM_BOUNCY`). So **`FxReveal` has never
  actually run on Android.**
- The "collapsed slot first-mount position" symptom and the **flattened-walk root cause + the
  child-routing rework below were measuring the crashed view's fallback layout, not a working
  reveal.** The `y:240`→`y:1682` bounds were fallback artifacts.
- iOS passed because it is a separate code path (`CASpringAnimation`, no `SpringForce`).
- Headless gates miss it: Kotlin compiles (`getSpring()` is a platform type), and the JS conformance
  tests never instantiate the Android view. **A device mount-smoke catches it immediately** — the
  required first gate row for any Android-native view.

**The fix (`FxRevealView.kt:105-107`):** create a `SpringForce` on each chrome anim before setting
its properties, e.g.

```kotlin
chromeAnims.forEach { anim ->
  anim.spring = SpringForce().apply {
    stiffness = SpringForce.STIFFNESS_MEDIUM
    dampingRatio = SpringForce.DAMPING_RATIO_MEDIUM_BOUNCY
  }
  anim.addUpdateListener { /* … */ }
}
```

**Then re-gate the FULL Android suite from scratch** (the reveal has never run there): a mount-smoke
first (view constructs, no `Couldn't create view` in logcat), then the real first-mount position,
then G1–G6. Only after a *constructing* view is observed can the first-mount position be judged
real or not — **do not assume the position bug is real**; if the slot is correctly bottom-anchored
once the view constructs, the child-routing rework below may be unnecessary and should be reverted
to keep the diff minimal.

---

## SUPERSEDED — original (mis-diagnosed) rework: collapsed slot first-mount position regression

Device gate 2026-06-29 (planner-driven, agent-device, POCO F1 / API 35): **Android FAIL (G6).**
iOS all-pass. The chrome channel (scale-free radius + clip) itself is sound — iOS proves the
mechanic end to end. This rework is the Android view-tree/layout interaction only; **do not
re-architect the chrome channel.**

## Symptom (reproduced on device)

The collapsed card (the tap-to-open "Ask anything…" slot) renders at the **top** of the host on
first mount, then snaps to the correct bottom anchor after any full relayout (e.g. the example's
W8 toggle, which remounts the reveal).

## Evidence (agent-device, bounds in device px)

Collapsed card (`label="Ask anything…, tap to open camera"`):

| State | rect | reading |
|---|---|---|
| First mount | `{x:0, y:240, w:992, h:168}` | in-flow origin — absolute style NOT applied (x:0 = no `left:16`; y:240 = just below the header) |
| After W8 toggle (relayout) | `{x:44, y:1682, w:992, h:168}` | correct — `left:16dp`→x:44, bottom-anchored→y:1682 (above the tab bar) |

So on first mount the collapsed slot wrapper's absolute-positioning style (`{position:'absolute',
left:16, right:16, bottom: insets+16}`, `example/screens/reveal.tsx:132,183`) is **not applied** —
the card sits at its natural in-flow position; a later layout pass applies it correctly. This is a
**wrong-frame** bug (frame applied = top), not overdraw/z-order (which the bounds would not show).

## Root cause (grounded; executor confirms the exact mechanism on device)

The collapsed code path is statically unchanged from device-verified step 1 — the coordinator never
repositions the collapsed card; Fabric applies its computed (absolute) frame. DEF-028 changed only
the view tree:

- `expandedContainer` was re-parented from a direct child of `FxRevealView` into the new
  `chromeContainer` (`FxRevealView.kt:91-103`).
- The real `FxRevealView` children are now `[collapsedContainer, chromeContainer]` — but the
  flattened child accessors `getChildCount`/`getChildAt`/`indexOfChild` (`FxRevealView.kt:414-431`)
  still expose `collapsedContainer.children + expandedContainer.children`. **`expandedContainer` is
  now a grandchild (via `chromeContainer`), yet the accessors present its children as
  `FxRevealView`'s own.** The flattened view of the tree no longer matches the real tree.

Fabric's mounting/layout applies each RN child's computed frame through this view; the tree/flattened
mismatch perturbs first-commit child-frame application for the collapsed slot, so the card's absolute
frame lands only on a later pass. **Prime suspect: the flattened-walk vs real-children inconsistency
introduced by inserting `chromeContainer`.** The W8 remount masks it because the second mount lays
out with sizes already resolved.

## Rework direction (executor pins the exact form; iOS untouched, must not regress)

The fix must restore correct first-commit positioning of the collapsed slot while keeping the
scale-free chrome boundary (the outer unscaled clip layer + inner transformed content layer). Likely
shapes, in preference order:

1. **Make the view tree and the flattened accessors coherent again.** Reconcile
   `getChildCount`/`getChildAt`/`indexOfChild`/`addView`/`removeView`/`routeAdd` with the real tree
   now that `expandedContainer` lives under `chromeContainer` — Fabric must apply the collapsed
   slot's frame on the first commit exactly as it did in step 1. The collapsed slot is a direct child
   of `collapsedContainer` (unchanged), so the collapsed branch of the walk should behave identically
   to step 1; verify why the added `chromeContainer` sibling shifts first-commit application and
   remove that perturbation (e.g. confirm `chromeContainer` is not mis-counted in any index path, and
   that the expanded grandchild routing is internally consistent).
2. **If the tree must stay as-is**, force a first-resolved-layout reconcile of the collapsed slot
   (request layout / re-apply on the first `handleContentLayout` with `hasResolvedContentSize`),
   mirroring the step-1 expanded-side deferral — but prefer (1); a forced relayout is a patch over a
   bookkeeping bug, not a fix.

Constraints: keep the chrome boundary scale-free (radius never on the transformed layer); keep the
`BOX_NONE` + phase-gated touch contract (step-1 G3); no Yoga write; iOS must not regress.

## Re-gate when reworked (both platforms; iOS regression smoke + the full Android set)

- **First-mount position (the regression):** on a fresh mount/relaunch, the collapsed card is
  bottom-anchored (`left:16`, `bottom: insets+16`) with no top-flash — captured by bounds, not just
  a screenshot.
- The full G1–G6 set on Android (the chrome gates were never reached because G6/first-mount blocked
  the run): G1 round-under-morph, G2 no clip overflow, G3 clipped-content touch survives, G4
  interruption sync, G5 reduce-motion, G6 step-1 behavior (no-reflow, fall-through, collapsed-card
  tap opens, sharp content).
- iOS unregressed (card-tap opens, shutter increments, radius round, no overflow).

Evidence: this gate's reproduction is in the row trail; capture reworked bounds + the gate rows into
`evidence/device-run-android/`.
