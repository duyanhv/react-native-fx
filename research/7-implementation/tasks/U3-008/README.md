# U3-008 — persistent hosting controller + observed props; decorative-host a11y defaults

Unit 3 · type: `rework` · state: `headless-done` · device: `yes`
Consumes: — · Closes: — (critique F1 + F10, maintainer-accepted) · Blocked by: — (U3-002 merged path)

## Start here

1. **This file** — the work order.
2. **How to run a task** — `research/7-implementation/subtask-protocol.md` § Lifecycle and tracking.
3. **Per-gate guides**:
   - `implemented` → `guides/Code Style Guide.md`
   - `commented` → `guides/Code Comments Guide.md`
   - `headless-done` → `guides/Testing Guide.md`
   - `device-verified` → `guides/Device Verification Guide.md`
   - `docs-closed` → `guides/Writing Style Guide.md`
   - `reviewed` / `merged` → `guides/Contributing Guide.md`
4. **Contract + Reference** — below.

## Authority links

```
Subtask: persistent UIHostingController + observed props on iOS FxHostedView;
         decorative-host a11y defaults (critique F1 + F10)
- Contract anchors:  research/wip/critique-2026-06-10.md §F1 + §F10 (+ the §Triage rows for
                     F1/F10 — both maintainer-accepted, routed here), structure.ios.md
                     §Hosting mechanics (the mechanic home this task extends).
- Decision:          settled — iOS FxHostedView.applyResolvedConfig() → mountHost() tears down
                     and recreates the UIHostingController on every prop batch. Three precedents
                     say in-place is correct: Expo's own SwiftUIHostingView (persistent
                     controller + observed props holder), the repo's Android sibling
                     (FxHostedView.kt keeps mountedEffectId and mutates the live child), and
                     the UIKit glass path that already updates in place. The remount blocks the
                     planned eased-uniform transition channel and kills SwiftUI symbol-effect
                     state mid-animation. F10's cheap half rides along: decorative hosted
                     effect views default OUT of the accessibility tree on both platforms,
                     plus one a11y row in the Device Verification Guide's expectations.
- Reference (HOW):   references/expo/packages/expo-modules-core/ios/Core/Views/SwiftUI/
                     SwiftUIHostingView.swift — ADOPT the persistent-controller +
                     observable-props-holder idiom (one UIHostingController for the view's
                     lifetime; prop batches mutate an observed object the root view reads).
                     REJECT its safe-area machinery and the pre-16.4 runtime-subclass hack —
                     not fx's concerns.
- Guides:            Code Style + Code Comments (the code); Testing (headless); Device
                     Verification (the proof scenarios); Contributing (merge bar).
- Rules gate:        #1 (native owns the frame loop — holder mutation is per prop batch,
                     never per frame), #7 (Expo Modules two-phase props stay; no JSI),
                     #9 (fx reads layout — the cornerRadius flow into the glass surface keeps
                     reading the layer, never writing layout back).
- Device-verify:     F1 proof on symbol (indefinite animation survives an unrelated prop
                     change) and shader (intensity drag — no blank flash, no clock reset);
                     glass regression (regular/clear render, interactive press machinery
                     installs); a11y tree (decorative hidden, interactive glass reachable);
                     GPU resume. Stills only.
- Done when:         one persistent UIHostingController hosts FxHostedRootView reading
                     FxHostedProps; applyResolvedConfig() mutates the holder instead of
                     remounting; the SwiftUI↔glass mount paths stay exclusive; decorative
                     hosts are a11y-hidden on both platforms (interactive glass stays in the
                     tree); structure.ios.md pins the mechanic; the Device Verification Guide
                     carries the a11y expectation; headless gates + xcodebuild green;
                     device evidence recorded (human ratifies the gate).
```

## Lifecycle

- [x] spec'd
- [x] rules-gated
- [x] implemented
- [x] commented
- [x] headless-done
- [x] device-verified (maintainer-ratified 2026-06-11 on physical iPhone + POCO F1/API-35; evidence in `evidence/device-run-2026-06-10/` + `evidence/ratify-2026-06-11/`; residual: literal Google-TalkBack screen-reader demo needs a TalkBack-equipped device)
- [ ] reviewed
- [ ] docs-closed
- [ ] merged

## Proof

- **headless:** `bun run lint`, `bun run swift:lint`, `bun run build`, `bun run test`,
  `bunx tsc --noEmit` from `packages/`; `bunx tsc --noEmit` from `example/`; a local
  `xcodebuild` (Debug, iphonesimulator) recording BUILD SUCCEEDED in `evidence/` — the
  TS/format gates do not compile Swift.
- **device:** stills-only evidence in `evidence/device-run-<date>/` — symbol-animation
  continuity across an unrelated prop change, shader intensity drag without a blank flash
  or clock reset, glass regression, a11y tree dumps (decorative hidden / interactive glass
  reachable), GPU resume. Human gate — **ratified 2026-06-11** (`evidence/ratify-2026-06-11/`):
  iOS `variableColor`+`repeat` replace-flip and iOS+Android intensity-slider updates render
  in place with no blank/restart; Android decorative a11y-hidden confirmed via the live
  accessibility tree (effect view absent, chips + seekbar present — `FxHostedView.kt:105`).
  Residual: the literal Google-TalkBack screen-reader walk-through still needs a
  TalkBack-equipped Android device (POCO F1/MIUI has no TalkBack service installed).
- **docs:** structure.ios.md §Hosting mechanics pins the persistent-host + a11y mechanic;
  the Device Verification Guide gains the a11y expectation.

## Scope

### iOS native

- **FxHostedRootView.swift** (new) — `FxHostedProps` (`ObservableObject`; `@Published`
  effect/intensity/symbolConfig/materialConfig) and `FxHostedRootView` (the single SwiftUI
  root that observes the holder; the old `makeSwiftUIView` dispatch becomes its body).
  `FxEmptyView` moves here with its consumer.
- **FxHostedView.swift** — keeps ONE `UIHostingController<FxHostedRootView>` mounted lazily
  on first config; `applyResolvedConfig()` mutates the holder instead of remounting. The
  UIKit glass path stays exactly as is (mounted directly, in-place updates); switching
  between the SwiftUI path and the glass path still tears down the other. Two-phase pending
  props stay at the Expo boundary; the holder mutates only inside `applyResolvedConfig()`
  on the main actor. The hosting controller's view (decorative path) sets
  `accessibilityElementsHidden = true`. `cornerRadius` flow at `layoutSubviews`, teardown
  on unmount/deinit, and the `FxEmptyView` fallback are preserved.
- **FxGlassSurfaceView.swift** — `accessibilityElementsHidden` defaults `true` and is set
  only when NOT interactive; the interactive glass stays in the accessibility tree.

### Android native

- **FxHostedView.kt** — mounted effect children default
  `importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO`. Nothing else: its in-place
  update is the precedent, not the patient.

### Docs

- **structure.ios.md §Hosting mechanics** — pin the persistent-controller + observed-props
  mechanic and the a11y default (the single home).
- **guides/Device Verification Guide.md** — one expectation: every `device: yes` scenario
  answers what VoiceOver/TalkBack perceives for the effect under test.

### Tests

- None added: the slice is native hosting mechanics — no JS resolution logic, and hosted
  SwiftUI state does not run headless. The proof is the headless gates + xcodebuild + the
  device scenarios.

## Scope guard

- Does NOT touch the eased-uniform `transition` channel itself — this task unblocks it.
- Does NOT adopt SwiftUIHostingView's safe-area machinery or the pre-16.4 runtime-subclass
  hack.
- Does NOT change the Android in-place update path or the bridge prop contract.
- Does NOT design VoiceOver semantics for the interactive glass — that is an open item
  owned by the interactive-surface work (recorded in structure.ios.md, not code).
- Does NOT touch the critique doc, the ledger, or example/.
- Does NOT tick `device-verified` — the human owns the device gate.

## Done when

- One persistent `UIHostingController` survives prop batches; a running symbol effect keeps
  animating across an unrelated prop change; a shader does not flash blank or reset on an
  intensity change.
- Decorative hosted effect views are out of the accessibility tree on both platforms; the
  interactive glass stays reachable.
- structure.ios.md pins the mechanic; the guide carries the a11y expectation.
- Headless gates green; xcodebuild BUILD SUCCEEDED recorded in `evidence/`.
- Device evidence (stills only) recorded; notes and progress are updated.
