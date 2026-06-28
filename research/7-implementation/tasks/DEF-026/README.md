# DEF-026 — Android `source`/scroll realization (native scroll container, best-effort UI-thread offset→opacity/scale)

Type: `implement` · State: `todo` · Device: `yes` ·
Consumes: DEF-014 (the iOS-hosted `source` rung this reaches peer parity with) ·
Closes: FX-011 (new — Android `source`/scroll fx-owned realization) ·
Blocked by: — (V2; trigger fired by the maintainer 2026-06-28)

Origin: maintainer-picked next capability (2026-06-28), settled through a prose recommendation-pass.
Closes the `source`/scroll cross-platform peer gap recorded in
[`v2-capability-baseline.md`](../../v2-capability-baseline.md) (§Cross-platform peer gaps), **for the
fx-owned tier only**. This **is** a backend fill of a frozen public surface (`Fx.Scroll` /
`fx.source.scroll`) — no new public API. The recommendation-pass settled the two real forks (best-effort
animation vs static; plain View vs Compose) and the degradation honesty story; it is spec'd narrowly.

## Why this task exists

`source`/scroll ships iOS-only today: a hosted SwiftUI `ScrollView` whose tiles carry
`.scrollTransition` (edge fade + scale), computed in the render server with zero per-frame JS *and*
zero per-frame main-thread work — the fidelity tier that holds **only** on iOS hosted (`02` decision 14).
Android's manifest ladder is empty (`android: []` → `{via:'none'}`), and the JS surface degrades to a
static fallback (`FxScrollView.android.tsx` — a plain RN `ScrollView` of `FxHostedView` tiles that show
but do not animate with scroll).

This task realizes the Android rung honestly as the **best-effort** tier of the same `source` driver
(`02` d14: `source` guarantees zero-per-frame-JS *everywhere*, render-server fidelity *only* on iOS
hosted). A **native** Android scroll container reads its own scroll offset on the UI thread and maps it
to the `opacity`/`scale` channels the `source` node already declares, over **fx-owned** effect tiles —
zero per-frame JS, no bridge traffic on scroll, no RN content sampled or hosted. It is deliberately
lower fidelity than iOS render-server `.scrollTransition`, and the divergence is documented honestly,
not hidden (the law: agnostic names, platform-native defaults).

## The design (maintainer-aligned, 2026-06-28 recommendation-pass)

The forks were settled in prose. Pinned decisions:

- **Best-effort scroll-linked animation, NOT static tiles.** Android maps native scroll offset →
  per-tile `opacity`/`scale` on the UI thread. Static parity (the current `.android.tsx` behavior) is
  not worth a DEF cycle; the `properties:{opacity,scale}` channels are already declared for exactly this.
- **Plain `View` scroll mechanics, NO Compose.** Consistent with the V1 Android substrate (DOC-017 —
  plain `View` + draw loop) and reaffirmed by DEF-025. Introducing Compose would drag in the deferred
  library-module Compose setup — a separate, far larger decision that must not be smuggled in here.
- **A native scroll container/reader — NOT the app's RN scroll.** fx owns the scroll container and the
  tiles. This is the fx-owned tier, the exact Android peer of `Fx.Scroll`. The **ambient-RN-scroll**
  best-effort tier (a native reader over the app's *own* RN `ScrollView`/`FlatList` `contentOffset`,
  feeding a separately-mounted fx effect) stays **deferred as its own cross-platform capability** and is
  explicitly **out of scope here** — do not mix it in.
- **fx-owned tiles only; no RN content sampling or distortion** (rule #4). The tiles are fx's own
  generative content (`fill` / `material` / curated AGSL shaders), exactly as on iOS.
- **No JS offset/progress events.** No `onScroll` callback crosses the bridge; the scroll value lives
  and dies natively (rule #1).
- **Public surface unchanged.** `Fx.Scroll`, `fx.source.scroll({ axis })`, and the `tiles` data prop are
  frozen as shipped (DEF-014). The only JS change is removing the Android static fallback so Android
  resolves the new native view.
- **Degradation, honest:** Android offers best-effort UI-thread offset mapping; iOS retains render-server
  fidelity. Within Android, tiles draw per their own existing API gates — curated AGSL shaders on API 33+,
  `fill`/`material` lower; below the gate a shader tile draws transparent but the container still scrolls
  and still animates `opacity`/`scale`.

Build in this order — docs and manifest first (rule: pin the mechanic before you build it).

### 1. Pin the Android `source` mechanic in `research/5-realization/structure.android.md`

Rewrite the `### source — deferred (iOS-hosted first)` section (currently the empty-ladder deferral note)
into the realized mechanic, matching the Rung / Mechanic / Surface / Degradation shape of the sibling
`### symbol` (DEF-025) and `### content-distort` sections:

- **Rung:** `via:'native'`, `primitive:'ScrollView'`, `applyVia:'onScrollChanged'`, `clock:'none'`
  (scroll is the clock — no perpetual loop, no `cadence`), `target:'effect'`,
  `requires {os:21, substrate:'hosted'}`.
- **Mechanic:** a plain-`View` host (`FxScrollView`, an `FxNativeView`) containing a native scroll
  container — a private subclass of `android.widget.ScrollView` / `HorizontalScrollView` that overrides
  `onScrollChanged()` (a **core** view, always class-loadable — safe to subclass, unlike the DEF-025
  optional Lottie peer). The scroller holds a `LinearLayout` tile column whose children are the fx-owned
  effect tiles (`FxShaderView` / `FxFillView` / `FxMaterialView`, reusing the `FxHostedView.mountEffect`
  dispatch). On each `onScrollChanged`, an fx-authored best-effort edge transition maps each tile's
  position relative to the viewport → `view.alpha` (opacity) and `view.scaleX/scaleY` (scale), parallel
  in *semantics* to iOS's edge fade + scale but UI-thread, not render-server. Compose is **not** introduced.
- **Surface:** `Fx.Scroll` / `fx.source.scroll({ axis })` unchanged; `axis` + the `tiles` data array cross
  once per change, never per frame; no JS scroll callback.
- **Degradation:** the container always mounts and scrolls; `opacity`/`scale` mapping runs on the UI
  thread with zero per-frame JS; shader tiles draw on API 33+ (existing `FxShaderView` gate), `fill`/
  `material` lower, a below-gate shader tile draws transparent (`{via:'none'}`) while the container still
  scrolls and animates. Explicitly **lower fidelity than iOS render-server `.scrollTransition`** —
  record this divergence honestly.

Also update the cross-references that still call the Android rung deferred:
`research/0-spine/02-capability-ir-and-lowering.md` (decision 14 + the `source` node prose) and
`research/3-motion/40-motion-reactivity-and-data-flow.md` — flip "the Android rung remains deferred" to
"shipped (DEF-026, fx-owned tier)", and keep the **ambient-RN-scroll** best-effort tier deferred.

### 2. Manifest — fill the Android `source` rung (`packages/src/manifest/manifest.ts`)

In the `source` node's `lower.android` (currently `[]`), add one rung:

```ts
android: [
  {
    via: 'native',
    primitive: 'ScrollView',
    applyVia: 'onScrollChanged',
    clock: 'none',
    target: 'effect',
    requires: { os: 21, substrate: 'hosted' },
    note: "best-effort UI-thread scroll-offset reader (ScrollView.onScrollChanged) maps native scroll position to opacity/scale of fx's own hosted tiles; lower fidelity than iOS render-server .scrollTransition. Shader tiles draw on API 33+; fill/material lower.",
  },
],
```

Update the node's leading comment to drop "Android's ladder is empty → {via:'none'}" and record the
best-effort UI-thread rung (keep the ambient-RN-scroll tier noted as still deferred). No `properties`
change — `opacity`/`scale` are already declared. No other manifest node changes.

### 3. Conformance + selection tests (`packages/__tests__/manifest-*.test.ts`)

The conformance/select tests currently assert **Android → none** for `source`. Flip those:
`select(source, 'android', { deviceOS: 21+, substrate:'hosted' })` now selects the native rung;
`deviceOS < 21` (or non-hosted, or `target:'content'`) still degrades to `{via:'none'}`. Confirm
`select.ts` needs **no logic change** (DEF-014 notes recorded that the existing driver/target/os/
empty-ladder logic handled the iOS rung with no `select.ts` edit; a populated Android rung travels the
same path). If a change *is* needed, that is a signal to stop and flag, not to widen scope.

### 4. JS surface — route Android to the native view (`packages/src/runtime/`)

- **Delete `FxScrollView.android.tsx`** (the static fallback). Android then resolves the platform-default
  `FxScrollView.tsx`, which already does `requireNativeView('ReactNativeFx', 'FxScrollView')` — now
  resolving the newly-registered native Android view. `FxScrollView.web.tsx` (null) stays.
- **Update the doc comment** in `FxScrollView.tsx` ("Registered on iOS only — Android and web resolve the
  degraded static fallback") to reflect that Android now has a native rung (best-effort UI-thread offset
  mapping); web stays the null fallback.
- **No change** to `FxScroll.tsx`, `source/types.ts`, or `source/builders.ts` — the public surface and the
  `axis`/`tiles` wire are frozen. Mirror the iOS path exactly: the surface renders the native view and
  lets native degrade; it does **not** runtime-gate on `select()`.

### 5. Android native realization (`packages/android/src/main/java/expo/modules/reactnativefx/`)

- `FxScrollView.kt` (new) — `class FxScrollView : FxNativeView`. Mirrors the role `FxScrollView.swift` /
  `FxScrollRootView.swift` play on iOS. Two-phase props: `setAxis(String)` / `setTiles(List<FxScrollTile>)`
  stash; `applyResolvedConfig()` builds (or rebuilds only on tile-set change — do **not** rebuild per
  batch, which would reset each tile's shader clock, mirroring the iOS "remount resets the clock" note)
  the internal scroller + tile column. Holds:
  - a private `ScrollView`/`HorizontalScrollView` subclass overriding `onScrollChanged(l,t,oldl,oldt)` →
    `applyScrollTransition(offset)`; chosen by `axis`.
  - a child `LinearLayout` (vertical/horizontal) of tiles built from `tiles`, each tile a drawn effect
    view at the tile's `height`, intensity pushed in place via `FxEffectView.setIntensity`.
  - `applyScrollTransition(offset)` — for each tile, compute viewport-relative position and set
    `tile.alpha` + `tile.scaleX/scaleY` from the fx best-effort edge curve (identity in-viewport →
    fade+shrink toward the edges; keep the magnitudes close to iOS's `opacity 1→0` / `scale 1→0.85`,
    but this is the platform's own best-effort default, not a forced cross-platform curve).
  - `snapshot()` and `pausePresentationLoop()`/`resumePresentationLoop()` per the `FxNativeView` contract;
    fan pause/resume out to the child tiles (each `FxShaderView` already self-pauses on detach/focus —
    the scroll host adds **no** competing `Choreographer` loop; the offset reader is event-driven).
- `FxScrollTile.kt` (new, or co-located) — `data class FxScrollTile(@Field val effect: String, @Field val intensity: Double = 0.8, @Field val height: Double = 220.0) : Record`. Mirror the `FxScrollTileWire`
  JS shape and the existing `List<Record>` prop precedent (`stateMotion` → `FxStateMotionEntry`).
- Reuse, don't duplicate: the curated-id → view dispatch currently lives in `FxHostedView.mountEffect`
  (`when (effect)` over `fill` / `material` / the 10 curated shader ids). Extract it to a shared factory
  (e.g. an `internal` function/object) both `FxHostedView` and `FxScrollView` call, so the id→view mapping
  stays single-source. If extraction is noisy, a thin shared helper is preferable to a copied `when`.
- `FxModule.kt` — register `View(FxScrollView::class) { Events("onFxLoad", "onFxError"); Prop("axis") { v, value: String? -> v.setAxis(...) }; Prop("tiles") { v, value: List<FxScrollTile>? -> v.setTiles(...) }; OnViewDidUpdateProps { it.applyResolvedConfig() } }`, following the two-phase stash pattern.

### 6. iOS — none

No iOS change. The iOS rung, surface, and wire are untouched; iOS keeps render-server fidelity. (Device
re-verify confirms no regression — §8.)

### 7. example / device demo

Extend the existing `source`/scroll demo screen so it runs on Android hardware: a vertical (and a
horizontal) `Fx.Scroll` of fx-owned tiles (mix `fill` + curated shaders), visibly animating `opacity`/
`scale` with scroll; an off-window case (scroll a tile off / background the app → tile shader loops pause);
and a below-API-33 note path if a low-API device/emulator is available (shader tiles transparent, container
still scrolls + animates). Keep the iOS demo unchanged for the side-by-side fidelity comparison.

## Scope guard — explicitly NOT this task

- **NOT the ambient-RN-scroll tier** — a native reader over the app's *own* RN `ScrollView`/`FlatList`
  `contentOffset` feeding a separately-mounted fx effect. That is a net-new **cross-platform** capability
  (deferred on iOS too), with its own reader-mechanic risk (KVO/delegate/display-link on iOS;
  `OnScrollChangeListener`/nested-scroll on Android) and its own public-surface question. It stays deferred
  as its own DEF row; do not build any part of it here.
- **NOT Compose** — plain `View` scroll mechanics only (DOC-017). No library-module Compose setup.
- **NOT scroll-linking RN content** — fx-owned tiles only (rule #4: hosting RN content to sample/distort it
  severs touch). The tiles are data, never RN children.
- **NOT JS offset/progress events** — no `onScroll` callback crosses the bridge (rule #1).
- **NOT a render-server fidelity claim on Android** — the rung is honestly best-effort UI-thread; the
  divergence from iOS is documented, not papered over.
- **NOT new public API** — `Fx.Scroll` / `fx.source.scroll` / the `tiles` shape are frozen (DEF-014).
- **NOT per-tile authored uniform mapping** beyond the default `opacity`/`scale` edge transition.
- **NOT any iOS behavior change.**

## Authority links

```
Subtask: Android source/scroll realization — native scroll container, best-effort UI-thread
         offset → opacity/scale over fx-owned tiles (FX-011).
- Contract anchors:  02-capability-ir-and-lowering.md (the source node + decision 14 substrate-tiered
                     fidelity — make the Android best-effort rung real; keep ambient-RN-scroll deferred),
                     40-motion-reactivity-and-data-flow.md (flip "Android rung deferred"),
                     decision-ledger.md DEF-014 / FX-011 (new). Mechanics: structure.android.md § source
                     (this task pins the realized mechanic — §1); structure.ios.md § source unchanged.
- Decision:          recommendation-pass 2026-06-28 — fx-owned tier (NOT ambient RN scroll); best-effort
                     UI-thread offset → opacity/scale (NOT static); plain View scroll mechanics (NOT
                     Compose); native scroll container (NOT app RN scroll); no JS offset events; honest
                     lower-fidelity-than-iOS degradation. Public surface frozen (Fx.Scroll/fx.source.scroll).
- Reference (HOW):   the shipped iOS source rung end-to-end (surface/FxScroll.tsx → runtime/FxScrollView.tsx
                     → ios/FxScrollView.swift + FxScrollRootView.swift) is the role to mirror on Android.
                     FxHostedView.mountEffect (the curated id → FxShaderView/FxFillView/FxMaterialView
                     dispatch) is the tile factory to reuse. FxStateMotionEntry / Prop("stateMotion") is
                     the List<Record> prop precedent for tiles. FxLayoutObserver is the UI-thread-read
                     precedent. FxShaderView's Choreographer pause-on-detach/focus is the off-window model.
- Rules gate:        #1 scroll value stays native; axis/tiles cross once, never per frame; no JS scroll
                     callback. #2 agnostic name, platform-native default (iOS render-server scrollTransition;
                     Android best-effort UI-thread edge transition — no forced cross-platform curve). #3
                     hosted substrate (decorative fx-owned content, no fx interaction recognizer). #4 fx-owned
                     tiles only; never host/sample RN content. #6 closes a peer gap. #7 Expo Modules + Fabric,
                     plain View, no Compose/JSI.
- Surface contract (pin exactly):
                     - Fx.Scroll / fx.source.scroll({ axis }) / tiles: FxScrollTile[] — FROZEN, no change.
                     - Android resolves a native FxScrollView (delete FxScrollView.android.tsx); web stays null.
                     - Manifest source.lower.android gets one via:'native' rung, requires {os:21,
                       substrate:'hosted'}, applyVia:'onScrollChanged', clock:'none', target:'effect'.
                     - No JS offset/progress event. No iOS change.
- Scope boundaries:  NOT ambient-RN-scroll (its own cross-platform DEF, deferred). NOT Compose. NOT
                     RN-content scroll-linking. NOT JS offset events. NOT a render-server fidelity claim.
                     NOT new public API. NOT iOS behavior change.
- Device-verify:     (Android hardware + iOS regression) (1) a vertical Fx.Scroll of fx-owned tiles
                     (fill + curated shaders) animates opacity/scale with scroll on Android; horizontal axis
                     works; (2) zero bridge traffic / zero per-frame JS during scroll (no onScroll crosses);
                     (3) off-window: scrolling a tile off / backgrounding pauses its shader loop, resumes on
                     return; (4) degradation: below API 33 shader tiles transparent but container scrolls +
                     animates opacity/scale; fill/material draw; (5) iOS render-server scrollTransition
                     unregressed. Write evidence/device.md.
- Closure:           on the maintainer's PASS, the planner mints FX-011 in the ledger (Android source/scroll
                     realization, fx-owned tier; ambient-RN-scroll stays deferred), records the decision,
                     confirms structure.android.md § source + 02 d14 + 40 against the shipped mechanic,
                     reconciles the manifest row, updates v2-capability-baseline.md (source row Android →
                     native; peer-gap bullet → fx-owned tier closed, ambient-RN-scroll still deferred),
                     writes reviews/DEF-026.md, ticks through merged.
- Done when:         Fx.Scroll renders a native Android scroll container whose fx-owned tiles animate
                     opacity/scale from native scroll offset with zero per-frame JS; the manifest Android
                     rung selects on os21+/hosted and the conformance/select tests assert it; the static
                     FxScrollView.android.tsx is removed and Android resolves the native view; degradation is
                     honest (best-effort UI-thread, shader tiles API-33-gated); headless gates + iOS
                     xcodebuild + Android compileDebugKotlin green; the demo runs on Android device; iOS
                     unregressed; no comment provenance.
```

## Lifecycle

- [x] spec'd (planner, 2026-06-28)
- [x] rules-gated (review-confirmed — rules #1/#2/#3/#4/#6/#7 honored)
- [x] implemented
- [x] commented (terse iceberg, no provenance in shipped code)
- [x] headless-done (planner re-ran: `bun run test` 180/180 + `compileDebugKotlin` exit 0; lint/build/iOS xcodebuild per executor)
- [x] device-verified (maintainer-ratified, 2026-06-28 — Android API 35 PASS via agent-device: both axes animate opacity/scale at 60fps/0-dropped, off-window resume; `evidence/device.md`. Rows waived NOT-RUN: sub-API-33 degradation (no ≤32 device), iOS regression (no iOS code changed))
- [x] reviewed (planner, 2026-06-28 — `../../reviews/DEF-026.md`; index-misalignment finding caught + fixed + re-verified)
- [x] docs-closed (planner, 2026-06-28 — FX-011 minted; `structure.android.md § source` + `02` d14 + `40` + manifest + `v2-capability-baseline.md` reconciled; example `tasks.ts` DEF-014 label refreshed)
- [x] merged (maintainer-authorized, 2026-06-28 — on integration/0.1.x, this commit)

## Proof

- **headless:** packages gates (`tsc`/build/lint/`swift:lint`/`bun run test`) + iOS `pod install` +
  example `xcodebuild` + Android `compileDebugKotlin`; unit tests for the manifest Android `source` rung
  (`select()` selects on os21+/hosted, degrades below 21 / non-hosted / `target:'content'`) and the
  conformance assertion flip; the scroll-linked render + the offset→opacity/scale mapping itself is
  device-proven.
- **device:** `evidence/device.md` — the five-point scenario above on Android hardware + the iOS
  render-server re-verify.
- **docs:** FX-011 minted in the ledger; `structure.android.md § source` pins the realized mechanic;
  `02` d14 + `40` flipped from "Android deferred"; manifest row reconciled; `v2-capability-baseline.md`
  source row + peer-gap bullet updated (ambient-RN-scroll stays deferred).
</content>
</invoke>
