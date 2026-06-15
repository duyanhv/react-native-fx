# U8-001 — press recognizer preflight (design disposition, not closure)

A spec-time `references-preflight` (per `agents/references-preflight.md`) on the Unit 8
cooperative press recognizer — the `30` arbitration contract adapted from RNGH's FSM +
slop-yield without RNGH-the-dependency or the orchestrator — run before U8-001 builds it.

Status: **preflight done (2026-06-12).** Verdict SOUND with four corrections; the deltas are
folded into `structure.{ios,android}.md` §Touch contract (this commit). Method note: the
RNGH fan-out agent's report was spot-checked against the actual clone by the planner
(file:line verified); the react-native-core fan-out was **discarded** — the local clone is a
sparse checkout (no `React/`, `ReactAndroid/`, or `Libraries/`), so its claims could not have
come from the cited files. The Expo-layer questions were answered by direct planner
inspection. Gaps are flagged below rather than papered over.

## The verdict question

Does ONE cooperative press recognizer — a stock-`UILongPressGestureRecognizer`-fed handler
FSM on iOS, an `onTouchEvent` FSM on Android, slop-based self-failure as the scroller yield,
no orchestrator — survive contact with how RNGH actually ships press recognition?
`sound / needs-correction / invalid`.

Hard constraints: #1 (native owns touch → uniforms; semantic events only), #7 (Expo Modules
only — no JSI/C++; no RNGH dependency), the `30` cooperative principle (participant, never
arbiter), `32` D4–5 (SDF hit-test in shader UV space).

## Verdict

**SOUND, with corrections.** RNGH's single-handler path is structurally the fx design: an
explicit FSM on a handler object over platform touch primitives, slop math that fails the
press so the scroller wins, `shouldCancelWhenOutside` as a bounds check per move. The
orchestrator is not load-bearing for one self-attached recognizer (its three duties —
registration, delivery, cross-view coordinate transform — are trivial or moot when the
handler lives on the view it serves). No forbidden mechanism anywhere on the path: RNGH's
relevant core is plain ObjC/Kotlin over UIKit/Android touch APIs.

## The corrections (fed into structure.*)

1. **iOS self-failure needs the `isEnabled` toggle, not a `state` write.** A stock
   recognizer's `state` is subclass-settable only. RNGH itself, even with its subclass,
   force-fails by `self.state = .failed` **plus** `self.enabled = NO; self.enabled = YES;`
   (`apple/Handlers/RNLongPressHandler.m:113-123` — verified). From a plain external handler
   the fx-legal mechanism is the enabled toggle alone: on slop exceeded (or outside-bounds
   with `shouldCancelWhenOutside`), toggle `recognizer.isEnabled` false→true; the OS delivers
   `.cancelled`; the handler maps that to its `failed` state, springs the uniforms back, and
   emits nothing.
2. **Slop self-failure is load-bearing, not defensive — spell out the causality.** fx's
   delegate answers `shouldRecognizeSimultaneouslyWith → true`, so the OS will NOT cancel
   fx's recognizer when the ancestor scroller's pan activates (simultaneity is exactly the
   opt-out of that arbitration). The slop check *is* the yield. RNGH's slop predicate to
   mirror: `translation.x² + translation.y² > allowableMovement²`, OR'd with the
   outside-bounds check (`RNLongPressHandler.m:195-204`; bounds check via hitSlop-inset
   frame, `apple/RNGestureHandler.mm:795-812`).
3. **`cancelsTouchesInView = false` is a deliberate divergence.** RNGH defaults it to `YES`
   (`apple/RNGestureHandler.mm:110`) because an RNGH handler claims exclusively. fx hosts RN
   children inside the surface and must never sever their touch stream — `false` stays. The
   flip side: fx's recognizer never blocks RN's own responders, so coexistence inside the
   surface is by construction — but it is **not yet device-proven under `active`** (the
   shipped naive path never ran a gate); it is device scenario territory.
4. **The handler owns the long-press timer on both platforms.** fx needs press-begin at
   touch-down (`minimumPressDuration = 0`) AND a long-press threshold from one recognizer,
   so the iOS recognizer cannot time the long-press; the handler posts its own timeout —
   the same shape as RNGH Android (`core/LongPressGestureHandler.kt:83-119` — init on DOWN,
   posted timeout, slop check cancels it). Per the law (#2), the durations are the
   platform's own tokens: `ViewConfiguration.getLongPressTimeout()` on Android; the UIKit
   0.5 s convention on iOS.

## Convergence (what validates as-is)

- **The FSM shape** — `undetermined → began → active → end | failed | cancelled` is RNGH's
  literal state set on both platforms (`core/GestureHandler.kt:1057-1062`; the iOS state map
  in `apple/RNGestureHandler.mm:567-583`). `FxPressHandler` mirrors it.
- **Android: plain `onTouchEvent` + parent interception.** RNGH's press path does NOT call
  `requestDisallowInterceptTouchEvent` for a lone press handler — it lets the parent
  intercept and handles the resulting `ACTION_CANCEL`. fx's pinned brief-disallow-then-
  release is a defensible defense for the eager pointer feed, with a watch item: if the
  device gate shows scroll-start lag, drop the disallow entirely (the RNGH-aligned shape)
  rather than tune the release.
- **Coordinate transform is moot for a self-attached recognizer.** RNGH's orchestrator
  walks scroll offsets/matrices to deliver cross-view events
  (`core/GestureHandlerOrchestrator.kt:385-408`); fx's recognizer lives on the view it
  serves — `location(in: self)` / `MotionEvent.x/y` are already view-local, then UV per
  `32` D5.
- **The Expo layer is clean.** `ExpoView`/`ExpoFabricView` (iOS and Android bases) carry no
  touch interception, no `hitTest`/`dispatchTouchEvent` overrides, no gesture machinery
  (planner grep over `expo-modules-core` — zero matches). Attach/teardown follows fx's own
  shipped idiom (install on mode change, remove + zero uniforms on teardown/deinit).

## Gaps flagged (not blockers; device-gate or implementing-session work)

- **react-native core could not be consulted** — the local clone is sparse (no iOS/Android
  native trees, no `Libraries/`). Consequences: (a) RN's Fabric touch-handler recognizer
  config is uncited — the iOS coexistence claim rests on UIKit semantics
  (`cancelsTouchesInView = false` + simultaneity) and must be proven at the device gate
  (scenario rows 2–4 cover it: RN Pressable below the surface must still receive touches);
  (b) Pressability's slop/timing numbers are unavailable — irrelevant by design, since the
  law picks platform tokens over RN's JS-timer values.
- **No shipping shaped-hitTest precedent found** in the sparse expo clone (expo-glass-effect
  delegates interaction to `UIGlassEffect.isInteractive`; no partial-bounds claim
  anywhere). The SDF pass-through is fx-original on this evidence base — `32` D4–5 is the
  design authority and the device gate (scenario 4) is its proof. This is expected: the
  shaped surface is the moat (`32`).

## Sources

- `references/gesture-handler/packages/react-native-gesture-handler/apple/`
  `RNGestureHandler.mm`, `Handlers/RNLongPressHandler.m` — verified file:line above.
- `references/gesture-handler/.../android/.../core/GestureHandler.kt`,
  `LongPressGestureHandler.kt`, `GestureHandlerOrchestrator.kt`.
- `references/expo/packages/expo-modules-core` (base-view layer), `expo-glass-effect`.
- `packages/ios/FxSurfaceView.swift` — the shipped naive `active` path this task replaces.
