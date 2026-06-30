# Session handoff — 2026-06-30 (WORK IN PROGRESS, NOT a holding pattern. One task is mid-flight: **DEF-028 FxReveal chrome step 2 (scale-free radius morph + clip) is `device-pending`** — it now RUNS on Android for the first time (construction crash fixed), **G1 round + G2 clip visibly pass on both platforms**, but **one real bug remains: the collapsed card's first-mount position**. The prime fix candidate is named and device-validatable. Resume here — do not start anything else. Supersedes the 2026-06-29 holding-pattern note, which still describes the merged baseline correctly.)

This is a resume point, not a stopping point. DEF-028 builds on the merged DEF-027 reveal spine and
is the only task in flight. The chrome mechanic (the scale-free outer clip boundary + inner
transformed content layer) is implemented on both platforms and visibly works; the one remaining
defect is an Android first-mount layout-ordering bug with a prime fix candidate ready to validate.

## Where DEF-028 stands (`device-pending`)

- **iOS (iPhone 17 Pro / iOS 26.5): all-pass.** The `CAShapeLayer` mask on the outer chrome boundary
  rounds and clips the reveal correctly; the inner `expandedContainer` keeps the inverse transform;
  content stays sharp; no regression of the step-1 spine.
- **Android (POCO F1 / API 35): RUNS for the first time; G1 + G2 visibly pass; one bug remains.**
  - **Construction crash FIXED.** `SpringAnimation(FloatValueHolder).spring` is null until a
    `SpringForce` is installed; the constructor dereferenced it at `FxRevealView.kt:106`. Now each
    chrome `SpringAnimation` gets a `SpringForce().apply { … }` before its stiffness/damping is set.
    Logcat is clean — no `Couldn't create view` / `InvocationTargetException` / `SpringForce` NPE.
    Before this fix `FxReveal` had **never actually constructed on Android** — every prior Android
    "gate" measured Expo's raw stacked-slot fallback, not a working reveal.
  - **G1 (round corners under non-uniform morph) + G2 (no clip overflow) visibly pass.** Pressing
    Open reveals a bottom-half panel with rounded top corners and clipped content, emitting
    `onTransitionEnd expand finished=true`. A fallback could not produce a rounded-clipped animated
    reveal with a native transition event, so the view genuinely constructs.
  - **REMAINING REAL BUG — collapsed first-mount position.** The collapsed card mounts at
    `{x:0, y:240}` (top, in-flow — its absolute style is not applied on the first commit) and recovers
    to the correct `{x:44, y:1682}` (bottom-anchored, `left:16dp`) only after a full relayout (the W8
    example toggle). This reproduces on a **constructing** view, so it is genuine — the original
    symptom was real all along; the prior crash merely masked it.

## The prime fix candidate (validate on device — do not assert)

Re-apply the **`updateViewLayout` slot-routing** override that a prior pass reverted, keeping the
SpringForce construction fix. The recover-on-relayout signature (the collapsed slot's absolute frame
is dropped on the first commit and applied only on a later pass) fits a **dropped child-layout
application** — and that routing was reverted on the assumption it was a fallback artifact, but it was
**never tested against a working (constructing) view**. So it is the prime suspect, not a proven fix.

Two shapes, in preference order (per `tasks/DEF-028/android-rework.md`):

1. **Make the view tree and the flattened child accessors coherent.** Inserting `chromeContainer` as
   a second `MATCH_PARENT` super-child and re-parenting `expandedContainer` under it left
   `getChildCount`/`getChildAt`/`indexOfChild` (`FxRevealView.kt:414-431`) exposing the flattened
   step-1 tree `[collapsedContainer, expandedContainer]` while the real super-children are now
   `[collapsedContainer, chromeContainer]`. Reconcile the walk + `addView`/`removeView`/routing
   (including the reverted `updateViewLayout`) with the real tree so Fabric applies the collapsed
   slot's frame on the first commit exactly as it did in step 1.
2. **If the tree must stay as-is**, force a first-resolved-layout reconcile of the collapsed slot
   (mirroring the step-1 expanded-side deferral) — but prefer (1); a forced relayout is a patch over
   a bookkeeping bug, not a fix.

Constraints: keep the chrome boundary **scale-free** (radius never on the transformed layer); keep
the `BOX_NONE` + phase-gated touch contract (step-1 G3); no Yoga write; **iOS must not regress**.

## What this session left in the working tree (now committed)

- **Chrome channel, both platforms** (the step-2 implementation): iOS `chromeLayer` outer boundary +
  `CAShapeLayer` mask, `expandedContainer` moved inside it, `snapChrome`/`animateChrome`, `hitTest`
  updated (`FxRevealView.swift`); coordinator chrome calls + `collapsedRadius`/`expandedRadius`
  (`FxRevealCoordinator.swift`). Android `FxRevealChromeContainer` (`ViewOutlineProvider` +
  `clipToOutline`) wrapping `expandedContainer`, `FloatValueHolder`/`SpringAnimation` chrome drivers,
  `snapChrome`/`animateChrome`, `shouldReduceMotion()` helper (`FxRevealView.kt`); coordinator chrome
  calls + density-aware radius constants (`FxRevealCoordinator.kt`).
- **SpringForce construction fix** (`FxRevealView.kt`) — the crash fix above.
- **`cornerRadius` IR channel** added to manifest `motion.properties` (IR-only; never a public
  `fx.motion` field — mirrors `41` d16) (`manifest.ts`).
- **`reveal-conformance.test.ts`** +3 assertions guarding the IR-channel contract / no public leakage
  / no new props.
- **`example/screens/reveal.tsx`** labels updated to mention step 2.
- **Android chrome damping corrected** to `DAMPING_RATIO_MEDIUM_BOUNCY` (matches the geometry driver
  default, `FxAnimationDriver.kt:107`) and **G1-visibility radii bumped** to collapsed 20 / expanded
  36 pt-dp (a TODO to device-tune back to product values after the gate confirms the mechanic).
- **The `updateViewLayout` child-routing override is NOT in this commit** — it was reverted pending
  device validation against a constructing view. Re-applying it is the resume step above.

## Next action

Re-apply the `updateViewLayout` slot-routing (keep the SpringForce fix), rebuild, and **re-gate
first-mount bounds — the collapsed card must be `y>1000` (bottom-anchored) on first mount, no
top-flash, captured by bounds not just a screenshot**. Then run the remaining Android gates
(G3 clipped-content touch, G4 interruption sync, G5 reduce-motion, G6 no step-1 regression) and an
iOS regression smoke. Then close the **paired docs-closed** still owed: the new `41` decision (chrome
channel IR-only), `structure.{ios,android}.md § reveal` (the layer split + mask/outline mechanic,
flip the deferred lines), manifest `cornerRadius`, `50` (radius+clip preset-owned, zero new props),
promote the radius+clip slice of the anchored-reveal WIP, mint the ledger row, and write
`reviews/DEF-028.md`. Border/background stay out of scope (a future step 3).

## Carry-over (unchanged from 2026-06-29)

- **Do NOT run DEF-016** (publishing / the `react-native-fxkit` rename) — parked until the maintainer
  reintroduces it.
- **Do NOT start any other trigger-gated DEF row or `wip/` promotion unprompted** while DEF-028 is in
  flight. After DEF-028 closes, the queue is: `FxReveal` step 3 (border/background — only when a
  consumer needs it), `FxAnchor` (the foreign-anchor cross-tree frontier, its own `0-spine/05`
  decision), and the parked `wip/` explorations (`interactive-content-distort`,
  `native-slot-layout-transitions`).
- **Gates / device tooling:** test gate is `bun run test` (Jest), not `bun test`; a new iOS Swift file
  needs `pod install`; lint is the pinned biome via `bun run lint`. Device gate via agent-device
  (POCO F1 / API 35 + iPhone 17 Pro sim / iOS 26.5); Android springs ignore animator-duration-scale
  (U7-003); iOS Simulator slow-animations (Cmd+T) catches interrupt ordering.
- **Role unchanged:** planner / reviewer / investigator / housekeeper. Specs + paste-ready prompts +
  independent gate re-runs + bookkeeping; subagents/human execute; the `device-verified`/`merged`
  ticks are the maintainer's. Commits human-directed, on `integration/0.1.x`, Conventional Commits,
  no AI co-author trailer.
