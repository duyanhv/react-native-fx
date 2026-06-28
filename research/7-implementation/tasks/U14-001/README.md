# U14-001 — `FxGroup` / `FxItem`: the glass morph compound

Type: `implement` · Device: `yes` · Consumes: — · Closes: — (realizes the ratified `52`/`57` surface contract + DOC-006 morph scope; opens no new ledger row) · Unblocks: — · Blocked by: — (Units 1/3 merged; U3-002 UIKit glass shipped)

Origin: blueprint Phase S **Unit 14**; `57 §FxGroup/FxItem` + Decision 4 (the one honest compound — each item a real native glass surface); `21 §Glass morphing`; DOC-006 (morph scope: glass-only, iOS 26+, system-owned merge; Android + pre-26 degrade to flat material; `spacing` deferred V2). Recommendation pass + maintainer-aligned (2026-06-21): **UIKit `UIGlassContainerEffect` direction confirmed; `FxItem` minimal JS; spike-first on iOS 26.**

## The goal

Ship `FxGroup`/`FxItem` — the surface's one honest compound, where sibling glass shapes **morph/merge** when close, system-owned, on iOS 26:

```tsx
<FxGroup>
  <FxItem><Fx effect="glass" /></FxItem>
  <FxItem><Fx effect="glass" /></FxItem>
</FxGroup>
```

Each item contributes a **real native glass surface** (the shipped UIKit `FxGlassSurfaceView`); the system merges them. Android and pre-26 iOS render the glass individually with **no morph** — the ratified shape-native divergence (DOC-006, rule #2).

## The architecture (recommendation-pass outcome, maintainer-confirmed 2026-06-21)

### iOS — UIKit `UIGlassContainerEffect`, mirroring `GlassContainer.swift`

The morph is **UIKit, not SwiftUI** — decisive local reference: `references/expo/packages/expo-glass-effect/ios/GlassContainer.swift` is an `ExpoView` owning a `UIVisualEffectView`, installs `UIGlassContainerEffect`, and routes children into `containerEffectView.contentView` via `mountChildComponentView`. This composes with the shipped UIKit `FxGlassSurfaceView` (U3-002) and reuses the proven Fabric child-mount pattern (U4) — **no SwiftUI hosting, no rule-#4 touch severing.** It also **corrects the stale `structure.ios.md §material` wording** that called the compound a "SwiftUI `GlassEffectContainer`" — the proven mechanic is the UIKit container effect.

- `FxGroupView` (currently an inert `FxNativeView` shell) becomes a `UIVisualEffectView`-backed container carrying `UIGlassContainerEffect` (guarded `@available(iOS 26)` + a runtime `NSClassFromString("UIGlassContainerEffect")` check, per the reference's beta-availability note).
- Override `mountChildComponentView`/`unmountChildComponentView` as a **symmetric pair** routing children into `containerEffectView.contentView` (the reference shape; the same discipline as U4's wrapper).
- `UIGlassContainerEffect.spacing` is the merge threshold — **V1 uses the system default; no public `spacing` prop** (DOC-006 defers it to V2).
- Below iOS 26: a plain passthrough container — items render as individual glass (the `.ultraThinMaterial` fallback already in `FxGlassSurfaceView`'s path), no morph.

### `FxItem` — minimal JS for V1 (the highest-risk fact drives this)

The open empirical question: **does the system morph require the glass surfaces to be direct children of the container effect view?** A native `FxItemView` would insert another native view between the container and the glass, making directness *worse*. So:

- **`FxItem` is minimal JS** — as close to transparent as practical, so the `<Fx effect="glass" />` child mounts as directly under `FxGroupView` as React/Fabric allows. Prefer a pure passthrough (renders its child) over a wrapping `<View>` if the passthrough carries the needed key/layout; fall back to a thin `<View>` only if layout requires it.
- **Do NOT build a native `FxItemView` in V1** unless the spike proves the system needs a real item host *and* still morphs through it. `57`'s "each FxItem is a real native morphing view" is interpreted as **"each item contributes a real native glass surface"** — the glass is the surface; `FxItem` need not be its own native view. (docs-closed tightens `57`'s wording to match.)

### Android — passthrough group, no morph

No Liquid Glass, no cross-item glass union (DOC-006). `FxGroupView` (Kotlin) is a plain passthrough container; each `FxItem`'s `<Fx effect="glass">` renders its material individually via the shipped `FxMaterialView`. No merge, no `spacing`. (Note: Android `shape-morph`/M3 `MaterialShapes` is *single-shape* morphing — unrelated to cross-item glass union; do not conflate.) Document the divergence in `structure.android.md`.

## Spike-first gate (the one real risk — run EARLY)

Before declaring the build done, device-spike on **iOS 26**:
- `<FxGroup><FxItem><Fx effect="glass" /></FxItem><FxItem><Fx effect="glass" /></FxItem></FxGroup>` with the items positioned close.
- **If it morphs/merges** → keep `FxItem` JS-only/minimal. Build complete.
- **If it does NOT morph** because the wrapper breaks directness → flatten `FxItem` further (pure passthrough), or change the V1 API shape so the glass is a direct `FxGroupView` child. Re-spike.
- **Only introduce a native `FxItemView`** if the system needs a real item host AND it still morphs through it (prove on device).

This is the load-bearing unknown; resolve it on device before polishing.

## Scope guard — explicitly NOT this task

- **No `spacing` prop** — V1 uses the system default merge threshold (DOC-006 defers `spacing` to V2).
- **No morph on Android or pre-26 iOS** — individual glass, the ratified shape-native divergence (rule #2, DOC-006). Not a gap to "fix."
- **No non-glass morph** — `fill`/`shader`/`symbol`/`filter` do not morph cross-item in V1 (`57` Decision 6).
- **No native `FxItemView` unless the spike forces it** — minimal JS first.
- **No new effect node / no new manifest work** — `material`/`glass` are shipped; this is the compound over them.
- **No SwiftUI `GlassEffectContainer`** — the proven mechanic is the UIKit `UIGlassContainerEffect` (correct the stale doc wording).

## Proof

```
Proof:
- headless: packages tsc + build + lint + tests green (add an FxGroup/FxItem structural test if tractable —
            the composition shape, not the native morph); Swift compile (FxGroupView → UIVisualEffectView +
            UIGlassContainerEffect + mountChildComponentView pair) via iOS xcodebuild after pod install;
            Android :react-native-fx:compileDebugKotlin --rerun-tasks + :app:assembleDebug BUILD SUCCESSFUL;
            example tsc. FxGroup/FxItem exported from src/index.ts (named in the 52 V1 contract).
- device:   YES — SPIKE-FIRST on iOS 26 (the morph-through-wrapper question above), THEN the matrix:
            iOS 26: two FxItems' glass visibly MORPH/MERGE when close; separate when apart; content/labels ride
                    the glass; touch reaches RN content (mountChildComponentView path, not severed).
            iOS <26: individual glass, no morph, no crash (fallback).
            Android (POCO F1): individual material glass side by side, no morph, no crash; the ratified divergence.
            iOS 26 sim/device + POCO F1; NATIVE change ⇒ REBUILD (Device Verification Guide §Launching the app).
- docs:     structure.ios.md §material — correct "SwiftUI GlassEffectContainer" → UIKit UIGlassContainerEffect
            (the proven mechanic) + the FxGroup container + child-routing; structure.android.md §material/§FxGroup —
            passthrough + no-morph divergence; 57 §FxGroup/FxItem + Decision 4 — tighten "real native morphing view"
            → "contributes a real native glass surface" (FxItem JS-only); 21 morph section confirmed; 52/index export;
            blueprint Unit 14 Shape note corrected (native container; FxItem JS).
```

## Authority links

```
Subtask: FxGroup/FxItem — the glass morph compound (blueprint Phase S, Unit 14)
- Contract anchors:  57 (§FxGroup/FxItem + Decision 4 the honest compound, Decision 6 glass-only morph), 21
                     (§Glass morphing — the one V1 compound), DOC-006 (morph scope: glass-only/iOS-26+/system-owned;
                     Android + pre-26 flat; spacing deferred V2), 52 (FxGroup/FxItem in the Public exports V1 contract).
- Decision:          recommendation-pass + maintainer-confirmed 2026-06-21 — iOS UIKit UIGlassContainerEffect
                     (mirror GlassContainer.swift), reuse FxGlassSurfaceView (U3-002) + the U4 child-mount pattern;
                     FxItem minimal JS (no native FxItemView unless the spike forces it); Android passthrough + no
                     morph; no spacing prop (V2). REJECT SwiftUI GlassEffectContainer (stale doc wording) + a native
                     FxItemView up front + any non-glass morph.
- Reference (HOW):   references/expo/packages/expo-glass-effect/ios/GlassContainer.swift (THE pattern — UIVisualEffectView
                     + UIGlassContainerEffect + mountChildComponentView into contentView; setSpacing shows the V2 knob);
                     packages/ios/FxGlassSurfaceView.swift (the shipped UIKit glass item to compose); packages/ios/
                     FxGroupView.swift + packages/android/.../FxGroupView.kt (the inert shells to build out);
                     packages/src/runtime/FxGroupView.tsx (the binding); U4 mountChildComponentView discipline
                     (structure.ios §motion child-routing — symmetric pair). REJECT re-deriving the container effect.
- Guides:            Code Style (Fx-prefixed native, the container + routing); Code Comments (iceberg — the UIKit-not-
                     SwiftUI rationale, the directness constraint; NO internal ids); Testing (composition-shape test;
                     the morph is device-proven, not headless); Device Verification (the spike + matrix, NATIVE REBUILD);
                     Writing Style (57/21/structure reconciliation); Contributing (merge bar).
- Rules gate:        #2 (the law — iOS default = system Liquid Glass morph, Android = no morph/flat material; shape-native,
                     not cross-platform-uniform), #3 (glass is hosted/self-gesturing), #4 (children mount into the
                     UIVisualEffectView contentView via the proven pattern — not hosting RN to sample/distort),
                     #5 (fx wraps glass; ships no <GlassView>; the compound is the honest exception, 57), #6 (peers;
                     divergence localized to structure.{ios,android}.md), #7 (Expo Modules child-mount, no JSI),
                     #9 (morph is a native visual effect between hosted glass; never writes Yoga/flow layout).
- Device-verify:     iOS 26 morph/merge (spike-first) + touch-through + content ride; iOS <26 individual no-crash;
                     Android individual material no-morph no-crash.
- Done when:         FxGroup renders the UIGlassContainerEffect container routing FxItem glass children; two items
                     morph on iOS 26 (device-proven); FxItem is minimal JS (or the spike's forced shape); Android +
                     pre-26 degrade to individual glass; FxGroup/FxItem exported; mechanics pinned + 57 wording tightened.
```

## Lifecycle

```
[x] spec'd        this file
[x] rules-gated   #2/#3/#4/#5/#6/#7/#9 — UIKit container morph, child-mount not hosting, shape-native divergence
[x] implemented   iOS FxGroupView → UIVisualEffectView + UIGlassContainerEffect + mountChildComponentView pair;
                  Android FxGroupView passthrough; src/surface/FxGroup.tsx + FxItem (minimal JS) + src/index.ts export
[x] commented     iceberg: UIKit-not-SwiftUI, the directness/spike rationale, the Android no-morph divergence
[x] headless-done packages tsc/build/lint/145 tests; iOS xcodebuild BUILD SUCCEEDED (after pod install 100 pods);
                  Android compileDebugKotlin --rerun-tasks + assembleDebug BUILD SUCCESSFUL; example tsc clean
[x] reviewed      planner, 2026-06-21 — ALL gates re-run independently: packages tsc/lint/145 tests/build;
                  example tsc; Android compileDebugKotlin --rerun-tasks (58 executed); iOS xcodebuild BUILD
                  SUCCEEDED. Full diff read: iOS container faithful to GlassContainer.swift (contentView
                  child-routing, @available(26)+NSClassFromString guard, passthrough below 26); FxItem is a
                  pure Fragment (zero native layer — maximally direct); Android passthrough clean; exports +
                  binding correct; evidence at canonical path (no stray repo-root tasks/). Internal-id audit:
                  packages/ clean (the U14-001 ref is an example device-task entry). No fix-round.
                  CARRIED RISK (spec-anticipated, NOT a review failure): the glass is a grandchild of contentView
                  (nested under FxHostedView), not a direct child as in the reference — whether UIGlassContainerEffect
                  merges nested glass is the spike-first device question. May bounce for an FxItem/composition change.
[x] device-verified  2026-06-22 — iOS 26 morph spike PASSED (sibling glass merges through the UIKit
                  container even nested under FxHostedView; FxItem stays JS-only) + touch-through + content
                  ride; iOS <26 individual no-crash; Android individual no-morph no-crash + touch-through.
                  GATE-FOUND ANDROID DEFECT FIXED: first-mount collapse — ExpoView/LinearLayout (and an
                  intermediate FrameLayout) re-arrange absolute children; routed into a ReactViewGroup
                  (no-op onLayout) so Fabric frames survive (fix fa95df1). evidence/device.md.
[x] docs-closed   structure.{ios,android}.md (UIKit container correction + routing + divergence) — DONE at
                  headless; 57 wording tightened ("real native morphing view" → "contributes a real native
                  glass surface") + Decision 4 + stale GlassEffectContainer→UIGlassContainerEffect; 21
                  Decision 5 + resolved note (stale name corrected + shipped); 52/index export confirmed;
                  blueprint Unit 14 note (UIKit container; FxItem JS); research/README compound row.
[x] merged        2026-06-22, integration/0.1.x (maintainer-delegated)
```

## Start here

1. **This file** — the UIKit `UIGlassContainerEffect` direction, FxItem-minimal-JS, the spike-first gate, the scope guard.
2. **`references/expo/packages/expo-glass-effect/ios/GlassContainer.swift`** — THE pattern (container effect + `mountChildComponentView` into `contentView` + `setSpacing` showing the deferred V2 knob).
3. **`57 §FxGroup/FxItem` + Decisions 4/6** + **DOC-006** (`tasks/DOC-006/`) — the contract + the ratified morph scope.
4. **The shells to build + compose** — `packages/ios/FxGroupView.swift` + `packages/android/.../FxGroupView.kt` (inert TODO shells), `packages/ios/FxGlassSurfaceView.swift` (the UIKit glass item, U3-002), `packages/src/runtime/FxGroupView.tsx` (binding).
5. **`structure.ios.md §material`** (~line 270) — the stale "SwiftUI GlassEffectContainer" wording to correct to the UIKit container; **`structure.android.md §material`** — where the no-morph divergence lands.
6. **`agents/session-protocol.md` + `subtask-protocol.md`** — lifecycle, gates, closure. Device gate is a NATIVE rebuild, and the morph is **spike-first**.
7. **Guides per gate:** `implemented`→Code Style; `commented`→Code Comments (no internal ids); `headless-done`→Testing; `device-verified`→Device Verification; `docs-closed`→Writing Style.
```
