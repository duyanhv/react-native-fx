# U12-001 — `FxView`: state-driven content presentation over a new content host

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the ratified surface contract `52`/`57`; wires the `40` `onStateChange` dispatcher) · Unblocks: U12-002 (`effect` decoration on content) · Blocked by: — (Units 4/6/7 merged; U10-001 merged)

Origin: blueprint Phase S **Unit 12**; `57 §FxView` + Decision 2/5 (its own state channel; `motion` is a map of **mounted states**, not lifecycle phases; `state` is the only scoped prop); `40` (the discrete `state` target + the **`onStateChange` dispatcher, flagged unwired**; the eased-`transition` channel); `41` (the law + the `userMotion[state] ?? presetMotion[state] ?? identity` fallback); `54` (the `FxPresence` shape this mimics). Design pre-aligned with the maintainer (2026-06-20): **mimic the `FxPresence` JS shape; build over a NEW content host (`FxStateView`) that reuses the shipped `FxPressableView` child-host wrapper pattern + the `FxPresenceCoordinator` content-driver model, scoped to mounted state; ship `state`/`preset`/`motion`/`transition`; settle-only `onFxStateChange` with presence interrupt semantics; DEFER `effect` to U12-002.**

## The goal

Ship `FxView` — `<FxView preset="lift" state={selected ? 'selected' : 'idle'}><MyCard/></FxView>` — which wraps *your* content in **one managed wrapper** and eases its transform/opacity between **mounted states** natively (no per-frame JS), driven by a discrete `state` target, returning **one semantic settle event** (`onStateChange`) per transition. It owns mounted-state content motion — distinct from `FxPresence` (lifecycle enter/exit, `54`) and `FxPressable` (the press recognizer, `57`/U13).

**Why this is a native unit (the authority-vs-as-built reconciliation):** the blueprint's `Shape: src/surface/FxView.tsx + native onStateChange dispatch · Surface` is right that the native dispatcher is in scope — `40` flags `onStateChange` **unwired**, and a repo-wide search confirms **no `onStateChange`/`onFxStateChange` exists** today. `FxView` wraps plain content (like `FxPressable`), so it needs the **content host** (`FxNativeView`, no Metal) — not the `FxSurfaceView` Metal surface that `FxPresence` rides. The native work is **recombination of two shipped mechanics**, not greenfield.

## The design (pre-aligned)

### 1. Mimic the `FxPresence` JS shape — minus the retention machine

`src/surface/FxView.tsx` mirrors `FxPresence.tsx`'s prop surface and `onFx`-event mapping, but is **simpler**: every `state` is **always mounted**, so there is **no deferred-unmount / retention reducer and no stranded-exit guard** (those exist in `FxPresence` only because exit unmounts a child). `FxView` translates the discrete `state` edge → native and maps the settle event back. Props:

- `state: string` — the discrete mounted target (the only scoped prop, `57` D5); native eases to it.
- `preset?: 'lift'` — the platform-idiomatic state behavior (`56`); default `'lift'`.
- `motion?: Record<string, MotionSpec>` — explicit override, a **map keyed by mounted state** (`41`); per-key fallback `userMotion[state] ?? presetMotion[state] ?? identity`.
- `transition?: FxTransition` — timing only (`'native'` spring in V1, as `FxPresence`); surface-scoped, one timing for the step (`40` MOT-005).
- `onStateChange?: (e: { state: string; finished: boolean; interrupted: boolean }) => void` — the settle back-channel.
- `style`, `children`.

No `effect` prop (deferred — see Scope split). The public `onStateChange` maps onto the native `onFxStateChange` in this file; the `onFx` prefix never leaks past JS (the U13 / `FxSurfaceView` `onFxTransitionEnd` convention).

### 2. `FxStateView` — a new content-host native view (both platforms)

A lightweight view that **reuses two shipped patterns**, copied — not abstracted:

- **child-host wrapper** — mirror `FxPressableView`'s Fabric-invisible intermediate container over `FxNativeView` (iOS `mountChildComponentView` managed wrapper; Android the `intermediateContainer` FrameLayout). The *pattern*, no Metal surface.
- **content driver** — mirror the `FxPresenceCoordinator` eased-target model, but keyed by a discrete **mounted `state`** + the `motion` map, instead of lifecycle phase. iOS uses the `FxSpring` / unified-spring rung (the native side of the eased-`transition` channel, `40`; `structure.ios.md` ~356/385/394); Android lowers through the `motion` content path (`structure.android.md` ~412/533).
- inherits pause/resume + window/app-visibility from `FxNativeView`.

**Register `FxStateView` in BOTH the iOS module and the Android package** — the U13 round-1 lesson was a view registered in neither module is dead at runtime. Re-verify registration at review.

### 3. `lift` preset — the platform-idiomatic state behavior (V1)

One preset, `lift` (`56`; `57` open question — state-vocab `idle`/`selected` ratified DOC-005; the per-platform `MotionSpec` defaults are **device-pending and ride this unit**, as `transient` rode MOT-001 and `feedback="native"` rode U13):

- `idle` → identity; `selected` → a subtle scale + the **platform-idiomatic elevation** (the law, `41` — no cross-platform-uniform curve). Exact magnitudes **device-tuned at the gate**.

### 4. `onStateChange` — settle-only, presence interrupt semantics

Fires **once when the native ease into the new `state` settles**, payload `{ state, finished, interrupted }`. A new `state` that interrupts an in-flight transition fires the superseded one with `finished:false, interrupted:true` — **exactly** the `FxPresenceCoordinator` / `onFxTransitionEnd` semantics. **No** start event, **no** per-frame stream (rule #1/#8: semantic events only).

### 5. JS surface — thin wrapper + export

`src/surface/FxView.tsx` over `FxStateView`; export `FxView` + `FxViewProps` from `src/surface/index.ts` and `src/index.ts` (named in the `52 §Public exports` V1 contract). No new `fx.*` builder.

### 6. Pin the mechanics before building (one place each)

**Extend** the existing `structure.{ios,android}.md` content-host + content-driver sections (the `FxPressableView` host behavior block + the presence/`FxPresenceCoordinator` driver block — `structure.ios.md` ~159/356/385/394, `structure.android.md` ~211/412/533) with the **state-driven content host** + its `state`-keyed driver + the `onFxStateChange` settle/interrupt dispatch. A mechanic lives in exactly one place.

## Scope split — `effect` on `FxView` is U12-002, not this task

`57` (its example), the blueprint Unit 12 prop set, and the progress row all list `effect` on `FxView`. **This is a deliberate, explicit deferral — not a silent omission.** `effect` decoration attached to wrapped content is a **second ownership problem** distinct from state motion: z-order, clipping, hit-testing, composition position, pointer pass-through, and whether the effect is `hosted` or `expo-view` relative to the content host. It deserves its own spec + device matrix.

- **U12-001 (this task)** satisfies **state-driven content presentation** — `state`/`preset`/`motion`/`transition` + `onStateChange`.
- **U12-002** owns **`effect` decoration attached to content**.

The closure rule stays honest: U12-001 does **not** claim the `57` `effect` line; that line closes under U12-002. Record the split in `57`/blueprint/progress at the `docs-closed` gate (and add the U12-002 row).

## Scope guard — explicitly NOT this task

- **No `effect` prop / effect-over-content composition** — U12-002 (the scope split above).
- **No generic declarative-state runtime** — scope the driver to **mounted-state** transform/opacity easing on the managed wrapper; not an arbitrary state machine (maintainer caveat, 2026-06-20).
- **No extracted shared content-host base** — copy the proven `FxPressableView` wrapper pattern; abstraction waits until the state and press hosts prove their difference (maintainer, 2026-06-20).
- **No fold into `FxPressable`** — `state` is a discrete target, not a gesture (`57` D2/D3 keep them separate components).
- **No `FxSurfaceView` / Metal surface for content** — `FxStateView` extends `FxNativeView`, wrapper pattern only.
- **No per-child motion** — one managed wrapper, no per-child shapes (`33`/`05`).
- **No start event / per-frame state stream** — `onStateChange` is settle-only with interrupt semantics.
- **No new preset beyond `lift`** — further state catalogs are later units.

## References preflight (diffed 2026-06-20)

The design rests on four shipped precedents lifting cleanly. Diffed on both platforms — verdict per piece:

1. **`FxAnimationDriver.{swift,kt}` → COPY EXACTLY, reuse as-is (zero changes).** Already generic: `init(targetView:)` animates *any* view's transform/opacity toward an `FxAnimationVector`, with retarget / `snap` / off-window-pause built in. `FxSurfaceView` already constructs it pointed at its `intermediateContainer` (`FxSurfaceView.swift:142` `makeContentAnimationDriver`). `FxStateView` constructs the same driver against its own intermediate container. **No fork — this is the load-bearing reuse that makes U12 recombination, not greenfield.**

2. **`FxPressableView.{swift,kt}` → COPY the wrapper host; DROP the press half.** Copy exactly: the intermediate-container creation, the child routing (`mountChildComponentView` / the four `addView` overrides), the unmount/`removeView` guards, and on Android the `onMeasure`/`onLayout` override + `shouldUseAndroidLayout` (the LinearLayout-crash workaround — keep it verbatim). **Drop:** `FxPressHandler` + `FxPressHost` conformance, `dispatchTouchEvent`, the four `onFxPress*` dispatchers, and all press feedback (iOS `applyPressDown`/`restorePressUp`, Android `setUpRipple`/the ripple drawable). FxView has no gesture and no press feedback — its motion comes from the state driver.

3. **`FxPresenceCoordinator.{swift,kt}` → ADAPT (the one real fork).** Copy exactly the **retarget/settle/interrupt skeleton**: `update()` latches config + runs a transition table; `handleDriverCompletion()` advances the FSM and emits `finished:true` **only** for the settled target; a superseded target emits `finished:false, interrupted:true` *before* retargeting; `resolve(spec)` + the `userSpec ?? preset ?? identity` per-key fallback. **Adapt:** the FSM is binary (`absent/entering/present/exiting` over `visible:Bool`) → FxView is **N mounted states** over `state:String`. Replace the 2-phase table with a "current → target state" retarget: same-state is a no-op; a new target mid-flight emits the superseded one interrupted, then retargets; completion emits `{ state, finished:true, interrupted:false }`. **Reject:** the `ABSENT`/unmount phase, the `appear`/snap-initial-hidden + deferred-unmount handshake (no state ever unmounts — the "minus retention" guardrail). The `enterAwaitingLayout` layout-hold path is only needed if a state uses **measured travel**; `lift` is scale/opacity only, so it is likely unneeded for V1 — carry it only if a state spec resolves a measured edge.

4. **`FxPresence.tsx` → MIMIC the shape; DROP retention.** Copy: the prop surface, the `onFx*`→public remap (`handleTransitionEnd` → `onStateChange`), the `previousVisible`-ref edge translation (→ `previousState`). **Drop:** `useReducer(retentionReducer)` + `presenceMachine`, `snapshotRef`/`childrenToRender`, and the `handleHostRef` stranded-exit guard — all exist only because exit unmounts a child. FxView renders `children` directly, always.

**Two small new pieces (not copies):** (a) the wire record — presence keys `motion` by `enter`/`exit`; FxView keys it by **arbitrary state strings**, so `FxPresenceMotion`'s `{enter, exit}` record becomes a state-keyed map (JS + both native `Record`s). (b) the event — presence reuses `onFxTransitionEnd{owner:'presence'}`; FxView needs a **new `onFxStateChange`** dispatcher `{ state, finished, interrupted }` (same dispatch mechanic, new name + payload).

## Proof

```
Proof:
- headless: packages tsc + build + lint green; Swift + Kotlin compile (new FxStateView both platforms);
            iOS xcodebuild AFTER pod install (a NEW native file is not in the iOS build until pod install —
            the U13 lesson; a bare BUILD SUCCEEDED is hollow until FxStateView is referenced + compiled);
            Android :react-native-fx:compileDebugKotlin --rerun-tasks + :app:assembleDebug BUILD SUCCESSFUL;
            existing tests still green (FxPresence / FxPressable / interactionMode — no regression); example tsc.
            NEW: a tractable headless test for the state->wire mapping + the settle-event -> onStateChange
            mapping if one is reachable without a device (the easing itself is device-only — do not fake it).
- device:   YES — example harness screen: <FxView preset="lift" state={...}> wrapping a plain card with a
            toggle. iOS sim + POCO F1:
              - toggling state idle<->selected eases transform/opacity on the wrapper (native spring, NOT a JS
                animation); the lift feels platform-idiomatic (scale + elevation), magnitudes device-tuned;
              - onStateChange fires ONCE per settle with the correct settled `state`;
              - rapid re-toggle interrupts cleanly (the superseded transition reports interrupted:true, no
                visual glitch / double-fire);
              - touch passes THROUGH the wrapper to the wrapped card (hit-testing follows the transform);
              - re-confirm FxPresence + FxPressable + <Fx interactionMode> still work (no host/driver regression).
            Native change => REBUILD (Device Verification Guide §Launching the app); every cited screenshot
            must EXIST (mtime matching the gated commit).
- docs:     structure.{ios,android}.md (the state-driven content host + state-keyed driver + onFxStateChange
            dispatch — extend the existing FxPressableView host + presence-driver sections); 57 §FxView open
            question (state vocab idle/selected device-verified; lift MotionSpec defaults); 40 (onStateChange
            dispatcher now WIRED); 52/index.ts + surface/index.ts export; blueprint Unit 12 corrected (native
            as-built; effect split to U12-002) + progress; the U12-002 scope-split row created.
```

## Authority links

```
Subtask: FxView — state-driven content presentation over a new content host (blueprint Phase S, Unit 12)
- Contract anchors:  57 (FxView owns state-driven content presentation; Decision 2 preset + motion-map-of-
                     mounted-states + transition; Decision 5 scoped props — state only; motion keys are
                     dev-named mounted states, NOT lifecycle phases), 40 (the discrete state target + the
                     onStateChange dispatcher flagged UNWIRED; the eased-transition channel; MOT-005 transition
                     is surface-scoped timing), 41 (the law — platform-native shape; the userMotion[state] ??
                     presetMotion[state] ?? identity per-key fallback), 54 (the FxPresence shape to mimic),
                     04/33 (touch-safe managed wrapper; reads layout, never writes), 56 (the `lift` preset;
                     defaults device-pending), 52 (FxView in the Public exports V1 contract), DOC-005
                     (idle/selected vocab ratified).
- Decision:          fx-original — mimic the FxPresence JS shape (minus retention) + reuse the FxPressableView
                     child-host wrapper pattern + the FxPresenceCoordinator content-driver model, scoped to
                     mounted state; settle-only onFxStateChange with presence interrupt semantics. Flip-trigger:
                     none. REJECT: the `effect` prop / effect-over-content (split to U12-002); a generic
                     declarative-state runtime (mounted-state only); extracting a shared content-host base now
                     (copy the pattern; abstraction waits); folding into FxPressable; FxSurfaceView/Metal for
                     content; per-child motion; a start event or per-frame stream.
- Reference (HOW):   the SHIPPED precedents to DIFF (not just name — the U4-002 lesson): packages/ios/
                     FxPressableView.swift + .../FxPressableView.kt (the child-mount + intermediateContainer
                     wrapper over FxNativeView — mirror exactly, no Metal); FxPresenceCoordinator.swift + the
                     Android content-driver (the eased-target model + onFxTransitionEnd settle/interrupt
                     dispatch — mirror, keyed by mounted state); FxPresence.tsx (the JS shape — mimic, drop the
                     retentionReducer/stranded guard); FxSpring (iOS state timing); src/index.ts +
                     src/surface/index.ts (export wiring). REJECT re-deriving the driver or the wrapper.
- Guides:            Code Style (Fx-prefixed native classes — FxStateView) + Code Comments (iceberg only; NO
                     internal ids; match the sparse density — the repeated maintainer ding); Testing (the
                     state->wire + settle-event mapping; no-regression on presence/pressable/interactionMode);
                     Device Verification (the state-flip + settle + interrupt + touch-through matrix, both
                     platforms, NATIVE REBUILD, screenshots must exist); Writing Style (57/40/56 status,
                     structure-doc mechanics); Contributing (merge bar).
- Rules gate:        #1 (native owns the frame loop + easing; JS sends a discrete state, gets one semantic
                     settle event), #2 + the law (platform-native state shape/feel per platform; no uniform
                     curve — 41), #3 (expo-view content motion on a plain native view), #5 (fx wraps your
                     content; ships no <Card>; preset/motion is the semantic layer), #6 (iOS/Android peers;
                     divergence localized to structure.{ios,android}.md), #7 (Expo Modules only; no JSI),
                     #8 (discrete targets + native-eased transitions; semantic events only, never per-frame),
                     #9 (managed wrapper above layout; reads layout, never writes; never reparents arbitrary
                     RN children).
- Device-verify:     state flip eases transform/opacity on the wrapper (native spring) both platforms;
                     onStateChange fires settle-only with the correct state; rapid re-flip interrupts cleanly
                     (interrupted:true, no glitch); touch survives through the wrapper; lift feels platform-
                     idiomatic; no regression to presence/pressable/interactionMode. iOS sim + POCO F1.
- Done when:         FxView wraps content + eases between mounted states via the content driver, onStateChange
                     fires settle-only with interrupt semantics, NO effect prop (deferred U12-002), FxStateView
                     registered in BOTH modules, FxView exported, device-verified both platforms, mechanics
                     pinned in structure.{ios,android}.md, AND the explicit U12-002 scope-split recorded in
                     57/blueprint/progress.
```

## Lifecycle

```
[x] spec'd        this file
[x] rules-gated   #1/#2/#3/#5/#6/#7/#8/#9 — native easing on a managed wrapper, discrete state in / semantic
                  settle event out, platform-native shape, no JSI, reads-layout-never-writes
[x] implemented   FxStateView (ios + android, registered in BOTH modules) + src/surface/FxView.tsx +
                  src/surface/index.ts + src/index.ts export
[x] commented     iceberg only — no internal ids; the mounted-state-vs-lifecycle distinction, the settle/
                  interrupt contract, why no retention machine
[x] headless-done packages lint/build/tests/example tsc; iOS xcodebuild (AFTER pod install) + Android
                  compileDebugKotlin/assembleDebug green; presence/pressable/interactionMode unbroken
[ ] device-verified  state-flip easing + settle event + interrupt + touch-through, both platforms; lift feels
                  platform-idiomatic; no host/driver regression. evidence/device.md  (HUMAN gate)
                  LAW NOTE: the provisional `lift` seed (scale 1.03, translationY −3) is identical on both
                  platforms — a cross-platform-uniform start, lightly in tension with rule #2. The gate must
                  consciously tune these per-platform (does iOS call for the same magnitude as Android?), not
                  ratify the uniform seed. Update FxStateViewCoordinator.{swift,kt} if they diverge.
[ ] reviewed      independent re-run of every gate (incl. native pod install + xcodebuild + assembleDebug),
                  diff read, registration re-verified, evidence existence + mtime checked, tree state
[ ] docs-closed   structure.{ios,android}.md state host + driver + dispatch; 40 onStateChange wired; 57 §FxView
                  state vocab device-verified; 52/index export; blueprint Unit 12 corrected + U12-002 split row
[ ] merged        on integration/0.1.x  (HUMAN gate — maintainer's explicit word)
```

## Start here

1. **This file** — the mimic-presence-shape + new-content-host architecture, the settle/interrupt event semantics, the **U12-002 scope split**, the scope guard.
2. **`57 §FxView` + Decision 2/5** — the component contract (state-driven content; `motion` is a map of mounted states, not lifecycle phases; `state` is the only scoped prop). **`40`** — the discrete `state` target + the `onStateChange` dispatcher (flagged unwired) + the eased-`transition` channel. **`41`** — the law + the per-key motion fallback.
3. **The shipped precedents to DIFF** — `packages/ios/FxPressableView.swift` + `.../FxPressableView.kt` (the child-host wrapper over `FxNativeView`); `FxPresenceCoordinator.swift` + the Android content-driver (the eased-target + settle/interrupt dispatch); `src/surface/FxPresence.tsx` (the JS shape — mimic, minus retention). Diff the code, never just name the class.
4. **`structure.ios.md` (~159/356/385/394) + `structure.android.md` (~211/412/533)** — where the content-host + content-driver mechanics already live; **extend** them with the state host + state-keyed driver + the dispatch. **Pin before building.**
5. **`56`** — the `lift` preset (defaults device-pending, they ride this unit).
6. **`agents/session-protocol.md` + `subtask-protocol.md`** — lifecycle, gates, closure. Device gate is a **native rebuild** (Device Verification Guide §Launching the app).
7. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments (no internal ids); `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style; `reviewed`/`merged`→Contributing.
```
