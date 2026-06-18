# DEF-011 — native-owned drag/tilt (G3 axis-aware claiming)

Type: `implement` · State: `merged` (hardware gate PASS + human-delegated tick 2026-06-18) ·
Device: `yes` · Closes: RT-002 · Blocked by: — (DEF-020 merged) · Reanimated: not used

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

## Settled design forks (ratified planner + maintainer at spec-review, 2026-06-17)

The three forks below are decided; the spike falsifies **axis arbitration only** (see below), not
the public API or the uniform ABI.

1. **The axis-declaration API.** Keep `interactionMode="active"` (it already owns the press
   recognizer) and add `dragAxis?: 'horizontal' | 'vertical' | 'both'`. A new `interactionMode`
   value was **rejected** — `interactionMode` is the frozen `none|passive|active|controlled`
   vocabulary (DEF-015, `30` Decision 7), and an orthogonal opt-in prop is a refinement of an
   existing mode, not a reopening of a frozen surface. `dragAxis` is **inert unless
   `interactionMode==='active'`** (documented + ignored otherwise); unset = today's behaviour
   (fail on any movement past slop), unchanged.
2. **The uniform shape/names.** `drag` (vec2) + `tilt` (vec2), both signed, both clamped `[-1,1]`,
   y-up — in the **same UV coordinate space as `touch` / `setHighlight`** (RT-005 `[0,1]` y-up UV),
   not a generic normalized basis.
   - `touch` = current pointer UV, `[0,1]`, y-up (the shipped convention).
   - `drag` = signed UV **displacement** from the gesture origin: `currentTouchUv - originTouchUv`
     (components naturally `[-1,1]`; clamp defensively). **Axis-masked by `dragAxis`:**
     `horizontal → (dx, 0)`, `vertical → (0, dy)`, `both → (dx, dy)`.
   - The distinction is load-bearing: `tilt` = where the finger **is** (absolute, relative to
     centre); `drag` = how far it **moved** (relative to gesture start). Both settle to `(0,0)`
     natively on release via the press-depth spring precedent.
3. **Tilt mapping.** Pointer-derived, no sensors: `tilt = clamp((currentTouchUv - 0.5) * 2, -1, 1)`,
   same y-up orientation. Centre → `(0,0)`; right edge → `x=+1`; top edge → `y=+1`. Full 2D
   (not axis-masked).

### ABI note (priced at spec-review)

iOS carries a **dual** uniform path: the packed `FxUniforms` struct (raster path,
`setFragmentBytes`) **and** per-signature args mirrored on all ten `[[stitchable]]` functions.
Adding `drag`/`tilt` extends the Swift struct + the MSL struct (append at end to keep offsets
stable) **and** adds two args to every stitchable signature + the Swift call site — the "field
order MUST match" invariant is a silent-corruption footgun. Android is additive only (per-shader
named uniforms gated on `name in declaredUniforms`).

### The spike falsifies axis arbitration only

The risky change is both `shouldFail` predicates moving from *fail on any movement past slop* to
*fail on cross-axis movement past slop; keep the claimed axis*. The spike proves a
`dragAxis="horizontal"` shader claims horizontal drag while an ancestor vertical scroller still
scrolls (and the cross-axis case), on both platforms' real recognizers. A negative result re-opens
fork 1. The `drag`/`tilt` uniform writes + settle are downstream and mechanical once arbitration
holds (Phase 2).

**Spike outcome (2026-06-17, sim/emulator — `evidence/device.md`):** Android-decisive, design not
falsified → proceed to Phase 2. Android S1 (claim + cross-axis yield) and S3 (`both` blocks the
parent) verified; iOS behavior + Android S2/S4/S5 under-verified by tooling (no visible uniform in
Phase 1), deferred to the Phase 2 hardware gate.

### Platform divergence for `dragAxis="both"` (ratified 2026-06-17 — from the spike finding)

The claim *mechanisms* differ: Android claims by blocking the parent
(`requestDisallowInterceptTouchEvent`); iOS claims by keeping its recognizer alive while the scroller
always scrolls (simultaneous recognition, `cancelsTouchesInView = false`). `horizontal`/`vertical`
**converge** (shader tracks the claimed axis; the cross-axis scroller scrolls on both). They diverge
only for `dragAxis="both"` inside a scroller (Android suppresses the parent scroll; iOS does not).

**Decision:** document the divergence; do **not** change iOS to suppress the parent scroll for `both`.

- `horizontal` / `vertical` are the convergent, scroller-safe modes.
- `both` is for standalone shader surfaces (or containers where the app expects no ancestor
  pan/scroll arbitration) — positioned as **standalone-only** in public docs for parity.
- iOS `both` keeps `cancelsTouchesInView = false` + simultaneous recognition; it must **never**
  suppress the parent by severing RN touch (rule #4). iOS parent-scroll blocking for `both` is
  **explicitly out of scope, not a bug.**
- Android `both` claiming the stream locally (without violating RN child touch semantics) is
  acceptable platform-native divergence.

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
- [x] rules-gated (#1 / #6 / #7 no Reanimated-RNGH in packages / #9)
- [x] implemented (preflight + spike → axis-claim → native uniform write → settle)
- [x] commented
- [x] headless-done
- [x] device-verified (axis claim + smooth track + coexistence — human gate, 2026-06-18; `evidence/device-hardware.md`)
- [x] reviewed
- [x] docs-closed (`30` G3 + `structure.*` + ledger RT-002)
- [x] merged (on integration/0.1.x; human-delegated tick, 2026-06-18)

### Type-A bug found + fixed at the hardware gate (2026-06-18)

iOS dots vanished mid-drag: `UILongPressGestureRecognizer`'s built-in `allowableMovement` (10 pt
default) auto-failed the recognizer before the axis-aware `shouldFail` could arbitrate. Fixed by
setting `allowableMovement = .greatestFiniteMagnitude` in `attach()` so `shouldFail` is the sole
arbiter (commit `0b4f9de`). The S3 demo was relabeled standalone-only (`49e89f6`). Gate verdict:
all scenarios pass except the ratified iOS `both`-inside-a-scroller divergence (parent scroll stays
active — standalone-only on iOS, not a bug).
