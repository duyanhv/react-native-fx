# DEF-011 — native-owned drag/tilt (G3 axis-aware claiming)

Type: `implement` · State: `in-progress` (spec'd) · Device: `yes` · Closes: RT-002 ·
Blocked by: — (DEF-020 merged) · Reanimated: not used

## Why this task exists

Drag/tilt (the `30` G3 case) lets a shader respond to a drag axis — and tilt-toward-the-finger —
while living inside an app's scrollers/sheets. It is **fx-owned interaction**, so it is **native**
(route 1, `40`): a native recognizer reads the gesture and writes the uniform natively, every frame,
on the native loop — **no per-frame JS, no Reanimated**. This is the deliberate counter to routing
it through the app-owned Reanimated channel (DEF-006): fx owns the interaction, so fx owns the loop.
Closes RT-002.

## The native-owned principle (the spine of this task)

- The recognizer, the gesture state, the per-frame uniform write, and the settle/spring-back are
  **all native**, inside `FxSurfaceView` / `FxPressHandler` — the exact shape the shipped press path
  already uses (`updatePressUniforms` → the uniform buffer the `CADisplayLink`/`Choreographer` loop
  reads).
- **No `react-native-reanimated`, no worklet, no JSI in `packages/`.** RNGH stays **example-only**
  (the coexistence harness) — a `packages/` RNGH coupling is out of scope and would be a separate
  rule-#7 decision only if a real API proved it necessary (the U8-002 disposition).
- **Tilt is pointer-derived** (tilt toward the touch point) — NOT device sensors. Gyro / CoreMotion
  / `SensorManager` are a different native-source family (permission/lifecycle/calibration) and a
  separate task if ever wanted.

## Scope — IN / OUT

**IN:**
- A **native pan/drag recognizer** (extending the shipped `FxPressHandler` FSM) under an
  interaction mode, with **axis-aware claiming/yielding**: it claims the shader's configured drag
  axis and **yields the cross-axis** to an ancestor scroller/sheet (the refinement of the shipped
  "yields to scrollers on movement" — from *yield all movement* to *yield the cross-axis only*).
- **Native uniform writes** of the drag offset (and pointer-derived tilt) into the same buffer
  DEF-020/the press path use. Because these are **native** writes (not the JS `setUniform` scalar
  escape hatch), they may be **vec2** uniforms written directly (`drag`, `tilt`) — the scalar-only
  rule is a constraint of the JS path (the B2 arity crash), not the native one. Add the uniforms to
  the iOS `FxUniforms` struct and the Android shader uniform set, symmetric across platforms.
- **Native settle / spring-back** on release (the press-depth spring precedent), eased natively.
- An `example/` screen pairing a drag-axis shader inside a cross-axis scroller (the device proof of
  axis claiming) + the `@gorhom/bottom-sheet` / RNGH coexistence cases (example-only).

**OUT (explicitly):**
- **No Reanimated / worklet / JSI / RNGH in `packages/`.** App-owned Reanimated prop-drive is the
  separate, trigger-gated DEF-006 — not used here.
- **No device-sensor tilt** (gyro/CoreMotion/SensorManager) — pointer-derived only.
- **No new JS-facing `setUniform` scalars** for drag/tilt — the recognizer writes them natively;
  the `controlled` JS write set stays `intensity`/`pressDepth` (DEF-020).

## Open design forks (resolve in the spike / with review)

1. **The axis-declaration API.** How does a shader declare which axis it wants (and that it wants
   drag at all)? Candidates: a new `interactionMode` value (e.g. `"drag"`), or `active` + a
   `dragAxis="horizontal" | "vertical" | "both"` prop. Recommendation: lean on `active` + an axis
   prop (smallest surface; `active` already owns the press recognizer). Confirm at spec-review.
2. **The uniform shape/names.** `drag` (vec2, normalized `[0,1]` or `[-1,1]` offset) + `tilt` (vec2)
   — pick the range and names, chosen so a future app-owned DEF-006 binding could reuse them.
3. **Tilt mapping.** Pointer-derived tilt = a function of the touch point relative to centre. Pin
   the mapping (linear toward finger? clamped?) — pointer-only.

## Spike / preflight first (unbuilt mechanic — protocol step 5)

The **axis-split claiming** modifies the *frozen* `FxPressHandler` yield behaviour (today it
force-fails past slop on **any** movement — `structure.{ios,android}.md` § Touch contract). Changing
*all-movement-yield* to *cross-axis-only-yield* is a real recognizer change with coexistence risk.
Run the references-preflight (`agents/references-preflight.md`) against `references/gesture-handler`
(the Pan FSM / axis arbitration — borrow the model, do not add the dependency) and prove on a device
that the shader can claim one axis while a cross-axis scroller still scrolls, **before** the full
build. A negative result re-opens the axis-declaration fork.

## Authority links

- **Contract:** `4-runtime/30` Decision 5–7 + the native-owned G3 drag/tilt Open question; `3-motion/40`
  route 1 (fx-owned native source) + the ownership split; RT-002 (`decision-ledger.md`).
- **Decision:** `adapt` the shipped `FxPressHandler` recognizer (extend to a pan + axis-aware yield);
  `adapt` RNGH's Pan FSM **model** only (no dependency). Flip-trigger to a `packages/` RNGH coupling:
  a real API that cannot be expressed without it — a separate rule-#7 call, not this task.
- **Reference (HOW):** `references/gesture-handler` — the Pan FSM, slop, axis arbitration. REJECT
  taking the RNGH package dependency in `packages/`. Diff the actual recognizer, do not just name it.
- **Precedent:** U8-001 (`FxPressHandler` FSM + slop self-failure + the press-uniform write),
  U8-002 (the RNGH/@gorhom coexistence matrix, example-only).
- **Mechanics (pinned at docs-closed):** `5-realization/structure.{ios,android}.md` § Touch contract
  — the axis-aware claiming/yield refinement + the native drag/tilt uniform write + settle.
- **Rules gate:** #1 (native owns the loop — per-frame writes are native, never JS), #6 (iOS/Android
  peers — symmetric uniforms + claiming), #7 (no Reanimated/RNGH/JSI in `packages/`), #9 (reads
  layout/pointer, animates above it).

## Proof

- headless: packages `tsc`/`build`/`lint`/`swift:lint`/test + a Tier-1 test for the axis-claim
  config; Android `compileDebugKotlin`; iOS `pod install` + example `xcodebuild`.
- device: (1) the spike — a drag-axis shader claims its axis while a cross-axis scroller still
  scrolls; (2) drag offset + pointer-tilt track the finger smoothly with **no per-frame JS** (verify
  under JS-thread load); (3) native settle/spring-back on release; (4) the U8-002 coexistence cases
  still pass; (5) loop pauses off-window (rule #1).
- docs: `30` G3 flipped open→shipped (native-owned); the claiming/uniform mechanic pinned in
  `structure.{ios,android}.md`; ledger RT-002 `deferred`→`resolved` (on device proof).

## Lifecycle checklist

- [x] spec'd (this file)
- [ ] rules-gated (#1 / #6 / #7 no Reanimated-RNGH in packages / #9)
- [ ] implemented (preflight + spike → axis-claim → native uniform write → settle)
- [ ] commented
- [ ] headless-done
- [ ] device-verified (axis claim + smooth track + coexistence — human's gate)
- [ ] reviewed
- [ ] docs-closed (`30` G3 + `structure.*` + ledger RT-002)
- [ ] merged
