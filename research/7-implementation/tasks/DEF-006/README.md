# DEF-006 — Reanimated UI-thread uniform channel (regime C)

Type: `implement` · State: `in-progress` (spec'd) · Device: `yes` · Closes: MOT-007 ·
Blocked by: — · Unblocks: DEF-011 (continuous half)

## Why this task exists

`controlled` (DEF-020, merged) lets a developer write a uniform **discretely** via the view ref —
but the rule is absolute: **never per-frame `setUniform` from the JS thread**. The continuous case
— a gesture or animation driving a uniform *every frame* (regime C, "the only lag trap", `40:26`) —
needs an off-JS-thread transport. DEF-006 is that transport: the **UI-thread tier of the `source`
driver** (MOT-007), over the **same uniform names** the `controlled` path already writes.

## The rule-#7 disposition (settled — DOC-021 narrow ratification, 2026-06-15)

This is **depth-1, Expo-Modules-clean** — not a JSI/worklet carve-out. The discriminator is
**ownership** (`0-spine/05` Decision 5; `wip/capability-boundary-classifier.md` axis-3):
- **Allowed (this task):** fx exposes a uniform as a **UI-thread-animatable native prop**; the
  *app's own* Reanimated drives it off the JS thread. Reanimated is the **caller's transport, not
  fx's runtime**.
- **Rejected (never):** fx authoring or depending on a worklet / JSI / host-object; a
  `react-native-reanimated` dependency in `packages/`; a `createAnimatedComponent` wrapper shipped
  by fx; any custom Reanimated integration layer inside `packages/`.

## Spike first (THE risk — do before any build)

The mechanism is unproven. Prove it on a device for BOTH platforms **before** committing an
implementation:

> Can the *app's* Reanimated drive an fx-exposed uniform **prop** on the **UI thread, per frame,
> with no JS-thread work**, and have the native render loop pick it up — on both iOS and Android?

- The existing `intensity` is already a `Prop` on `FxSurfaceView` (both platforms). The spike: in
  `example/`, `Animated.createAnimatedComponent(FxSurfaceView)`, drive `intensity` from a Reanimated
  shared value (e.g. a looping `withRepeat`), and confirm: (a) the surface animates smoothly; (b) the
  prop setter runs on the UI thread per frame **without** JS-thread traffic (verify by pinning the JS
  thread with a busy loop — the animation must stay smooth); (c) the value reaches the render loop's
  uniform buffer.
- **iOS:** does a Reanimated-driven Fabric prop update reach the Expo Modules `Prop("intensity")`
  setter → `FxUniforms` on the UI thread, read by the `CADisplayLink`/`MTKView` loop?
- **Android:** does it reach the `RuntimeShader` uniform read by the `Choreographer` loop?

**Outcomes:**
- **Pass as-is** → DEF-006 is mostly *documentation + an `example/` pattern* (no `packages/` code, or
  a minimal native-animatable-prop registration if a platform needs the prop whitelisted). The
  laziest, cleanest result.
- **Partial** (e.g. the prop setter doesn't fire on the UI thread without JS, or needs explicit
  native-animated-prop registration) → DEF-006 adds the **minimal** native registration so the
  existing uniform props are UI-thread-drivable. Still depth-1, no worklet/JSI.
- **Fail** (Reanimated cannot drive an Expo-Modules Fabric prop off-thread at all) → record it; the
  path-(a) assumption is falsified and we re-decide (this is the one thing that would reopen the
  rule-#7 fork). A negative result is a valid spike outcome.

Record the spike in `notes.md` before building.

## Scope — IN / OUT

**IN:**
- The existing `controlled` scalar uniform set (`intensity`, `pressDepth`) is **UI-thread-animatable
  via its native prop**, drivable by the app's Reanimated off the JS thread — continuous delivery
  into the same uniform buffer the render loop reads (the DEF-020 buffer, the `source`-driver UI
  tier). Demonstrated on `intensity`.
- Whatever minimal `packages/` native work the spike proves necessary to make those props
  UI-thread-drivable (ideally none).
- An `example/` screen showing a Reanimated shared value driving an fx uniform smoothly under
  JS-thread load (the proof that it's off-thread).

**OUT (explicitly):**
- **No new gesture semantics** — DEF-006 is *continuous uniform delivery only*. Drag/tilt axis
  claiming is DEF-011 (which consumes this channel).
- **No fx worklet / JSI / host-object / `SharedObject`**, no `react-native-reanimated` in
  `packages/`, no fx-shipped `createAnimatedComponent` wrapper (the app does that in `example/`).
- **No `<FxMotion map={worklet}>` surface** — that is the rejected Lane 2 fx-authored-worklet shape
  (`classifier.md` § Lane 2). DEF-006 is additive over existing uniform names, not a new component.
- **No new uniforms** — DEF-011 adds its drag/tilt scalars later (to both platforms), reusing this
  channel.

## Authority links

- **Contract:** `3-motion/40` regime C + route 2 (the UI-thread channel, `40:188-190`) + Decisions
  5–7; MOT-007 (`decision-ledger.md:94`). `0-spine/05` Decision 5 (the ownership disposition).
- **Decision:** `adapt` Reanimated's UI-thread prop-update path as the *caller's* transport;
  fx exposes the animatable prop only. Flip-trigger to depth-4: an fx-authored worklet — rejected
  by default, never without a fresh `05` decision.
- **Reference (HOW):** `references/reanimated` — how a shared value reaches a native prop on the UI
  thread without per-frame JS. REJECT copying the worklet API / making fx a Reanimated competitor
  (`05:75`). Diff the actual native-prop-update path; do not just name it.
- **Mechanics (pinned at docs-closed):** `5-realization/structure.{ios,android}.md` — the UI-thread
  uniform-prop path (how a Fabric prop update reaches the uniform buffer on the UI thread), one place
  each. Nothing is pinned yet — the spike finalizes it.
- **Rules gate:** #1 (native owns the loop — the value arrives on the UI thread, not per-frame JS),
  #7 (depth-1 Expo Modules prop; no fx worklet/JSI), #8 (continuous source, not per-frame bridge),
  #2 (agnostic uniform names).

## Proof

- headless: packages `tsc`/`build`/`lint`/`swift:lint`/test; Android `compileDebugKotlin`; iOS
  `pod install` + example `xcodebuild`. (If the spike shows no `packages/` code is needed, headless
  is example tsc + the unchanged packages gates.)
- device: the spike — a Reanimated-driven `intensity` animates smoothly on both platforms **with the
  JS thread pinned** (proving off-thread delivery); the value reaches the render loop; the loop still
  pauses off-window (rule #1 unregressed).
- docs: `40` MOT-007 / the `source` UI-thread tier flipped deferred→shipped; the mechanic pinned in
  `structure.{ios,android}.md`; ledger MOT-007 `deferred`→`resolved` (only on device proof).

## Lifecycle checklist

- [x] spec'd (this file; the references-preflight is the DEF-006 authority gather + the DOC-021
      ownership ratification)
- [ ] rules-gated (#1 / #7 depth-1 / #8)
- [ ] implemented (spike first → then the minimal prop path, if any)
- [ ] commented
- [ ] headless-done
- [ ] device-verified (the off-thread spike — human's gate)
- [ ] reviewed
- [ ] docs-closed (`40` + `structure.*` + ledger MOT-007)
- [ ] merged
