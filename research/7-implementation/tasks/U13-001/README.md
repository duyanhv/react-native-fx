# U13-001 — `FxPressable`: native press feedback over a shared press FSM

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the ratified surface contract `52`/`57`; opens no new ledger row) · Unblocks: — · Blocked by: — (Unit 8 `FxPressHandler` merged)

Origin: blueprint Phase S **Unit 13**; `57 §FxPressable` + Decision 3 (its own component; **shared native base internally**); `30` (the cooperative-recognizer contract); `56` (the `feedback` bundle). Design pre-aligned with the maintainer (2026-06-20): **Option A — refactor the proven `FxPressHandler` FSM behind a host protocol and add a content-press view; do NOT duplicate the recognizer (reject Option B) and do NOT reuse the Metal `FxSurfaceView` for plain content.**

## The goal

Ship `FxPressable` — `<FxPressable feedback="native" onPress={…}><MyButton/></FxPressable>` — which wraps *your* content and runs the **platform's own press response** natively (no per-frame JS), surfacing `onPress`/`onPressIn`/`onPressOut`/`onLongPress`. It owns the press recognizer + cancellation + events for content (`57 §FxPressable`), distinct from `<Fx interactionMode>` (the touch-reactive *effect* surface, `30`/`55`).

**Why this is a native unit, not a `.tsx` (the authority-vs-as-built reconciliation):** the blueprint's `Shape: src/surface/FxPressable.tsx · Surface` describes the **public surface only** and is stale/narrow. The contract wins: `57` says `FxPressable` owns the recognizer/cancellation/events for wrapped content, and `57` Decision 3 explicitly allows a **shared native base internally**. The as-built reality forces native work: the shipped `FxPressHandler` is an **effect-surface** handler — bound to `FxSurfaceView` (Metal), it gates on `containsInteractiveShape` (a shader hit-test), writes shader uniforms, and dispatches `dispatchShader*` events. It cannot drive plain content as-is, and `FxSurfaceView` cannot host plain content without dragging the effect renderer along.

## The design (pre-aligned — Option A)

### 1. Shared press FSM with host callbacks — refactor, don't duplicate

`FxPressHandler` keeps the **proven FSM and platform arbitration** (zero-duration long-press, slop self-failure as the scroller yield, long-press timer at the platform convention, cancellation/spring-back, simultaneous recognition; Android's `disallowInterceptTouchEvent`/`ReactPointerEventsView` lever — `structure.android.md`). Extract its surface-specific coupling behind a small **host protocol/interface** the recognizer calls into:

- **hit target** — `<Fx interactionMode>`: the shader interactive shape; `FxPressable`: the full content bounds.
- **press begin / change / end / cancel** hooks.
- **long-press** hook.
- **shader uniforms + drag-tilt** — supplied **only** by the `FxSurfaceView` host (no-op for content).
- **content feedback + press events** — supplied **only** by the `FxPressableView` host.

`FxSurfaceView` becomes one host (its current behavior, unchanged externally); `FxPressableView` is the second host. One recognizer FSM, two hosts — so gesture arbitration has exactly one home and cannot drift between the effect surface and content (the load-bearing reason Option B is rejected: U8 already proved one FSM across iOS/Android, including slop yield, long-press timing, cancellation, Android disallow-intercept, and the later drag-axis work).

### 2. `FxPressableView` — a content-press native view (both platforms)

A lightweight view extending the shared native base (`FxNativeView` on both iOS and Android — **not** `FxSurfaceView`, no Metal/shader surface). It:

- mounts children into a **Fabric-invisible intermediate managed wrapper** using the **same intermediate-wrapper mechanic pattern** the existing views use — iOS the `mountChildComponentView` managed wrapper; Android an `FxPassthroughContainer` intermediate container (`FxSurfaceView.kt`'s `intermediateContainer` is the precedent pattern). Use the *pattern*, not the effect renderer: content press feedback must not depend on `FxSurfaceView` / the Metal surface.
- implements the host protocol for content: full-bounds hit target, applies feedback to the managed wrapper, dispatches the four content press events.
- inherits the base lifecycle (pause/resume, window/app-visibility) from `FxNativeView`.

### 3. `feedback="native"` — the platform-owned press response (V1)

One value, `native` (`56`; `57` open question — defaults device-pending, they ride this unit, as `transient` rode MOT-001):

- **iOS** — a native-owned **press-in scale + opacity dip** on the managed wrapper (system-button feel), springing back on release/cancel (reuse the `FxSpring` timing primitive; do not author a cross-platform-uniform curve — the law, `41`). Exact magnitudes **device-tuned at the gate**.
- **Android** — a **bounded `RippleDrawable` foreground** on the managed wrapper (the platform-native press default). Transform feedback on Android is **not** in native V1; treat it as an explicit **future `feedback` variant**, added only if device testing proves the ripple alone feels insufficient.

### 4. Events — four, with honest cancellation

Surface `onPressIn`, `onPressOut`, `onPress`, `onLongPress` (the FSM already produces all four). **Cancellation** (slop yield to a scroller, finger out of bounds, gesture cancelled) emits **`onPressOut` only** — no `onPress` — and restores the feedback (spring-back / ripple end). Do **not** invent a synthetic `onCancel` (no source doc names one).

### 5. JS surface — thin wrapper + export

`src/surface/FxPressable.tsx` — a thin component over `FxPressableView`: `feedback?: 'native'`, the four `onPress*` callbacks, `children`, `style`. Export `FxPressable` from `src/index.ts` (named in the `52 §Public exports` V1 contract). No new `fx.*` builder.

### 6. Pin the mechanics before building (one place each)

The recognizer mechanic already lives in `structure.ios.md §expo-view` (lines ~87–101: `UILongPressGestureRecognizer(minimumPressDuration = 0)`, FSM on `FxPressHandler`, slop yield, long-press timer) and `structure.android.md` (the `FxPressHandler` FSM + `ReactPointerEventsView`/`disallowInterceptTouchEvent` lever + `intermediateContainer`). **Extend those existing sections** with the host-protocol generalization and the `FxPressableView` content host + its feedback (iOS scale/opacity, Android ripple). Update `30` only if the recognizer **contract** (cooperative-recognizer principle, the host split) changes — it documents the shared recognizer that now serves both `<Fx interactionMode>` and `FxPressable`. A mechanic lives in exactly one place.

## Scope guard — explicitly NOT this task

- **No second recognizer / no RNGH dependency** (`30` Decision 5; the blueprint reject) — the FSM is refactored and shared, never duplicated.
- **No reuse of `FxSurfaceView` / the Metal surface for content** — `FxPressableView` extends `FxNativeView` and uses the intermediate-wrapper *pattern* only.
- **No Android transform feedback in native V1** — ripple is the platform default; transform feedback is a future `feedback` variant gated on device proof.
- **No new `feedback` values beyond `native`** — `56` ships one; further bundles are later units.
- **No synthetic `onCancel` event** — cancellation is `onPressOut` with no `onPress`.
- **No state/`preset`/`motion`/`effect` props** — those are `FxView` (U12); `feedback` is the only scoped prop here (`57` Decision 5).
- **No `FxView` state channel / `onFxStateChange`** — that is U12.

## Proof

```
Proof:
- headless: packages tsc + build + lint green; Swift + Kotlin compile (the FSM refactor + new view);
            iOS xcodebuild + Android :react-native-fx:compileDebugKotlin --rerun-tasks + :app:assembleDebug
            BUILD SUCCESSFUL; the existing FxPressHandler / interactionMode tests still green (the refactor
            preserves the effect-surface host behavior — no regression to <Fx interactionMode>); example tsc.
            NEW: a host-protocol unit/structural test if one is tractable headless (the FSM transitions are
            already device-proven from U8 — do not re-litigate them headless).
- device:   YES — example harness screen: <FxPressable feedback="native"> wrapping a plain button.
            iOS: press-in scale/opacity feedback shows + springs back on release; press through to the
            wrapped button fires onPressIn→onPressOut→onPress in order; long-press (~0.5s hold) fires
            onLongPress and suppresses onPress; drag-out / scroll-yield emits onPressOut only (no onPress),
            feedback restores. Android (POCO F1): RippleDrawable foreground renders on press; the same
            event matrix; press inside an ancestor ScrollView yields on slop (onPressOut only, no onPress)
            and the scroll wins. Re-confirm <Fx interactionMode> still works (no FSM regression).
            iOS sim + POCO F1; native change ⇒ REBUILD (Device Verification Guide §Launching the app).
- docs:     structure.{ios,android}.md (host-protocol generalization + FxPressableView content host + feedback);
            30 if the recognizer contract wording changes; 57 §FxPressable open question (feedback `native`
            defaults device-verified); 52/index.ts export; blueprint Unit 13 "Shape" note corrected
            (public surface only; the native unit is as-built).
```

## Authority links

```
Subtask: FxPressable — native press feedback over a shared press FSM (blueprint Phase S, Unit 13)
- Contract anchors:  57 (FxPressable owns recognizer/cancellation/events for wrapped content; Decision 3
                     shared native base internally; Decision 5 scoped props — feedback only), 30 (the
                     cooperative-recognizer contract + the interactionMode-vs-FxPressable split, lines 18-20),
                     56 (the feedback bundle; native is the V1 value, defaults device-pending), 52 (FxPressable
                     in the Public exports V1 contract).
- Decision:          fx-original — Option A (maintainer-aligned 2026-06-20): refactor FxPressHandler's FSM
                     behind a host protocol (hit target / begin-change-end-cancel / long-press / shader-only
                     uniforms / content-only feedback+events); add FxPressableView over FxNativeView using the
                     intermediate-wrapper pattern. REJECT Option B (a second recognizer — gesture arbitration
                     would drift; 30 D5), reusing FxSurfaceView/Metal for content, Android transform feedback
                     in V1, a synthetic onCancel, and any state/preset/motion props (U12).
- Reference (HOW):   the shipped FxPressHandler FSM (packages/ios/FxPressHandler.swift, .../FxPressHandler.kt)
                     — the proven arbitration to generalize, NOT to duplicate; FxSurfaceView's child-mount +
                     intermediateContainer (the wrapper pattern to mirror without the Metal surface);
                     FxNativeView (the base to extend); FxSpring (iOS feedback timing). U10/U11 surface
                     wiring (src/surface, src/index.ts) for the JS shape. REJECT re-deriving the FSM.
- Guides:            Code Style (Fx-prefixed native classes, the new view + protocol) + Code Comments (iceberg
                     only; NO internal ids — the U10/U11 dinging class); Testing (no-regression on the
                     interactionMode host + any tractable host-protocol test); Device Verification (the press
                     + feedback + cancellation matrix, both platforms, NATIVE REBUILD); Writing Style (57/56
                     status, structure-doc mechanics); Contributing (merge bar).
- Rules gate:        #1 (native owns the frame loop + feedback; JS gets semantic events only),
                     #2 (the law — platform-native press shape/feel per platform, no uniform curve),
                     #3 (expo-view: fx-managed interaction on a plain native view),
                     #5 (fx wraps your button; it ships no <Button>; feedback is the semantic layer),
                     #6 (iOS/Android peers; divergence localized to structure.{ios,android}.md),
                     #7 (Expo Modules only — a stock recognizer, no JSI), #9 (reads layout, animates a
                     managed wrapper above it; never reparents arbitrary RN children).
- Device-verify:     iOS press-in feedback + 4-event order + long-press suppression of press + scroll-yield
                     (onPressOut only); Android ripple + same matrix; <Fx interactionMode> no-regression.
- Done when:         FxPressHandler drives both hosts through the protocol with no interactionMode regression;
                     FxPressableView wraps content, feedback renders + restores, the four events fire with
                     honest cancellation; feedback="native" device-verified on iOS sim + POCO F1; FxPressable
                     exported; mechanics pinned in structure.{ios,android}.md.
```

## Lifecycle

```
[ ] spec'd        this file
[ ] rules-gated   #1/#2/#3/#5/#6/#7/#9 — one shared FSM, native feedback, managed wrapper, no RNGH
[ ] implemented   FxPressHandler host-protocol refactor (ios + android) + FxPressableView (ios + android)
                  + src/surface/FxPressable.tsx + src/index.ts export
[ ] commented     iceberg only — no internal ids; the host-split rationale, the cancellation contract
[ ] headless-done tsc/build/lint + Swift/Kotlin compile + iOS xcodebuild + Android assembleDebug + the
                  interactionMode no-regression tests + example tsc green
[ ] device-verified  feedback + 4 events + honest cancellation on iOS sim + POCO F1; interactionMode unbroken
[ ] reviewed
[ ] docs-closed   structure.{ios,android}.md mechanics; 30 contract if changed; 57/56 feedback status;
                  52/index export; blueprint Unit 13 Shape note corrected
[ ] merged
```

## Start here

1. **This file** — Option A, the shared-FSM/host-protocol architecture, the feedback semantics, the scope guard.
2. **`57 §FxPressable` + Decision 3/5** — the component contract (owns recognizer/cancellation/events; shared base allowed; feedback is the only scoped prop). **`30` lines 18–20** — the interactionMode-vs-FxPressable split.
3. **The as-built recognizer to generalize** — `packages/ios/FxPressHandler.swift` + `.../FxPressHandler.kt` (the FSM + surface coupling to extract), `FxSurfaceView.{swift,kt}` (the child-mount + `intermediateContainer` wrapper pattern), `FxNativeView` (the base).
4. **`structure.ios.md §expo-view` (~87–101) + `structure.android.md`** — where the recognizer mechanic already lives; extend it with the host split + the content host + feedback. **Pin before building.**
5. **`56`** — the `feedback` bundle (one V1 value `native`; defaults device-pending, they ride this unit).
6. **`agents/session-protocol.md` + `subtask-protocol.md`** — lifecycle, gates, closure. Device gate is a **native rebuild** (Device Verification Guide §Launching the app).
7. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments (no internal ids); `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style; `reviewed`/`merged`→Contributing.
```
